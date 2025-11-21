/**
 * 3D 模型生成 Worker（Job-Based 架构）
 *
 * 职责：
 * - 监听 ModelGenerationJob 表中的待处理任务
 * - 三层任务处理：超时检测 → 重试调度 → 新任务执行
 * - 使用 WorkerConfigManager 获取动态配置
 *
 * 架构原则：
 * - API 层创建 Model 和 ModelGenerationJob
 * - Worker 层监听 Job 状态并执行 3D 生成
 * - Job 状态独立于 Model 状态
 * - 完成后更新 GenerationRequest 状态
 */

import { prisma } from "@/lib/db/prisma";
import { createLogger, timer } from "@/lib/logger";
import type { ModelTaskStatus } from "@/lib/providers/model3d";
import { createModel3DProvider } from "@/lib/providers/model3d";
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from "@/lib/utils/retry";
import {
  downloadAndUploadModel,
  downloadAndUploadPreviewImage,
} from "@/lib/utils/image-storage";
import {
  workerConfigManager,
  QUEUE_NAMES,
  type WorkerConfig,
} from "./worker-config-manager";
import type { ModelGenerationJob } from "@prisma/client";
import { sseConnectionManager } from "@/lib/sse/connection-manager";

// 创建日志器
const log = createLogger("Model3DWorker");

// ============================================
// 配置
// ============================================

/**
 * 3D 模型导出格式配置
 */
const MODEL_FORMAT = "OBJ" as const;

const CONFIG = {
  POLL_INTERVAL: 2000, // Worker 轮询数据库间隔（2秒）
  TENCENT_POLL_INTERVAL: 5000, // 轮询腾讯云状态间隔（5秒）
  MAX_TENCENT_POLL_TIME: 600000, // 最大轮询腾讯云时间（10分钟）
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
    const timeoutJobs = await prisma.modelGenerationJob.findMany({
      where: {
        status: "RUNNING",
        timeoutAt: {
          lte: now,
        },
      },
      include: {
        model: {
          include: {
            request: true,
            sourceImage: true,
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
            modelId: job.modelId,
            retryCount: job.retryCount + 1,
            nextRetryAt,
          });

          // 更新 Job 状态为 RETRYING
          await prisma.modelGenerationJob.update({
            where: { id: job.id },
            data: {
              status: "RETRYING",
              retryCount: job.retryCount + 1,
              nextRetryAt,
              errorMessage: "任务执行超时",
              errorCode: "TIMEOUT",
            },
          });

          // 更新 Model 状态
          await prisma.model.update({
            where: { id: job.modelId },
            data: {
              errorMessage: "任务执行超时，正在重试",
            },
          });
        } else {
          // 超过最大重试次数，标记为 FAILED
          log.error("detectTimeoutJobs", "任务超时且超过最大重试次数", null, {
            jobId: job.id,
            modelId: job.modelId,
            retryCount: job.retryCount,
          });

          await prisma.modelGenerationJob.update({
            where: { id: job.id },
            data: {
              status: "FAILED",
              failedAt: now,
              errorMessage: "任务执行超时，已达最大重试次数",
              errorCode: "MAX_RETRIES_EXCEEDED",
            },
          });

          // 更新 Model 状态
          await prisma.model.update({
            where: { id: job.modelId },
            data: {
              failedAt: now,
              errorMessage: "3D 模型生成超时失败",
            },
          });

          // 更新 Request 状态
          if (job.model.requestId) {
            await prisma.generationRequest.update({
              where: { id: job.model.requestId },
              data: {
                status: "MODEL_FAILED",
              },
            });
          }
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
    const retryJobs = await prisma.modelGenerationJob.findMany({
      where: {
        status: "RETRYING",
        nextRetryAt: {
          lte: now,
        },
        id: {
          notIn: Array.from(processingJobs),
        },
      },
      include: {
        model: {
          include: {
            request: true,
            sourceImage: true,
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
 * 查询 PENDING 状态的任务，执行 3D 模型生成
 */
async function executeNewJobs(): Promise<void> {
  try {
    // 查询 PENDING 状态的任务
    const pendingJobs = await prisma.modelGenerationJob.findMany({
      where: {
        status: "PENDING",
        id: {
          notIn: Array.from(processingJobs),
        },
      },
      include: {
        model: {
          include: {
            request: true,
            sourceImage: true,
          },
        },
      },
      orderBy: workerConfig?.enablePriority
        ? [{ priority: "desc" }, { createdAt: "asc" }]
        : { createdAt: "asc" },
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
 * 处理单个 3D 模型生成 Job
 */
async function processJob(
  job: ModelGenerationJob & {
    model: {
      id: string;
      name: string;
      requestId: string | null;
      sourceImage: { id: string; imageUrl: string | null } | null;
    };
  },
): Promise<void> {
  const t = timer();
  log.info("processJob", "开始处理 3D 模型生成任务", {
    jobId: job.id,
    modelId: job.modelId,
    requestId: job.model.requestId,
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
    const timeoutDuration = workerConfig?.jobTimeout || 600000; // 默认 10 分钟
    const timeoutAt = new Date(Date.now() + timeoutDuration);

    await prisma.modelGenerationJob.update({
      where: { id: job.id },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        timeoutAt,
      },
    });

    // 更新 Request 状态为 MODEL_GENERATING
    if (job.model.requestId) {
      await prisma.generationRequest.update({
        where: { id: job.model.requestId },
        data: {
          status: "MODEL_GENERATING",
        },
      });
    }

    // 2. 验证源图片 URL 是否存在
    const sourceImageUrl = job.model.sourceImage?.imageUrl;
    if (!sourceImageUrl) {
      throw new Error(
        `源图片 URL 缺失: sourceImageId=${job.model.sourceImage?.id}`,
      );
    }

    // 3. 提交 3D 生成任务
    const model3DProvider = createModel3DProvider();
    const tencentResponse = await model3DProvider.submitModelGenerationJob({
      imageUrl: sourceImageUrl,
    });

    log.info("processJob", "3D 任务提交成功", {
      jobId: job.id,
      modelId: job.modelId,
      providerJobId: tencentResponse.jobId,
    });

    // 4. 更新 Job，保存 Provider 的 jobId
    await prisma.modelGenerationJob.update({
      where: { id: job.id },
      data: {
        providerJobId: tencentResponse.jobId,
        providerName: "tencent",
      },
    });

    // 4.1 推送 SSE 事件：模型开始生成
    if (job.model.requestId) {
      await sseConnectionManager.broadcast(
        job.model.requestId,
        "model:generating",
        {
          modelId: job.modelId,
          providerJobId: tencentResponse.jobId,
        },
      );
    }

    // 5. 轮询 3D 生成状态直到完成
    await pollModel3DStatus(
      job.id,
      job.modelId,
      tencentResponse.jobId,
      job.model.requestId,
    );

    log.info("processJob", "3D 模型生成完成", {
      jobId: job.id,
      modelId: job.modelId,
      duration: t(),
    });
  } catch (error) {
    // 处理错误
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    const errorCode = (error as any)?.code || "UNKNOWN_ERROR";

    log.error("processJob", "3D 模型生成失败", error, {
      jobId: job.id,
      modelId: job.modelId,
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
        modelId: job.modelId,
        retryCount: job.retryCount + 1,
        nextRetryAt,
      });

      // 更新 Job 状态为 RETRYING
      await prisma.modelGenerationJob.update({
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

      // 更新 Model 状态
      await prisma.model.update({
        where: { id: job.modelId },
        data: {
          errorMessage: `${errorMsg}（正在重试）`,
        },
      });
    } else {
      // 超过最大重试次数，标记为 FAILED
      log.error("processJob", "任务失败且超过最大重试次数", null, {
        jobId: job.id,
        modelId: job.modelId,
        retryCount: job.retryCount,
      });

      await prisma.modelGenerationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: errorMsg,
          errorCode,
        },
      });

      // 更新 Model 状态
      await prisma.model.update({
        where: { id: job.modelId },
        data: {
          failedAt: new Date(),
          errorMessage: errorMsg,
        },
      });

      // 更新 Request 状态
      if (job.model.requestId) {
        await prisma.generationRequest.update({
          where: { id: job.model.requestId },
          data: {
            status: "MODEL_FAILED",
          },
        });

        // 推送 SSE 事件：模型生成失败
        await sseConnectionManager.broadcast(
          job.model.requestId,
          "model:failed",
          {
            modelId: job.modelId,
            errorMessage: errorMsg,
          },
        );
      }
    }
  } finally {
    processingJobs.delete(job.id);
  }
}

/**
 * 轮询 3D 模型生成任务状态直到完成
 */
async function pollModel3DStatus(
  jobId: string,
  modelId: string,
  providerJobId: string,
  requestId: string | null,
): Promise<void> {
  const startTime = Date.now();
  let pollCount = 0;
  const model3DProvider = createModel3DProvider();

  log.info("pollModel3DStatus", "开始轮询 3D 生成状态", {
    jobId,
    modelId,
    providerJobId,
  });

  while (true) {
    pollCount++;
    const elapsed = Date.now() - startTime;

    // 检查是否超时
    if (elapsed > CONFIG.MAX_TENCENT_POLL_TIME) {
      throw new Error(
        `轮询超时：已等待 ${Math.floor(elapsed / 1000)} 秒，超过最大限制`,
      );
    }

    // 等待后查询
    await sleep(CONFIG.TENCENT_POLL_INTERVAL);

    // 查询 3D 生成状态
    const status = await model3DProvider.queryModelTaskStatus(providerJobId);

    log.info("pollModel3DStatus", "3D 生成状态查询", {
      jobId,
      modelId,
      providerJobId,
      status: status.status,
      pollCount,
      elapsedSeconds: Math.floor(elapsed / 1000),
    });

    // 计算进度
    let progress = 0;
    if (status.status === "WAIT") progress = 0;
    else if (status.status === "RUN") progress = 50;
    else if (status.status === "DONE") progress = 100;

    // 更新 Job 进度
    if (status.status === "WAIT" || status.status === "RUN") {
      await prisma.modelGenerationJob.update({
        where: { id: jobId },
        data: { progress },
      });

      // 推送 SSE 事件：模型生成进度更新
      if (requestId) {
        await sseConnectionManager.broadcast(requestId, "model:progress", {
          modelId,
          progress,
          status: status.status,
        });
      }
    }

    // 处理完成状态
    if (status.status === "DONE") {
      log.info("pollModel3DStatus", "腾讯云返回的所有文件", {
        jobId,
        modelId,
        resultFiles: status.resultFiles?.map((f) => ({
          type: f.type,
          hasUrl: !!f.url,
          hasPreview: !!f.previewImageUrl,
        })),
      });

      // 提取模型文件 URL
      const modelFile = status.resultFiles?.find(
        (file) => file.type?.toUpperCase() === MODEL_FORMAT,
      );

      if (!modelFile?.url) {
        throw new Error(`3D 生成返回的结果中没有 ${MODEL_FORMAT} 文件`);
      }

      log.info("pollModel3DStatus", "准备下载并上传模型文件", {
        jobId,
        modelId,
        format: MODEL_FORMAT,
      });

      // 下载模型并上传到存储服务
      const storageUrl = await downloadAndUploadModel(
        modelFile.url,
        modelId,
        MODEL_FORMAT.toLowerCase(),
      );

      log.info("pollModel3DStatus", "模型上传成功", {
        jobId,
        modelId,
        storageUrl,
      });

      // 下载并保存预览图（如果有）
      let previewImageStorageUrl: string | undefined;
      if (modelFile.previewImageUrl) {
        try {
          previewImageStorageUrl = await downloadAndUploadPreviewImage(
            modelFile.previewImageUrl,
            modelId,
          );

          log.info("pollModel3DStatus", "预览图上传成功", {
            jobId,
            modelId,
            previewImageStorageUrl,
          });
        } catch (error) {
          log.warn("pollModel3DStatus", "预览图下载失败", {
            jobId,
            modelId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // 更新 Job 状态为 COMPLETED
      const completedAt = new Date();
      const job = await prisma.modelGenerationJob.findUnique({
        where: { id: jobId },
      });
      const executionDuration = job?.startedAt
        ? completedAt.getTime() - job.startedAt.getTime()
        : 0;

      await prisma.modelGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          progress: 100,
          completedAt,
          executionDuration,
        },
      });

      // 更新 Model 状态
      await prisma.model.update({
        where: { id: modelId },
        data: {
          modelUrl: storageUrl,
          previewImageUrl: previewImageStorageUrl,
          format: MODEL_FORMAT,
          completedAt,
          errorMessage: null, // 清除之前的错误信息
        },
      });

      // 更新 Request 状态为 COMPLETED
      if (requestId) {
        await prisma.generationRequest.update({
          where: { id: requestId },
          data: {
            status: "COMPLETED",
            phase: "COMPLETED",
            completedAt,
          },
        });

        // 推送 SSE 事件：模型生成完成
        await sseConnectionManager.broadcast(requestId, "model:completed", {
          modelId,
          modelUrl: storageUrl,
          previewImageUrl: previewImageStorageUrl,
          format: MODEL_FORMAT,
        });
      }

      log.info("pollModel3DStatus", "模型生成完成", { jobId, modelId });
      return;
    }

    // 处理失败状态
    if (status.status === "FAIL") {
      const errorMsg = status.errorMessage || "3D 模型生成失败（返回失败状态）";

      log.error("pollModel3DStatus", "3D 生成任务失败", null, {
        jobId,
        modelId,
        errorCode: status.errorCode,
        errorMessage: errorMsg,
      });

      throw new Error(errorMsg);
    }

    // 继续轮询（WAIT 或 RUN 状态）
  }
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
      // 刷新配置
      workerConfig = await workerConfigManager.getConfig(
        QUEUE_NAMES.MODEL_GENERATION,
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
