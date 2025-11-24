/**
 * API 响应类型定义
 *
 * 统一前后端的数据交互格式，确保类型安全
 */

/**
 * API 成功响应
 *
 * @template T 响应数据类型
 */
export interface ApiSuccessResponse<T = unknown> {
  /** 成功标志 */
  success: true;
  /** 响应数据 */
  data: T;
  /** 可选的提示消息 */
  message?: string;
  /** 可选的元数据（分页等） */
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/**
 * API 错误响应
 */
export interface ApiErrorResponse {
  /** 失败标志 */
  success: false;
  /** 错误信息 */
  error: {
    /** 错误代码（如 VALIDATION_ERROR, NOT_FOUND） */
    code: string;
    /** 错误描述 */
    message: string;
    /** 详细错误信息（如验证错误的字段） */
    details?: unknown;
  };
}

/**
 * API 响应联合类型
 *
 * @template T 成功时的数据类型
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

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
  return response.success === true;
}

/**
 * 类型守卫：检查是否为错误响应
 */
export function isErrorResponse(
  response: ApiResponse<unknown>,
): response is ApiErrorResponse {
  return response.success === false;
}
