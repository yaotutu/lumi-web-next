/**
 * 前端 API 辅助函数（JSend 格式）
 *
 * 提供统一的响应判断和错误提取工具
 */

import type { ApiResponse } from "@/types/api-response";

/**
 * 判断 API 响应是否成功
 *
 * @example
 * const response = await fetch('/api/tasks');
 * const data = await response.json();
 * if (isSuccess(data)) {
 *   console.log(data.data); // 类型安全
 * }
 */
export function isSuccess<T>(response: ApiResponse<T>): response is {
  status: "success";
  data: T;
} {
  return response.status === "success";
}

/**
 * 判断 API 响应是否失败（业务失败）
 */
export function isFail(
  response: ApiResponse<unknown>,
): response is {
  status: "fail";
  data: { message: string; code?: string; details?: unknown };
} {
  return response.status === "fail";
}

/**
 * 判断 API 响应是否错误（系统错误）
 */
export function isError(
  response: ApiResponse<unknown>,
): response is {
  status: "error";
  message: string;
  code?: string;
} {
  return response.status === "error";
}

/**
 * 从 API 响应中提取错误消息
 *
 * @example
 * const response = await fetch('/api/tasks');
 * const data = await response.json();
 * if (!isSuccess(data)) {
 *   alert(getErrorMessage(data)); // "任务不存在"
 * }
 */
export function getErrorMessage(response: ApiResponse<unknown>): string {
  if (response.status === "fail") {
    return response.data.message;
  }
  if (response.status === "error") {
    return response.message;
  }
  return "未知错误";
}

/**
 * 从 API 响应中提取错误代码
 */
export function getErrorCode(response: ApiResponse<unknown>): string | undefined {
  if (response.status === "fail") {
    return response.data.code;
  }
  if (response.status === "error") {
    return response.code;
  }
  return undefined;
}
