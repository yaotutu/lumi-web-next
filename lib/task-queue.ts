/**
 * 简化版任务处理器
 * 核心功能：
 * 1. 并发控制（最多3个任务同时运行）
 * 2. 自动重试（遇到429限流自动等待重试）
 * 3. 状态完全存储在数据库中
 */

import { AliyunAPIError, generateImageStream } from "./aliyun-image";
import { IMAGE_GENERATION } from "./constants";
import { prisma } from "./prisma";

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
  console.log(`[Task] 🚀 开始处理任务: ${taskId}`);

  // 更新数据库状态为"生成中"
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "GENERATING_IMAGES",
      imageGenerationStartedAt: new Date(),
    },
  });

  // 重试循环
  for (let retry = 0; retry <= CONFIG.MAX_RETRIES; retry++) {
    try {
      // 生成图片
      let index = 0;
      for await (const imageUrl of generateImageStream(
        prompt,
        IMAGE_GENERATION.COUNT,
      )) {
        await prisma.taskImage.create({
          data: {
            taskId,
            url: imageUrl,
            index,
          },
        });
        console.log(
          `[Task] 🖼️  图片 ${index + 1}/${IMAGE_GENERATION.COUNT} 已生成: ${taskId}`,
        );
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

      console.log(`[Task] ✅ 任务完成: ${taskId}`);
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

        console.error(`[Task] ❌ 任务失败: ${taskId} | ${errorMsg}`);
        throw error;
      }

      // 计算延迟时间
      const delay = calculateRetryDelay(error, retry);
      console.log(
        `[Task] 🔄 重试 ${retry + 1}/${CONFIG.MAX_RETRIES}: ${taskId} | 延迟 ${delay / 1000}秒`,
      );

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
      console.log(`[Task] ⛔ 不可重试的HTTP错误: ${error.statusCode}`);
      return false;
    }

    // 429, 500, 502, 503, 504 等都可重试
    console.log(`[Task] ✅ 可重试的HTTP错误: ${error.statusCode}`);
    return true;
  }

  // 非API错误，检查特殊错误消息
  const errorMsg = error instanceof Error ? error.message : String(error);
  const nonRetryableMessages = ["任务已取消", "API密钥错误", "余额不足"];

  for (const msg of nonRetryableMessages) {
    if (errorMsg.includes(msg)) {
      console.log(`[Task] ⛔ 不可重试错误: ${errorMsg}`);
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
    console.log(`[Task] 🚦 检测到429限流，使用延迟: ${delay / 1000}秒`);
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
    console.log(
      `[Task] ⏸️  达到最大并发数 (${CONFIG.MAX_CONCURRENT})，等待空闲槽位...`,
    );
    await sleep(500); // 每500ms检查一次
  }

  runningCount++;
  console.log(
    `[Task] 📥 任务加入处理队列: ${taskId} | 当前运行中: ${runningCount}/${CONFIG.MAX_CONCURRENT}`,
  );

  try {
    await processTask(taskId, prompt);
  } finally {
    runningCount--;
    console.log(
      `[Task] 📤 任务处理完成: ${taskId} | 当前运行中: ${runningCount}/${CONFIG.MAX_CONCURRENT}`,
    );
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
      console.warn(`[Task] ⚠️  任务不存在: ${taskId}`);
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
      console.log(`[Task] ❌ 任务已取消: ${taskId}`);
      return true;
    }

    console.warn(`[Task] ⚠️  任务状态不允许取消: ${taskId} (${task.status})`);
    return false;
  } catch (error) {
    console.error(`[Task] ❌ 取消任务失败: ${taskId}`, error);
    return false;
  }
}

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
