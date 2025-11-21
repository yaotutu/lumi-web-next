/**
 * 统一错误处理模块
 * 功能：将业务错误转换为标准HTTP响应
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createLogger } from "@/lib/logger";
import { ExternalAPIError } from "@/lib/utils/retry";

// 创建日志器
const log = createLogger("ErrorHandler");

/**
 * 应用错误代码枚举
 *
 * 设计原则：
 * 1. 前端可操作的错误：有明确的错误码（如VALIDATION_ERROR, NOT_FOUND等）
 *    - 前端可以根据这些错误码显示不同的提示信息或执行特定操作
 *
 * 2. 前端不可操作的错误：统一为EXTERNAL_API_ERROR
 *    - 例如429限流：服务端通过task-queue自动重试，对前端完全透明
 *    - 前端只需要显示统一的"服务异常，请稍后重试"
 *
 * 3. HTTP状态码 vs 错误码：
 *    - HTTP状态码：给浏览器/HTTP客户端看的（如429会触发浏览器重试）
 *    - ErrorCode：给前端应用逻辑看的（用于UI展示和用户提示）
 */
export type ErrorCode =
  // 客户端错误（4xx）- 前端需要特殊处理的错误
  | "VALIDATION_ERROR" // 输入验证失败 -> 400
  | "UNAUTHORIZED" // 未认证 -> 401
  | "FORBIDDEN" // 无权访问 -> 403
  | "NOT_FOUND" // 资源不存在 -> 404
  | "INVALID_STATE" // 状态不允许操作 -> 409

  // 服务端错误（5xx）- 前端统一提示"服务异常"
  | "QUEUE_FULL" // 队列已满 -> 503
  | "DATABASE_ERROR" // 数据库错误 -> 500
  | "EXTERNAL_API_ERROR" // 外部API错误(包括429限流等) -> 500
  | "UNKNOWN_ERROR"; // 未知错误 -> 500

/**
 * 统一应用错误类
 * 携带错误代码和详细信息，便于错误处理和调试
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode, // 错误代码
    message: string, // 错误描述
    public readonly details?: unknown, // 错误详情（可选）
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * 错误代码到HTTP状态码的映射表
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_STATE: 409,
  QUEUE_FULL: 503,
  DATABASE_ERROR: 500,
  EXTERNAL_API_ERROR: 500,
  UNKNOWN_ERROR: 500,
};

/**
 * 将任意错误转换为标准HTTP响应
 * @param error 任意错误对象
 * @returns NextResponse对象，包含统一的错误格式
 */
export function toErrorResponse(error: unknown): NextResponse {
  // 情况1: ZodError - 输入验证错误（优先级最高）
  if (error instanceof ZodError) {
    log.warn("toErrorResponse", "Zod验证失败", {
      errorCount: error.issues.length,
      fields: error.issues.map((i) => i.path.join(".")),
    });

    return NextResponse.json(
      {
        success: false,
        error: "输入验证失败",
        code: "VALIDATION_ERROR",
        details: error.issues, // Zod的详细错误信息
      },
      { status: 400 },
    );
  }

  // 情况2: AppError - 应用层业务错误
  if (error instanceof AppError) {
    const status = ERROR_STATUS_MAP[error.code];

    log.error("toErrorResponse", "业务错误", error, {
      errorCode: error.code,
      statusCode: status,
      details: error.details,
    });

    // 构建响应体，条件性添加details字段
    const responseBody: {
      success: false;
      error: string;
      code: ErrorCode;
      details?: unknown;
    } = {
      success: false,
      error: error.message,
      code: error.code,
    };

    // 只有当details存在时才添加到响应中
    if (error.details !== undefined) {
      responseBody.details = error.details;
    }

    return NextResponse.json(responseBody, { status });
  }

  // 情况3: ExternalAPIError - 外部API错误（阿里云、腾讯云等）
  if (error instanceof ExternalAPIError) {
    // 429限流/并发限制处理说明：
    // - 在task-queue.ts和model3d-worker.ts中已经实现了自动重试机制
    // - 如果重试后仍失败才会到达这里
    // - 此时统一返回EXTERNAL_API_ERROR，前端显示"服务繁忙"

    log.error("toErrorResponse", `${error.provider}API错误`, error, {
      provider: error.provider,
      statusCode: error.statusCode,
      errorCode: "EXTERNAL_API_ERROR",
    });

    // 根据API状态码决定返回的HTTP状态码
    // 4xx错误返回原状态码，5xx错误统一返回500
    // 如果没有statusCode，默认返回500
    const httpStatus = error.statusCode
      ? error.statusCode >= 500
        ? 500
        : error.statusCode
      : 500;

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: "EXTERNAL_API_ERROR",
        provider: error.provider, // 标识提供商
        statusCode: error.statusCode, // 保留原始状态码用于调试
      },
      { status: httpStatus },
    );
  }

  // 情况4: 未知错误（兜底处理）
  log.error("toErrorResponse", "未知错误", error);

  return NextResponse.json(
    {
      success: false,
      error: "服务器内部错误",
      code: "UNKNOWN_ERROR",
    },
    { status: 500 },
  );
}

/**
 * 高阶函数：包装异步路由处理函数，自动捕获并处理错误
 * 使用方式: export const GET = withErrorHandler(async (req) => { ... });
 *
 * 功能：
 * - 自动捕获路由处理函数中的所有错误
 * - 自动处理ZodError（返回400+详细验证错误）
 * - 自动处理AppError（返回对应状态码+业务错误）
 * - 自动处理AliyunAPIError（返回500+外部API错误）
 * - 兜底处理未知错误（返回500+通用错误）
 *
 * @param handler 原始路由处理函数
 * @returns 包装后的处理函数，自动捕获错误并转换为HTTP响应
 */
export function withErrorHandler<
  T extends (...args: any[]) => Promise<NextResponse>,
>(handler: T): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      // 统一调用toErrorResponse处理所有类型的错误
      // toErrorResponse内部会区分ZodError、AppError、ExternalAPIError等
      return toErrorResponse(error);
    }
  }) as T;
}
