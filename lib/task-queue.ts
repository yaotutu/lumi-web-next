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
import {
  AliyunAPIError,
  generateImageStream,
} from "@/lib/providers/aliyun-image";
import { optimizePromptFor3DPrint } from "@/lib/services/prompt-optimizer";

// 创建日志器
const log = createLogger("TaskQueue");

// ============================================
// 配置
// ============================================
const CONFIG = {
  MAX_CONCURRENT: 3, // 最大并发任务数
  MAX_RETRIES: 3, // 最大重试次数
  RETRY_DELAY_BASE: 2000, // 普通错误重试延迟基数（毫秒）
  RATE_LIMIT_DELAY_BASE: 30000, // 429限流重试延迟基数（毫秒）
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

  // 重试循环
  for (let retry = 0; retry <= CONFIG.MAX_RETRIES; retry++) {
    try {
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

      // 🤖 优化提示词(3D打印适配)
      const optimizedPrompt = await optimizePromptFor3DPrint(prompt);

      // 从断点继续生成
      let index = startIndex;
      for await (const imageUrl of generateImageStream(
        optimizedPrompt,
        remainingCount,
      )) {
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
      return; // 成功，退出函数
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      // 判断是否应该重试
      const shouldRetry = canRetry(error);
      const isLastRetry = retry === CONFIG.MAX_RETRIES;

      if (!shouldRetry || isLastRetry) {
        // 不可重试或已达上限 - 标记为失败
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            errorMessage: errorMsg,
          },
        });

        log.error("processTask", "任务失败", error, { taskId });
        throw error;
      }

      // 计算延迟时间
      const delay = calculateRetryDelay(error, retry);
      log.warn("processTask", "任务失败，准备重试", {
        taskId,
        retryCount: retry + 1,
        maxRetries: CONFIG.MAX_RETRIES,
        delaySeconds: delay / 1000,
      });

      // 等待后重试
      await sleep(delay);
    }
  }
}

/**
 * 判断错误是否可以重试
 * @param error 错误对象
 * @returns 是否可以重试
 */
function canRetry(error: unknown): boolean {
  // 如果是阿里云API错误，根据状态码判断
  if (error instanceof AliyunAPIError) {
    // 不可重试的状态码
    const nonRetryableStatusCodes = [
      400, // Bad Request - 请求参数错误
      401, // Unauthorized - 认证失败
      403, // Forbidden - 权限不足或余额不足
      404, // Not Found - 资源不存在
    ];

    if (nonRetryableStatusCodes.includes(error.statusCode)) {
      log.debug("canRetry", "不可重试的HTTP错误", {
        statusCode: error.statusCode,
      });
      return false;
    }

    // 429, 500, 502, 503, 504 等都可重试
    log.debug("canRetry", "可重试的HTTP错误", { statusCode: error.statusCode });
    return true;
  }

  // 非API错误，检查特殊错误消息
  const errorMsg = error instanceof Error ? error.message : String(error);
  const nonRetryableMessages = ["任务已取消", "API密钥错误", "余额不足"];

  for (const msg of nonRetryableMessages) {
    if (errorMsg.includes(msg)) {
      log.debug("canRetry", "不可重试错误", { errorMsg });
      return false;
    }
  }

  // 默认可重试
  return true;
}

/**
 * 计算重试延迟（429使用更长延迟）
 * @param error 错误对象
 * @param retryCount 当前重试次数（从0开始）
 * @returns 延迟时间（毫秒）
 */
function calculateRetryDelay(error: unknown, retryCount: number): number {
  // 如果是429限流错误，使用更长的延迟
  if (error instanceof AliyunAPIError && error.statusCode === 429) {
    // 429限流: 30秒 → 60秒 → 120秒
    const delay = CONFIG.RATE_LIMIT_DELAY_BASE * 2 ** retryCount;
    log.warn("calculateRetryDelay", "检测到429限流", {
      delaySeconds: delay / 1000,
      statusCode: 429,
    });
    return delay;
  }

  // 普通错误: 2秒 → 4秒 → 8秒
  return CONFIG.RETRY_DELAY_BASE * 2 ** retryCount;
}

/**
 * 延迟函数
 * @param ms 延迟时间（毫秒）
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// 导出的公共API
// ============================================

/**
 * 添加任务（带并发控制）
 * @param taskId 数据库任务ID
 * @param prompt 生成提示词
 */
export async function addTask(taskId: string, prompt: string): Promise<void> {
  // 等待直到有空闲槽位
  while (runningCount >= CONFIG.MAX_CONCURRENT) {
    log.warn("addTask", "达到最大并发数，等待空闲槽位", {
      running: runningCount,
      maxConcurrent: CONFIG.MAX_CONCURRENT,
    });
    await sleep(500); // 每500ms检查一次
  }

  runningCount++;
  log.info("addTask", "任务加入处理队列", {
    taskId,
    running: runningCount,
    maxConcurrent: CONFIG.MAX_CONCURRENT,
  });

  try {
    await processTask(taskId, prompt);
  } finally {
    runningCount--;
    log.info("addTask", "任务处理完成", {
      taskId,
      running: runningCount,
      maxConcurrent: CONFIG.MAX_CONCURRENT,
    });
  }
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
