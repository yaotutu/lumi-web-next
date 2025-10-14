/**
 * 图片生成Worker
 *
 * 职责：监听数据库中状态为IMAGE_GENERATING的任务，执行图片生成流程
 *
 * 架构原则：
 * - API层只负责状态变更
 * - Worker层监听状态变化并执行业务逻辑
 * - 解耦API请求和后台任务处理
 */

import { IMAGE_GENERATION } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";
import { createLogger, timer } from "@/lib/logger";
import { createImageProvider } from "@/lib/providers/image";
import { generateMultiStylePrompts } from "@/lib/services/prompt-optimizer";
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from "@/lib/utils/retry";

// 创建日志器
const log = createLogger("ImageWorker");

// ============================================
// 配置
// ============================================
const CONFIG = {
  POLL_INTERVAL: 2000, // Worker轮询数据库间隔（2秒）
  MAX_CONCURRENT: 3, // 最大并发图片生成任务数
  // 重试配置（使用统一的重试工具）
  RETRY_CONFIG: {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: 3, // 最大重试3次
    baseDelay: 2000, // 普通错误基础延迟2秒
    rateLimitDelay: 30000, // 限流错误延迟30秒
  },
} as const;

// ============================================
// 状态管理
// ============================================

// 当前正在处理的任务ID集合（避免重复处理）
const processingTasks = new Set<string>();

// Worker是否正在运行
let isRunning = false;

// ============================================
// 核心业务逻辑
// ============================================

/**
 * 处理单个图片生成任务
 * 职责：从调用阿里云到生成4张图片的完整流程
 */
async function processTask(taskId: string): Promise<void> {
  const t = timer();
  log.info("processTask", "开始处理图片生成任务", { taskId });

  // 防止重复处理
  if (processingTasks.has(taskId)) {
    log.warn("processTask", "任务正在处理中，跳过", { taskId });
    return;
  }

  processingTasks.add(taskId);

  try {
    // 1. 查询任务详情
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        images: { orderBy: { index: "asc" } },
      },
    });

    // 验证任务存在
    if (!task) {
      log.error("processTask", "任务不存在", null, { taskId });
      return;
    }

    // 验证任务状态（必须是IMAGE_GENERATING）
    if (task.status !== "IMAGE_GENERATING") {
      log.warn("processTask", "任务状态已变化，跳过处理", {
        taskId,
        currentStatus: task.status,
      });
      return;
    }

    log.info("processTask", "验证通过，准备生成图片", {
      taskId,
      prompt: task.prompt,
    });

    // 2. 更新任务开始时间（如果还未设置）
    if (!task.imageGenerationStartedAt) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          imageGenerationStartedAt: new Date(),
        },
      });
    }

    // 3. 使用统一的重试工具处理图片生成流程
    await retryWithBackoff(
      async () => {
        // 🔄 断点续传：查询已生成的图片
        const existingImages = await prisma.taskImage.findMany({
          where: { taskId },
          orderBy: { index: "asc" },
        });

        const startIndex = existingImages.length;

        // 检查是否已全部生成
        if (startIndex >= IMAGE_GENERATION.COUNT) {
          log.info("processTask", "图片已全部生成，无需继续", {
            taskId,
            count: IMAGE_GENERATION.COUNT,
          });
          return;
        }

        // 计算还需要生成的数量
        const remainingCount = IMAGE_GENERATION.COUNT - startIndex;
        log.info("processTask", "断点续传", {
          taskId,
          existingCount: startIndex,
          totalCount: IMAGE_GENERATION.COUNT,
          remainingCount,
        });

        // 🎯 创建图片生成 Provider（自动选择渠道）
        const imageProvider = createImageProvider();

        log.info("processTask", "图片生成渠道已选择", {
          taskId,
          provider: imageProvider.getName(),
        });

        // 🤖 生成4个不同风格的提示词
        const promptVariants = await generateMultiStylePrompts(task.prompt);

        // 从断点继续生成（每张图片使用不同的提示词）
        let index = startIndex;
        for (let i = 0; i < remainingCount; i++) {
          // 使用对应索引的提示词变体
          const currentPrompt = promptVariants[index];

          log.info(
            "processTask",
            `开始生成图片 ${index + 1}/${IMAGE_GENERATION.COUNT}`,
            {
              taskId,
              provider: imageProvider.getName(),
              promptPreview: currentPrompt.substring(0, 80) + "...",
            },
          );

          // 生成单张图片（使用该提示词）
          const generator = imageProvider.generateImageStream(currentPrompt, 1);
          const { value: imageUrl } = await generator.next();

          if (!imageUrl) {
            throw new Error(`图片 ${index + 1} 生成失败：未返回URL`);
          }

          // ⚠️ 当前实现：直接存储阿里云返回的临时URL（24小时有效期）
          // imageUrl 格式: https://dashscope-result.oss-cn-beijing.aliyuncs.com/xxx.png
          //
          // TODO: 对接OSS后，需要下载图片到本地/OSS
          // const localUrl = await downloadAndSaveImage(imageUrl, taskId, index);
          //
          // 参考实现：
          // 1. 使用 LocalStorage.saveTaskImage() 保存到本地
          // 2. 或上传到自己的OSS，返回永久URL
          // 3. 处理Base64格式的图片数据（如果API返回base64）

          await prisma.taskImage.create({
            data: {
              taskId,
              url: imageUrl, // TODO: 改为 localUrl
              index,
              prompt: currentPrompt, // 记录使用的提示词，方便调试和追踪
            },
          });

          log.info("processTask", "图片生成成功", {
            taskId,
            imageIndex: index + 1,
            totalCount: IMAGE_GENERATION.COUNT,
          });

          index++;
        }
      },
      CONFIG.RETRY_CONFIG,
      taskId,
      "图片生成",
    );

    // 4. 所有图片生成成功，更新任务状态
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "IMAGE_COMPLETED",
        imageGenerationCompletedAt: new Date(),
      },
    });

    log.info("processTask", "图片生成完成", {
      taskId,
      duration: t(),
    });
  } catch (error) {
    // 处理错误
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    log.error("processTask", "图片生成失败", error, { taskId });

    // 更新任务状态为FAILED
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: errorMsg,
      },
    });
  } finally {
    processingTasks.delete(taskId);
  }
}

// ============================================
// Worker主循环
// ============================================

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Worker主循环：持续监听IMAGE_GENERATING状态的任务
 */
async function workerLoop(): Promise<void> {
  log.info("workerLoop", "Worker启动，开始监听任务状态");

  while (isRunning) {
    try {
      // 查询所有状态为IMAGE_GENERATING且未被处理的任务
      const tasks = await prisma.task.findMany({
        where: {
          status: "IMAGE_GENERATING",
          id: {
            notIn: Array.from(processingTasks), // 排除正在处理的任务
          },
        },
        orderBy: {
          createdAt: "asc", // 优先处理更早创建的任务
        },
        take: CONFIG.MAX_CONCURRENT, // 限制并发数
      });

      // 处理每个任务（并发执行）
      if (tasks.length > 0) {
        log.info("workerLoop", "发现待处理任务", {
          count: tasks.length,
          taskIds: tasks.map((t) => t.id),
        });

        // 并发处理所有任务（受MAX_CONCURRENT限制）
        await Promise.all(tasks.map((task) => processTask(task.id)));
      }

      // 等待后继续下一轮轮询
      await sleep(CONFIG.POLL_INTERVAL);
    } catch (error) {
      log.error("workerLoop", "Worker循环出错", error);
      // 出错后等待一段时间再继续
      await sleep(5000);
    }
  }

  log.info("workerLoop", "Worker已停止");
}

// ============================================
// 导出的公共API
// ============================================

/**
 * 启动Worker
 */
export function startWorker(): void {
  if (isRunning) {
    log.warn("startWorker", "Worker已在运行中");
    return;
  }

  isRunning = true;
  workerLoop().catch((error) => {
    log.error("startWorker", "Worker崩溃", error);
    isRunning = false;
  });

  log.info("startWorker", "Worker已启动");
}

/**
 * 停止Worker
 */
export function stopWorker(): void {
  if (!isRunning) {
    log.warn("stopWorker", "Worker未在运行");
    return;
  }

  isRunning = false;
  log.info("stopWorker", "Worker停止信号已发送");
}

/**
 * 获取Worker状态
 */
export function getWorkerStatus() {
  return {
    isRunning,
    processingCount: processingTasks.size,
    processingTaskIds: Array.from(processingTasks),
  };
}
