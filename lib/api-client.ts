/**
 * 全局 API 客户端
 * 职责：统一封装 fetch，自动处理 401 认证失败，支持 Bearer Token
 *
 * 核心功能：
 * - 自动拦截 401 响应
 * - 弹出登录弹窗
 * - 登录成功后自动重试请求
 * - 自动添加 Bearer Token
 * - 支持 JSend 响应格式
 * - 所有请求通过 lumi-server 统一网关
 */

import { buildApiUrl } from "@/lib/config/api";
import type { LoginModalContext } from "@/stores/login-modal-store";
import { loginModalActions } from "@/stores/login-modal-store";
import { tokenActions } from "@/stores/token-store";

/**
 * API 错误类
 * 用于封装所有 API 请求错误（4xx, 5xx）
 */
export class ApiError extends Error {
  /** HTTP 状态码 */
  public readonly status: number;
  /** 错误代码（来自 JSend 响应） */
  public readonly code?: string;
  /** 原始响应数据 */
  public readonly data?: any;

  constructor(status: number, message: string, code?: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }

  /** 判断是否为客户端错误（4xx） */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** 判断是否为服务端错误（5xx） */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /** 判断是否为特定状态码 */
  hasStatus(status: number): boolean {
    return this.status === status;
  }

  /** 判断是否为特定错误代码 */
  hasCode(code: string): boolean {
    return this.code === code;
  }
}

/**
 * API 客户端选项
 */
export interface ApiClientOptions extends RequestInit {
  /** 触发上下文（用于登录弹窗） */
  context?: LoginModalContext;
  /** 是否禁用自动重试（默认 false） */
  disableRetry?: boolean;
  /** 是否禁用自动错误处理（默认 false，即自动抛出 ApiError） */
  disableErrorHandling?: boolean;
  /** 是否自动显示 Toast 提示（默认 true） */
  autoToast?: boolean;
  /** Toast 消息前缀（可选） */
  toastContext?: string;
  /** 自定义 Toast 类型（可选） */
  toastType?: "success" | "error" | "warning" | "info";
}

/**
 * 包装 Response 对象，让 json() 方法自动转换 URL
 */
function wrapResponse(response: Response): Response {
  const originalJson = response.json.bind(response);

  // 重写 json 方法
  response.json = async function () {
    const data = await originalJson();
    // ✅ 前端不再改写 URL，直接使用后端返回的完整地址
    return data;
  };

  return response;
}

/**
 * 核心 API 客户端（内部函数）
 *
 * **功能**：
 * - 自动拦截 401 响应并弹出登录弹窗
 * - 自动处理 4xx/5xx 错误并抛出 ApiError
 * - 登录成功后自动重试请求
 * - 自动添加 Bearer Token
 * - 自动转换响应中的 URL（相对路径 → 完整 URL）
 * - 支持 304 Not Modified 优化
 * - 所有请求通过 lumi-server 统一网关
 *
 * **注意**：这是内部函数,不对外导出。请使用 apiRequest 系列函数。
 *
 * @param url - 请求 URL（相对路径，如 '/api/tasks'）
 * @param options - 请求选项
 * @returns Response 对象（json() 方法已被包装，会自动转换 URL）
 * @throws {ApiError} 当响应状态码为 4xx 或 5xx 时（除非 disableErrorHandling=true）
 */
// 核心 API 客户端（内部函数，不导出）
async function apiClient(
  url: string,
  options: ApiClientOptions = {},
): Promise<Response> {
  const {
    context = "general",
    disableRetry = false,
    disableErrorHandling = false,
    headers = {},
    ...fetchOptions
  } = options;

  // 构建完整的 API URL（拼接后端地址）
  const fullUrl = buildApiUrl(url);

  // 准备请求头
  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  // 自动添加 Token（外部服务返回的 token 已包含 "Bearer " 前缀）
  const token = tokenActions.getToken();
  if (token) {
    finalHeaders["Authorization"] = token;
  }

  // 发送请求（直接请求后端地址）
  const response = await fetch(fullUrl, {
    ...fetchOptions,
    headers: finalHeaders,
  });

  // ✅ 特殊处理：304 Not Modified（直接返回，不需要解析 body）
  if (response.status === 304) {
    return wrapResponse(response);
  }

  // ✅ 特殊处理：401 Unauthorized（弹出登录弹窗，自动重试）
  if (response.status === 401 && !disableRetry) {
    try {
      const data = await response.json();

      // 确认是认证失败（支持多种响应格式）
      const isAuthError =
        (data.status === "fail" &&
          (data.data?.code === "UNAUTHORIZED" ||
            data.data?.code === "UNAUTHENTICATED")) ||
        data.code === 401;

      if (isAuthError) {
        // 清除无效 Token
        tokenActions.clearToken();

        // 返回一个 Promise，等待登录完成后重试
        return new Promise((resolve, reject) => {
          loginModalActions.open(context, async () => {
            try {
              // 登录成功，重试请求（禁用重试避免死循环）
              const retryResponse = await apiClient(url, {
                ...options,
                disableRetry: true, // 重试时禁用自动重试
              });
              resolve(retryResponse);
            } catch (error) {
              reject(error);
            }
          });
        });
      }
    } catch (_error) {
      // JSON 解析失败，返回原始响应（包装后）
      return wrapResponse(response);
    }
  }

  // ✅ 自动错误处理：4xx/5xx 状态码自动抛出 ApiError
  if (!disableErrorHandling && !response.ok) {
    let errorMessage = `请求失败 (HTTP ${response.status})`;
    let errorCode: string | undefined;
    let errorData: any;

    try {
      const data = await response.json();
      errorData = data;

      // 从 JSend 响应中提取错误信息
      if (data.status === "fail" && data.data) {
        // 客户端错误（4xx）
        errorMessage = data.data.message || errorMessage;
        errorCode = data.data.code;
      } else if (data.status === "error") {
        // 服务端错误（5xx）
        errorMessage = data.message || errorMessage;
        errorCode = data.code;
      } else if (data.message) {
        // 兼容其他格式
        errorMessage = data.message;
        errorCode = data.code;
      }
    } catch (_error) {
      // JSON 解析失败，使用默认错误消息
      errorMessage = `${errorMessage}: ${response.statusText}`;
    }

    // 抛出 ApiError
    throw new ApiError(response.status, errorMessage, errorCode, errorData);
  }

  // ✅ 成功响应（2xx）或已禁用错误处理，返回包装后的响应（自动转换 URL）
  return wrapResponse(response);
}

/**
 * 创建 SSE 连接（使用统一的 API 配置）
 *
 * 支持跨域携带 Token，确保与 fetch 请求的认证机制一致
 *
 * @param url SSE 端点（相对路径，如 '/api/tasks/123/events'）
 * @returns EventSource 实例
 */
export function createEventSource(url: string): EventSource {
  const fullUrl = buildApiUrl(url);

  // 注意：EventSource 不支持自定义 Header
  // 如果需要 Token，建议在 URL 中传递或使用其他方案
  return new EventSource(fullUrl);
}

/**
 * API 请求结果（成功）
 */
export interface ApiSuccess<T = any> {
  success: true;
  data: T;
}

/**
 * API 请求结果（失败）
 */
export interface ApiFailure {
  success: false;
  error: ApiError;
}

/**
 * API 请求结果（联合类型）
 */
export type ApiResult<T = any> = ApiSuccess<T> | ApiFailure;

/**
 * 🚀 高级 API 请求方法（推荐使用）
 *
 * **特点**：
 * - 返回 `{ success, data, error }` 结构，无需 try-catch
 * - 自动解析 JSON 响应
 * - 自动提取 JSend 格式中的 data 字段
 * - 类型安全（支持泛型）
 *
 * **使用示例**：
 * ```typescript
 * // 1. 基础用法
 * const result = await apiRequest<Task>('/api/tasks/123');
 * if (result.success) {
 *   console.log(result.data.originalPrompt); // TypeScript 自动推导类型
 * } else {
 *   console.error(result.error.message);
 * }
 *
 * // 2. POST 请求
 * const result = await apiRequest<Task>('/api/tasks', {
 *   method: 'POST',
 *   body: JSON.stringify({ prompt: 'test' }),
 * });
 *
 * // 3. 解构使用
 * const { success, data, error } = await apiRequest('/api/tasks');
 * if (!success) {
 *   if (error.hasStatus(404)) {
 *     // 处理 404
 *   }
 *   return;
 * }
 * // 使用 data
 * ```
 *
 * @param url - 请求 URL（相对路径）
 * @param options - 请求选项
 * @returns Promise<ApiResult<T>> - 统一的结果对象
 */
export async function apiRequest<T = any>(
  url: string,
  options: ApiClientOptions = {},
): Promise<ApiResult<T>> {
  try {
    // 调用底层 apiClient（自动处理错误）
    const response = await apiClient(url, options);

    // ✅ 特殊处理：304 Not Modified（响应体为空，不解析 JSON）
    if (response.status === 304) {
      // 返回一个特殊的 NOT_MODIFIED 错误
      const notModifiedError = new ApiError(
        304,
        "数据未修改",
        "NOT_MODIFIED",
        null,
      );

      return {
        success: false,
        error: notModifiedError,
      };
    }

    // 解析 JSON
    const json = await response.json();

    // 提取 JSend 格式中的 data 字段
    const data = json.status === "success" ? json.data : json;

    // ✅ 自动显示成功 Toast（如果配置了 toastType）
    if (options.toastType === "success") {
      // 动态导入避免循环依赖
      const { toast } = await import("@/lib/toast");
      const message = options.toastContext || "操作成功";
      toast.success(message);
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    // 捕获 ApiError 或其他错误
    if (error instanceof ApiError) {
      // ✅ 自动显示错误 Toast（默认启用，可通过 autoToast=false 关闭）
      if (options.autoToast !== false) {
        // 动态导入避免循环依赖
        const { toast } = await import("@/lib/toast");
        const message = options.toastContext
          ? `${options.toastContext}: ${error.message}`
          : error.message;
        toast.error(message);
      }

      return {
        success: false,
        error,
      };
    }

    // 网络错误或其他未知错误
    const networkError = new ApiError(
      0,
      error instanceof Error ? error.message : "未知错误",
    );

    // ✅ 自动显示网络错误 Toast
    if (options.autoToast !== false) {
      const { toast } = await import("@/lib/toast");
      toast.error(networkError.message);
    }

    return {
      success: false,
      error: networkError,
    };
  }
}

/**
 * 🚀 高级 GET 请求（推荐使用）
 */
export async function apiRequestGet<T = any>(
  url: string,
  options: Omit<ApiClientOptions, "method" | "body"> = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>(url, {
    ...options,
    method: "GET",
  });
}

/**
 * 🚀 高级 POST 请求（推荐使用）
 */
export async function apiRequestPost<T = any>(
  url: string,
  body: unknown,
  options: Omit<ApiClientOptions, "method" | "body"> = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>(url, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * 🚀 高级 PATCH 请求（推荐使用）
 */
export async function apiRequestPatch<T = any>(
  url: string,
  body: unknown,
  options: Omit<ApiClientOptions, "method" | "body"> = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>(url, {
    ...options,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * 🚀 高级 PUT 请求（推荐使用）
 */
export async function apiRequestPut<T = any>(
  url: string,
  body: unknown,
  options: Omit<ApiClientOptions, "method" | "body"> = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>(url, {
    ...options,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * 🚀 高级 DELETE 请求（推荐使用）
 */
export async function apiRequestDelete<T = any>(
  url: string,
  options: Omit<ApiClientOptions, "method" | "body"> = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>(url, {
    ...options,
    method: "DELETE",
  });
}
