/**
 * 简化版任务处理器
 * 核心功能：
 * 1. 并发控制（最多3个任务同时运行）
 * 2. 自动重试（遇到429限流自动等待重试）
 * 3. 状态完全存储在数据库中
 */

import { IMAGE_GENERATION } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";
import { createLogger, timer } from "@/lib/logger";
import { generateImageStream } from "@/lib/providers/aliyun-image";
import { generateMultiStylePrompts } from "@/lib/services/prompt-optimizer";
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from "@/lib/utils/retry";

// 创建日志器
const log = createLogger("TaskQueue");

// ============================================
// 配置
// ============================================
const CONFIG = {
  MAX_CONCURRENT: 3, // 最大并发任务数
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

// 当前正在运行的任务数（简单计数器）
let runningCount = 0;

// ============================================
// 核心函数
// ============================================

/**
 * 处理单个任务（包含重试逻辑）
 * @param taskId 数据库任务ID
 * @param prompt 生成提示词
 */
async function processTask(taskId: string, prompt: string): Promise<void> {
  const t = timer();
  log.info("processTask", "开始处理任务", {
    taskId,
    promptLength: prompt.length,
  });

  // 更新数据库状态为"生成中"（首次执行时）
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { status: true },
  });

  if (task?.status === "PENDING") {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "GENERATING_IMAGES",
        imageGenerationStartedAt: new Date(),
      },
    });
  }

  // 使用统一的重试工具处理整个生成流程
  try {
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
          await prisma.task.update({
            where: { id: taskId },
            data: {
              status: "IMAGES_READY",
              imageGenerationCompletedAt: new Date(),
            },
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

        // 🤖 生成4个不同风格的提示词
        const promptVariants = await generateMultiStylePrompts(prompt);

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
              promptPreview: currentPrompt.substring(0, 80) + "...",
            },
          );

          // 生成单张图片（使用该提示词）
          const generator = generateImageStream(currentPrompt, 1);
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

        // 成功 - 更新数据库状态
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: "IMAGES_READY",
            imageGenerationCompletedAt: new Date(),
          },
        });

        log.info("processTask", "任务完成", { taskId, duration: t() });
      },
      CONFIG.RETRY_CONFIG,
      taskId,
      "图像生成",
    );
  } catch (error) {
    // 重试失败后，标记任务为失败
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    log.error("processTask", "任务失败", error, { taskId });

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: errorMsg,
      },
    });

    throw error;
  }
}

// ============================================
// 导出的公共API
// ============================================

/**
 * 添加任务（带并发控制）
 * 注意：此函数会立即返回，任务在后台异步执行
 * @param taskId 数据库任务ID
 * @param prompt 生成提示词
 */
export async function addTask(taskId: string, prompt: string): Promise<void> {
  // 检查是否达到最大并发数
  if (runningCount >= CONFIG.MAX_CONCURRENT) {
    log.warn("addTask", "达到最大并发数，任务将排队等待", {
      running: runningCount,
      maxConcurrent: CONFIG.MAX_CONCURRENT,
    });
    // 抛出错误，让上层处理队列已满的情况
    throw new Error("队列已满，请稍后重试");
  }

  // 立即增加计数器并启动后台任务
  runningCount++;
  log.info("addTask", "任务加入处理队列", {
    taskId,
    running: runningCount,
    maxConcurrent: CONFIG.MAX_CONCURRENT,
  });

  // 在后台异步执行任务（不等待完成）
  processTask(taskId, prompt)
    .catch((error) => {
      log.error("addTask", "后台任务执行失败", error, { taskId });
    })
    .finally(() => {
      runningCount--;
      log.info("addTask", "任务处理完成", {
        taskId,
        running: runningCount,
        maxConcurrent: CONFIG.MAX_CONCURRENT,
      });
    });

  // 立即返回，不等待任务完成
  log.info("addTask", "任务已加入后台处理队列，立即返回", { taskId });
}

/**
 * 获取队列状态
 */
export function getQueueStatus() {
  return {
    running: runningCount,
    maxConcurrent: CONFIG.MAX_CONCURRENT,
  };
}

/**
 * 取消任务（通过数据库状态标记）
 * 注意：这是一个简化实现，实际取消需要在processTask中检查状态
 * @param taskId 数据库任务ID
 */
export async function cancelTask(taskId: string): Promise<boolean> {
  try {
    // 查询任务当前状态
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });

    if (!task) {
      log.warn("cancelTask", "任务不存在", { taskId });
      return false;
    }

    // 只能取消待处理或生成中的任务
    if (task.status === "PENDING" || task.status === "GENERATING_IMAGES") {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: "任务已取消",
        },
      });
      log.info("cancelTask", "任务已取消", { taskId });
      return true;
    }

    log.warn("cancelTask", "任务状态不允许取消", {
      taskId,
      currentStatus: task.status,
    });
    return false;
  } catch (error) {
    log.error("cancelTask", "取消任务失败", error, { taskId });
    return false;
  }
}

// ============================================
// TODO: 图片下载与存储（待实现）
// ============================================

/**
 * TODO: 下载阿里云图片并保存到本地/OSS
 *
 * 使用场景：
 * 当阿里云API返回图片URL后，下载图片并保存到永久存储
 *
 * @param aliyunUrl 阿里云返回的临时URL或Base64数据
 * @param taskId 任务ID
 * @param index 图片索引 (0-3)
 * @returns 本地URL或OSS永久URL
 *
 * @example
 * // 情况A: 阿里云返回HTTP URL
 * const aliyunUrl = "https://dashscope-result.oss-cn-beijing.aliyuncs.com/xxx.png";
 * const localUrl = await downloadAndSaveImage(aliyunUrl, taskId, 0);
 * // 返回: "/generated/images/{taskId}/0.png"
 *
 * // 情况B: 阿里云返回Base64
 * const base64 = "data:image/png;base64,iVBORw0KG...";
 * const localUrl = await downloadAndSaveImage(base64, taskId, 1);
 * // 返回: "/generated/images/{taskId}/1.png"
 *
 * 实现步骤：
 * 1. 判断是URL还是Base64
 * 2. 下载/解码图片数据
 * 3. 调用 LocalStorage.saveTaskImage() 或上传到OSS
 * 4. 返回可访问的永久URL
 */
// async function downloadAndSaveImage(
//   aliyunUrl: string,
//   taskId: string,
//   index: number,
// ): Promise<string> {
//   // import { LocalStorage } from "./storage";
//
//   // 判断是Base64还是HTTP URL
//   if (aliyunUrl.startsWith("data:image")) {
//     // Base64格式
//     return await LocalStorage.saveTaskImage(taskId, index, aliyunUrl);
//   } else {
//     // HTTP URL - 下载图片
//     const response = await fetch(aliyunUrl);
//     if (!response.ok) {
//       throw new Error(`下载图片失败: ${response.status}`);
//     }
//     const buffer = Buffer.from(await response.arrayBuffer());
//     return await LocalStorage.saveTaskImage(taskId, index, buffer);
//   }
// }

// ============================================
// 兼容旧API的导出
// ============================================

/**
 * 兼容旧的taskQueue对象
 */
export const taskQueue = {
  addTask,
  getStatus: getQueueStatus,
  cancelTask,
};
