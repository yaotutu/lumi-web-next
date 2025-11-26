/**
 * 统一 API 响应构造器（JSend 规范）
 *
 * 提供标准化的响应构造函数，确保所有 API 返回格式一致
 */

import { NextResponse } from "next/server";
import type {
  ApiErrorResponse,
  ApiFailResponse,
  ApiSuccessResponse,
} from "@/types/api-response";

/**
 * 构造成功响应（JSend success）
 *
 * @param data 响应数据
 * @param init 可选的 Response 初始化参数（如 headers, status 等）
 * @returns NextResponse 对象
 *
 * @example
 * // 返回单个对象
 * return success({ id: 1, name: 'User' });
 *
 * @example
 * // 返回列表（分页数据嵌套在 data 中）
 * return success({
 *   items: [...],
 *   total: 100,
 *   page: 1,
 *   pageSize: 20
 * });
 *
 * @example
 * // 自定义状态码
 * return success({ id: 1 }, { status: 201 });
 */
export function success<T>(
  data: T,
  init?: ResponseInit,
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    status: "success",
    data,
  };

  return NextResponse.json(response, init);
}

/**
 * 构造业务失败响应（JSend fail）
 *
 * 用于客户端错误：验证失败、资源不存在、状态冲突等
 *
 * @param message 错误描述
 * @param code 可选的错误代码（如 VALIDATION_ERROR, NOT_FOUND）
 * @param details 可选的详细错误信息（如验证错误的字段）
 * @param status HTTP 状态码（默认 400）
 * @returns NextResponse 对象
 *
 * @example
 * // 验证错误
 * return fail('输入验证失败', 'VALIDATION_ERROR', zodError.issues, 400);
 *
 * @example
 * // 资源不存在
 * return fail('任务不存在', 'NOT_FOUND', undefined, 404);
 *
 * @example
 * // 状态冲突
 * return fail('任务已完成，无法重新生成', 'INVALID_STATE', undefined, 409);
 */
export function fail(
  message: string,
  code?: string,
  details?: unknown,
  status = 400,
): NextResponse<ApiFailResponse> {
  const response: ApiFailResponse = {
    status: "fail",
    data: {
      message,
      ...(code && { code }),
      ...(details !== undefined && { details }),
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * 构造系统错误响应（JSend error）
 *
 * 用于服务端错误：数据库异常、外部 API 失败等
 *
 * @param message 错误描述
 * @param code 可选的错误代码（如 DATABASE_ERROR, EXTERNAL_API_ERROR）
 * @param status HTTP 状态码（默认 500）
 * @returns NextResponse 对象
 *
 * @example
 * // 数据库错误
 * return error('数据库连接失败', 'DATABASE_ERROR');
 *
 * @example
 * // 外部 API 错误
 * return error('图片生成服务异常', 'EXTERNAL_API_ERROR');
 *
 * @example
 * // 未知错误
 * return error('服务器内部错误', 'UNKNOWN_ERROR');
 */
export function error(
  message: string,
  code?: string,
  status = 500,
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    status: "error",
    message,
    ...(code && { code }),
  };

  return NextResponse.json(response, { status });
}
