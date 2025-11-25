/**
 * 图片生成 Worker（Image-Centric 架构）
 *
 * 职责：
 * - 监听 ImageGenerationJob 表中的待处理任务
 * - 每个 Image 有独立的 Job 和 imageStatus
 * - 三层任务处理：超时检测 → 重试调度 → 新任务执行
 *
 * 架构原则：
 * - API 层创建 Request + 4个 Image + 4个 Job
 * - Worker 层独立处理每个 Image 的生成
 * - Image.imageStatus 独立管理，Request 无状态
 */

import type { ImageGenerationJob } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createLogger, timer } from "@/lib/logger";
import { createImageProvider } from "@/lib/providers/image";
import { generateMultiStylePrompts } from "@/lib/services/prompt-optimizer";
import { sseConnectionManager } from "@/lib/sse/connection-manager";
import { downloadAndUploadImage } from "@/lib/utils/image-storage";
import {
  QUEUE_NAMES,
  type WorkerConfig,
  workerConfigManager,
} from "./worker-config-manager";

// 创建日志器
const log = createLogger("ImageWorker");

// ============================================
// 配置
// ============================================
const CONFIG = {
  POLL_INTERVAL: 2000, // Worker 轮询数据库间隔（2秒）
} as const;

// ============================================
// 状态管理
// ============================================

// 当前正在处理的 Job ID 集合（避免重复处理）
const processingJobs = new Set<string>();

// Worker 是否正在运行
let isRunning = false;

// Worker 配置缓存
let workerConfig: WorkerConfig | null = null;

// ============================================
// 三层任务处理
// ============================================

/**
 * Layer 1: 超时任务检测
 * 查询 RUNNING 状态且已超时的任务，标记为 TIMEOUT
 */
async function detectTimeoutJobs(): Promise<void> {
  try {
    const now = new Date();

    // 查询已超时的 RUNNING 任务
    const timeoutJobs = await prisma.imageGenerationJob.findMany({
      where: {
        status: "RUNNING",
        timeoutAt: {
          lte: now, // 超时时间 <= 当前时间
        },
      },
      include: {
        image: {
          include: {
            request: {
              select: {
                id: true,
                prompt: true,
              },
            },
          },
        },
      },
    });

    if (timeoutJobs.length > 0) {
      log.warn("detectTimeoutJobs", "检测到超时任务", {
        count: timeoutJobs.length,
        jobIds: timeoutJobs.map((j) => j.id),
      });

      for (const job of timeoutJobs) {
        // 判断是否可以重试
        if (
          workerConfig &&
          workerConfigManager.canRetry(job.retryCount, workerConfig.maxRetries)
        ) {
          // 计算下次重试时间
          const retryDelay = workerConfigManager.calculateRetryDelay(
            job.retryCount,
            workerConfig,
          );
          const nextRetryAt = new Date(Date.now() + retryDelay);

          log.info("detectTimeoutJobs", "任务超时，安排重试", {
            jobId: job.id,
            imageId: job.imageId,
            retryCount: job.retryCount + 1,
            nextRetryAt,
          });

          // 更新 Job 状态为 RETRYING
          await prisma.imageGenerationJob.update({
            where: { id: job.id },
            data: {
              status: "RETRYING",
              retryCount: job.retryCount + 1,
              nextRetryAt,
              errorMessage: "任务执行超时",
              errorCode: "TIMEOUT",
            },
          });

          // 不需要更新 Image.imageStatus，保持 GENERATING
        } else {
          // 超过最大重试次数，标记为 FAILED
          log.error("detectTimeoutJobs", "任务超时且超过最大重试次数", null, {
            jobId: job.id,
            imageId: job.imageId,
            retryCount: job.retryCount,
          });

          await prisma.imageGenerationJob.update({
            where: { id: job.id },
            data: {
              status: "FAILED",
              failedAt: now,
              errorMessage: "任务执行超时，已达最大重试次数",
              errorCode: "MAX_RETRIES_EXCEEDED",
            },
          });

          // 更新 Image 状态为 FAILED
          await prisma.generatedImage.update({
            where: { id: job.imageId },
            data: {
              imageStatus: "FAILED",
              failedAt: now,
              errorMessage: "图片生成超时失败",
            },
          });
        }
      }
    }
  } catch (error) {
    log.error("detectTimeoutJobs", "超时检测失败", error);
  }
}

/**
 * Layer 2: 重试任务调度
 * 查询 RETRYING 状态且到达重试时间的任务，重新执行
 */
async function scheduleRetryJobs(): Promise<void> {
  try {
    const now = new Date();

    // 查询到达重试时间的 RETRYING 任务
    const retryJobs = await prisma.imageGenerationJob.findMany({
      where: {
        status: "RETRYING",
        nextRetryAt: {
          lte: now, // 重试时间 <= 当前时间
        },
        id: {
          notIn: Array.from(processingJobs), // 排除正在处理的任务
        },
      },
      include: {
        image: {
          include: {
            request: {
              select: {
                id: true,
                prompt: true,
              },
            },
          },
        },
      },
      take: workerConfig?.maxConcurrency || 1,
    });

    if (retryJobs.length > 0) {
      log.info("scheduleRetryJobs", "发现待重试任务", {
        count: retryJobs.length,
        jobIds: retryJobs.map((j) => j.id),
      });

      // 并发处理重试任务
      await Promise.all(retryJobs.map((job) => processJob(job)));
    }
  } catch (error) {
    log.error("scheduleRetryJobs", "重试调度失败", error);
  }
}

/**
 * Layer 3: 新任务执行
 * 查询 PENDING 状态的任务，执行图片生成
 */
async function executeNewJobs(): Promise<void> {
  try {
    // 查询 PENDING 状态的任务
    const pendingJobs = await prisma.imageGenerationJob.findMany({
      where: {
        status: "PENDING",
        id: {
          notIn: Array.from(processingJobs), // 排除正在处理的任务
        },
      },
      include: {
        image: {
          include: {
            request: {
              select: {
                id: true,
                prompt: true,
              },
            },
          },
        },
      },
      orderBy: workerConfig?.enablePriority
        ? [
            { priority: "desc" }, // 优先级高的优先
            { createdAt: "asc" }, // 同优先级按创建时间
          ]
        : { createdAt: "asc" }, // 不启用优先级时按创建时间
      take: workerConfig?.maxConcurrency || 1,
    });

    if (pendingJobs.length > 0) {
      log.info("executeNewJobs", "发现待处理任务", {
        count: pendingJobs.length,
        jobIds: pendingJobs.map((j) => j.id),
      });

      // 并发处理新任务
      await Promise.all(pendingJobs.map((job) => processJob(job)));
    }
  } catch (error) {
    log.error("executeNewJobs", "新任务执行失败", error);
  }
}

// ============================================
// 核心业务逻辑
// ============================================

/**
 * 处理单个图片生成 Job
 */
async function processJob(
  job: ImageGenerationJob & {
    image: {
      id: string;
      requestId: string;
      index: number;
      imageStatus: string;
      imageUrl: string | null;
      request: { id: string; prompt: string };
    };
  },
): Promise<void> {
  const t = timer();
  log.info("processJob", "开始处理图片生成任务", {
    jobId: job.id,
    imageId: job.imageId,
    requestId: job.image.requestId,
    imageIndex: job.image.index,
    retryCount: job.retryCount,
  });

  // 防止重复处理
  if (processingJobs.has(job.id)) {
    log.warn("processJob", "任务正在处理中，跳过", { jobId: job.id });
    return;
  }

  processingJobs.add(job.id);

  try {
    // 1. 更新 Job 状态为 RUNNING
    const timeoutDuration = workerConfig?.jobTimeout || 300000;
    const timeoutAt = new Date(Date.now() + timeoutDuration);

    await prisma.imageGenerationJob.update({
      where: { id: job.id },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        timeoutAt,
      },
    });

    // 2. 更新 Image 状态为 GENERATING
    await prisma.generatedImage.update({
      where: { id: job.imageId },
      data: {
        imageStatus: "GENERATING",
      },
    });

    // 2.1 更新 Request 状态为 IMAGE_GENERATING（如果还是 IMAGE_PENDING）
    await prisma.generationRequest.updateMany({
      where: {
        id: job.image.requestId,
        status: "IMAGE_PENDING",
      },
      data: {
        status: "IMAGE_GENERATING",
      },
    });

    // 2.2 推送 SSE 事件：图片开始生成
    await sseConnectionManager.broadcast(
      job.image.requestId,
      "image:generating",
      {
        imageId: job.imageId,
        index: job.image.index,
      },
    );

    // 3. 执行单张图片生成
    const imageUrl = await generateSingleImage(
      job.image.request.prompt,
      job.image.requestId,
      job.image.index,
    );

    // 4. Job 成功，更新 Job 状态为 COMPLETED
    const completedAt = new Date();
    const executionDuration =
      completedAt.getTime() - (job.startedAt?.getTime() || Date.now());

    await prisma.imageGenerationJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt,
        executionDuration,
      },
    });

    // 5. 更新 Image 状态为 COMPLETED，保存 imageUrl
    await prisma.generatedImage.update({
      where: { id: job.imageId },
      data: {
        imageStatus: "COMPLETED",
        imageUrl,
        completedAt,
      },
    });

    // 5.1 推送 SSE 事件：图片生成完成
    await sseConnectionManager.broadcast(
      job.image.requestId,
      "image:completed",
      {
        imageId: job.imageId,
        index: job.image.index,
        imageUrl,
      },
    );

    log.info("processJob", "图片生成完成", {
      jobId: job.id,
      imageId: job.imageId,
      imageIndex: job.image.index,
      duration: t(),
    });

    // 6. 检查该请求的所有图片是否都已完成
    const allImages = await prisma.generatedImage.findMany({
      where: { requestId: job.image.requestId },
      select: { imageStatus: true },
    });

    const allImagesCompleted = allImages.every(
      (img) => img.imageStatus === "COMPLETED",
    );

    if (allImagesCompleted) {
      // 所有图片都完成了，更新 Request 状态
      await prisma.generationRequest.update({
        where: { id: job.image.requestId },
        data: {
          status: "IMAGE_COMPLETED",
          phase: "AWAITING_SELECTION",
        },
      });

      log.info("processJob", "所有图片生成完成，更新请求状态", {
        requestId: job.image.requestId,
        newStatus: "IMAGE_COMPLETED",
        newPhase: "AWAITING_SELECTION",
      });

      // 推送 SSE 事件：所有图片已完成
      await sseConnectionManager.broadcast(
        job.image.requestId,
        "task:updated",
        {
          requestId: job.image.requestId,
          status: "IMAGE_COMPLETED",
          phase: "AWAITING_SELECTION",
        },
      );
    }
  } catch (error) {
    // 处理错误
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    const errorCode = (error as any)?.code || "UNKNOWN_ERROR";

    log.error("processJob", "图片生成失败", error, {
      jobId: job.id,
      imageId: job.imageId,
    });

    // 判断是否可以重试
    if (
      workerConfig &&
      workerConfigManager.canRetry(job.retryCount, workerConfig.maxRetries)
    ) {
      // 计算下次重试时间
      const retryDelay = workerConfigManager.calculateRetryDelay(
        job.retryCount,
        workerConfig,
      );
      const nextRetryAt = new Date(Date.now() + retryDelay);

      log.info("processJob", "任务失败，安排重试", {
        jobId: job.id,
        imageId: job.imageId,
        retryCount: job.retryCount + 1,
        nextRetryAt,
      });

      // 更新 Job 状态为 RETRYING
      await prisma.imageGenerationJob.update({
        where: { id: job.id },
        data: {
          status: "RETRYING",
          retryCount: job.retryCount + 1,
          nextRetryAt,
          failedAt: new Date(),
          errorMessage: errorMsg,
          errorCode,
        },
      });

      // Image 状态保持 GENERATING，不需要更新
    } else {
      // 超过最大重试次数，标记为 FAILED
      log.error("processJob", "任务失败且超过最大重试次数", null, {
        jobId: job.id,
        imageId: job.imageId,
        retryCount: job.retryCount,
      });

      await prisma.imageGenerationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: errorMsg,
          errorCode,
        },
      });

      // 更新 Image 状态为 FAILED
      await prisma.generatedImage.update({
        where: { id: job.imageId },
        data: {
          imageStatus: "FAILED",
          failedAt: new Date(),
          errorMessage: errorMsg,
        },
      });

      // 推送 SSE 事件：图片生成失败
      await sseConnectionManager.broadcast(
        job.image.requestId,
        "image:failed",
        {
          imageId: job.imageId,
          index: job.image.index,
          errorMessage: errorMsg,
        },
      );
    }
  } finally {
    processingJobs.delete(job.id);
  }
}

/**
 * 生成单张图片（新逻辑）
 *
 * @param originalPrompt - 用户原始提示词
 * @param requestId - 请求 ID
 * @param imageIndex - 图片索引（0-3）
 * @returns 存储后的图片 URL
 */
async function generateSingleImage(
  originalPrompt: string,
  requestId: string,
  imageIndex: number,
): Promise<string> {
  // 🎯 创建图片生成 Provider（自动选择渠道）
  const imageProvider = createImageProvider();

  log.info("generateSingleImage", "图片生成渠道已选择", {
    requestId,
    imageIndex,
    provider: imageProvider.getName(),
  });

  // 🤖 生成4个不同风格的提示词（只生成一次，所有图片共享）
  const promptVariants = await generateMultiStylePrompts(originalPrompt);

  // 使用对应索引的提示词变体
  const currentPrompt = promptVariants[imageIndex];

  log.info("generateSingleImage", `开始生成图片 ${imageIndex + 1}/4`, {
    requestId,
    imageIndex,
    provider: imageProvider.getName(),
    promptPreview: `${currentPrompt.substring(0, 80)}...`,
  });

  // 生成单张图片
  const generator = imageProvider.generateImageStream(currentPrompt, 1);
  const { value: remoteImageUrl } = await generator.next();

  if (!remoteImageUrl) {
    throw new Error(`图片 ${imageIndex + 1} 生成失败：未返回URL`);
  }

  log.info(
    "generateSingleImage",
    `图片 ${imageIndex + 1} 生成成功，准备下载并上传到存储服务`,
    {
      requestId,
      imageIndex,
      remoteUrlPreview: `${remoteImageUrl.substring(0, 80)}...`,
    },
  );

  // 🎯 下载图片并上传到配置的存储服务（本地/OSS/COS）
  const storageUrl = await downloadAndUploadImage(
    remoteImageUrl,
    requestId,
    imageIndex,
  );

  log.info("generateSingleImage", "图片生成并存储成功", {
    requestId,
    imageIndex: imageIndex + 1,
    storageUrl,
  });

  return storageUrl;
}

// ============================================
// Worker 主循环
// ============================================

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Worker 主循环：三层任务处理
 */
async function workerLoop(): Promise<void> {
  log.info("workerLoop", "Worker 启动，开始监听任务状态");

  while (isRunning) {
    try {
      // 刷新配置（如果需要）
      workerConfig = await workerConfigManager.getConfig(
        QUEUE_NAMES.IMAGE_GENERATION,
      );

      // 检查队列是否激活
      if (!workerConfig.isActive) {
        log.info("workerLoop", "队列已暂停，等待重新激活");
        await sleep(CONFIG.POLL_INTERVAL);
        continue;
      }

      // 三层任务处理
      await detectTimeoutJobs(); // Layer 1: 超时检测
      await scheduleRetryJobs(); // Layer 2: 重试调度
      await executeNewJobs(); // Layer 3: 新任务执行

      // 等待后继续下一轮轮询
      await sleep(CONFIG.POLL_INTERVAL);
    } catch (error) {
      log.error("workerLoop", "Worker 循环出错", error);
      // 出错后等待一段时间再继续
      await sleep(5000);
    }
  }

  log.info("workerLoop", "Worker 已停止");
}

// ============================================
// 导出的公共 API
// ============================================

/**
 * 启动 Worker
 */
export async function startWorker(): Promise<void> {
  if (isRunning) {
    log.warn("startWorker", "Worker 已在运行中");
    return;
  }

  // 初始化配置管理器
  await workerConfigManager.initialize();

  isRunning = true;
  workerLoop().catch((error) => {
    log.error("startWorker", "Worker 崩溃", error);
    isRunning = false;
  });

  log.info("startWorker", "Worker 已启动");
}

/**
 * 停止 Worker
 */
export function stopWorker(): void {
  if (!isRunning) {
    log.warn("stopWorker", "Worker 未在运行");
    return;
  }

  isRunning = false;
  log.info("stopWorker", "Worker 停止信号已发送");
}

/**
 * 获取 Worker 状态
 */
export function getWorkerStatus() {
  return {
    isRunning,
    processingCount: processingJobs.size,
    processingJobIds: Array.from(processingJobs),
    config: workerConfig,
  };
}
