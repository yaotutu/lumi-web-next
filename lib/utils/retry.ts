/**
 * 统一的重试工具
 * 职责：提供通用的错误分类和重试逻辑
 * 原则：简单实用，避免过度设计
 */

import { createLogger } from "@/lib/logger";

// 创建日志器
const log = createLogger("RetryUtil");

// ============================================
// 统一的外部API错误类
// ============================================

/**
 * 外部API错误基类
 * 用于统一阿里云、腾讯云等外部API的错误表示
 */
export class ExternalAPIError extends Error {
  constructor(
    public readonly provider: string, // 提供商名称（如 "aliyun", "tencent"）
    public readonly statusCode?: number, // HTTP状态码（可选）
    message?: string,
  ) {
    super(message || "外部API调用失败");
    this.name = "ExternalAPIError";
  }
}

// ============================================
// 重试配置
// ============================================

/**
 * 重试配置接口
 */
export interface RetryConfig {
  maxRetries: number; // 最大重试次数
  baseDelay: number; // 基础延迟（毫秒）
  rateLimitDelay: number; // 限流错误延迟（毫秒）
}

/**
 * 默认重试配置
 * 普通错误: 2秒 → 4秒 → 8秒
 * 限流错误: 30秒 → 60秒 → 120秒
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 2000, // 2秒
  rateLimitDelay: 30000, // 30秒
};

// ============================================
// 错误分类函数
// ============================================

/**
 * 判断错误是否可以重试
 * 不可重试的错误：认证失败、参数错误、余额不足等
 * 可重试的错误：网络错误、超时、限流等
 */
export function isRetryableError(error: unknown): boolean {
  // 1. 检查HTTP状态码（如果有）
  if (error instanceof ExternalAPIError && error.statusCode) {
    // 不可重试的状态码（客户端错误）
    const nonRetryableStatusCodes = [400, 401, 403, 404];
    if (nonRetryableStatusCodes.includes(error.statusCode)) {
      return false;
    }
  }

  // 2. 检查错误消息中的关键字
  const errorMsg = error instanceof Error ? error.message : String(error);

  // 明确不可重试的错误
  const nonRetryableKeywords = [
    "任务已取消",
    "用户取消",
    "API密钥",
    "认证失败",
    "余额不足",
    "权限不足",
  ];

  for (const keyword of nonRetryableKeywords) {
    if (errorMsg.includes(keyword)) {
      return false;
    }
  }

  // 默认可重试（网络错误、超时、限流等）
  return true;
}

/**
 * 判断是否是限流错误（需要更长的延迟）
 * 限流错误：429状态码或错误消息包含限流关键字
 */
export function isRateLimitError(error: unknown): boolean {
  // 1. 检查HTTP 429状态码
  if (error instanceof ExternalAPIError && error.statusCode === 429) {
    return true;
  }

  // 2. 检查错误消息中的限流关键字
  const errorMsg = error instanceof Error ? error.message : String(error);
  const rateLimitKeywords = [
    "限流",
    "限制",
    "上限",
    "并发",
    "Rate limit",
    "Too many requests",
    "ResourcesNotReady",
  ];

  return rateLimitKeywords.some((keyword) => errorMsg.includes(keyword));
}

/**
 * 计算重试延迟时间（使用指数退避）
 * @param error 错误对象
 * @param retryCount 当前重试次数（从0开始）
 * @param config 重试配置
 * @returns 延迟时间（毫秒）
 */
export function calculateRetryDelay(
  error: unknown,
  retryCount: number,
  config: RetryConfig,
): number {
  // 判断是否是限流错误
  const isRateLimit = isRateLimitError(error);
  const baseDelay = isRateLimit ? config.rateLimitDelay : config.baseDelay;

  // 指数退避: baseDelay * 2^retryCount
  const delay = baseDelay * 2 ** retryCount;

  log.debug("calculateRetryDelay", "计算重试延迟", {
    isRateLimit,
    baseDelay,
    retryCount,
    delay,
  });

  return delay;
}

// ============================================
// 通用重试函数
// ============================================

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 通用重试包装器
 * 自动处理错误分类、延迟计算、重试逻辑
 *
 * @param operation 要执行的异步操作
 * @param config 重试配置（可选）
 * @param taskId 任务ID（用于日志，可选）
 * @param operationName 操作名称（用于日志，可选）
 * @returns 操作结果
 *
 * @example
 * // 使用默认配置
 * const result = await retryWithBackoff(async () => {
 *   return await apiCall();
 * });
 *
 * @example
 * // 自定义配置和日志
 * const result = await retryWithBackoff(
 *   async () => await apiCall(),
 *   { maxRetries: 3, baseDelay: 2000, rateLimitDelay: 30000 },
 *   "task-123",
 *   "提交腾讯云任务"
 * );
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  taskId?: string,
  operationName = "操作",
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      log.info(
        "retryWithBackoff",
        `尝试${operationName} (第${attempt + 1}次)`,
        {
          taskId,
          attempt: attempt + 1,
          maxRetries: config.maxRetries + 1,
        },
      );

      // 执行操作
      const result = await operation();

      log.info("retryWithBackoff", `${operationName}成功`, {
        taskId,
        attempt: attempt + 1,
      });

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否可以重试
      const canRetry = isRetryableError(error);
      const isLastAttempt = attempt === config.maxRetries;

      // 不可重试的错误，直接抛出
      if (!canRetry) {
        log.error(
          "retryWithBackoff",
          `${operationName}遇到不可重试的错误`,
          error,
          { taskId, attempt: attempt + 1 },
        );
        throw error;
      }

      // 已达到最大重试次数
      if (isLastAttempt) {
        log.error(
          "retryWithBackoff",
          `${operationName}已达到最大重试次数`,
          error,
          { taskId, totalAttempts: attempt + 1 },
        );
        throw new Error(
          `${operationName}失败（已重试${attempt + 1}次）: ${lastError.message}`,
        );
      }

      // 计算延迟时间
      const delay = calculateRetryDelay(error, attempt, config);
      const isRateLimit = isRateLimitError(error);

      log.warn("retryWithBackoff", `${operationName}失败，准备重试`, {
        taskId,
        attempt: attempt + 1,
        nextAttempt: attempt + 2,
        delaySeconds: delay / 1000,
        isRateLimitError: isRateLimit,
        errorMsg: lastError.message,
      });

      // 等待后重试
      await sleep(delay);
    }
  }

  // 理论上不会到这里，但为了类型安全
  throw lastError || new Error("未知错误");
}
