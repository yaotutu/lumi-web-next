/**
 * API 响应类型定义（JSend 规范）
 *
 * 统一前后端的数据交互格式，确保类型安全
 *
 * 规范说明：
 * - success: { status: 'success', data: T }
 * - fail: { status: 'fail', data: { message, code?, details? } }  // 业务失败（验证错误、资源不存在等）
 * - error: { status: 'error', message: string, code?: string }    // 系统错误（服务器异常、外部API错误等）
 */

/**
 * API 成功响应（JSend success）
 *
 * @template T 响应数据类型
 */
export interface ApiSuccessResponse<T = unknown> {
  /** 响应状态 */
  status: "success";
  /** 响应数据 */
  data: T;
}

/**
 * API 业务失败响应（JSend fail）
 * 用于客户端错误：验证失败、资源不存在、状态冲突等
 */
export interface ApiFailResponse {
  /** 响应状态 */
  status: "fail";
  /** 失败详情 */
  data: {
    /** 错误描述 */
    message: string;
    /** 错误代码（如 VALIDATION_ERROR, NOT_FOUND） */
    code?: string;
    /** 详细错误信息（如验证错误的字段） */
    details?: unknown;
  };
}

/**
 * API 系统错误响应（JSend error）
 * 用于服务端错误：数据库异常、外部API失败等
 */
export interface ApiErrorResponse {
  /** 响应状态 */
  status: "error";
  /** 错误描述 */
  message: string;
  /** 错误代码 */
  code?: string;
}

/**
 * API 响应联合类型
 *
 * @template T 成功时的数据类型
 */
export type ApiResponse<T = unknown> =
  | ApiSuccessResponse<T>
  | ApiFailResponse
  | ApiErrorResponse;

/**
 * 分页查询参数
 */
export interface PaginationParams {
  /** 每页数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 页码（从 1 开始） */
  page?: number;
}

/**
 * 排序参数
 */
export interface SortParams {
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  order?: "asc" | "desc";
}

/**
 * 类型守卫：检查是否为成功响应
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>,
): response is ApiSuccessResponse<T> {
  return response.status === "success";
}

/**
 * 类型守卫：检查是否为失败响应（业务失败）
 */
export function isFailResponse(
  response: ApiResponse<unknown>,
): response is ApiFailResponse {
  return response.status === "fail";
}

/**
 * 类型守卫：检查是否为错误响应（系统错误）
 */
export function isErrorResponse(
  response: ApiResponse<unknown>,
): response is ApiErrorResponse {
  return response.status === "error";
}
