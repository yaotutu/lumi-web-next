/**
 * 全局 API 客户端
 * 职责：统一封装 fetch，自动处理 401 认证失败
 *
 * 核心功能：
 * - 自动拦截 401 响应
 * - 弹出登录弹窗
 * - 登录成功后自动重试请求
 * - 支持 JSend 响应格式
 */

import type { LoginModalContext } from "@/stores/login-modal-store";
import { loginModalActions } from "@/stores/login-modal-store";

/**
 * API 客户端选项
 */
export interface ApiClientOptions extends RequestInit {
  /** 触发上下文（用于登录弹窗） */
  context?: LoginModalContext;
  /** 是否禁用自动重试（默认 false） */
  disableRetry?: boolean;
}

/**
 * 全局 API 客户端
 *
 * **功能**：
 * - 自动拦截 401 响应
 * - 弹出登录弹窗
 * - 登录成功后自动重试请求
 *
 * **使用方式**：
 * ```typescript
 * const response = await apiClient('/api/tasks', {
 *   method: 'POST',
 *   body: JSON.stringify({ prompt: 'test' }),
 *   context: 'workspace', // 可选：指定上下文
 * });
 * ```
 *
 * @param url - 请求 URL
 * @param options - 请求选项
 * @returns Response 对象
 */
export async function apiClient(
  url: string,
  options: ApiClientOptions = {},
): Promise<Response> {
  const {
    context = "general",
    disableRetry = false,
    ...fetchOptions
  } = options;

  // 发送请求
  const response = await fetch(url, {
    ...fetchOptions,
    credentials: "include", // 自动携带 Cookie
  });

  // 检查是否是 401 未认证
  if (response.status === 401 && !disableRetry) {
    try {
      const data = await response.json();

      // 确认是认证失败（而非其他 401 错误）
      if (
        data.status === "fail" &&
        (data.data?.code === "UNAUTHORIZED" ||
          data.data?.code === "UNAUTHENTICATED")
      ) {
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
      // JSON 解析失败，返回原始响应
      return response;
    }
  }

  // 非 401 或已禁用重试，直接返回
  return response;
}

/**
 * API 客户端便捷方法 - GET 请求
 */
export async function apiGet(
  url: string,
  options: Omit<ApiClientOptions, "method" | "body"> = {},
): Promise<Response> {
  return apiClient(url, {
    ...options,
    method: "GET",
  });
}

/**
 * API 客户端便捷方法 - POST 请求
 */
export async function apiPost(
  url: string,
  body: unknown,
  options: Omit<ApiClientOptions, "method" | "body"> = {},
): Promise<Response> {
  return apiClient(url, {
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
 * API 客户端便捷方法 - PUT 请求
 */
export async function apiPut(
  url: string,
  body: unknown,
  options: Omit<ApiClientOptions, "method" | "body"> = {},
): Promise<Response> {
  return apiClient(url, {
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
 * API 客户端便捷方法 - DELETE 请求
 */
export async function apiDelete(
  url: string,
  options: Omit<ApiClientOptions, "method" | "body"> = {},
): Promise<Response> {
  return apiClient(url, {
    ...options,
    method: "DELETE",
  });
}
