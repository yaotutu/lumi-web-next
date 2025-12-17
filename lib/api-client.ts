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
 * - 自动添加 Bearer Token
 * - 所有请求通过 lumi-server 统一网关
 *
 * **使用方式**：
 * ```typescript
 * // 业务 API（自动添加 Token）
 * const response = await apiClient('/api/tasks', {
 *   method: 'POST',
 *   body: JSON.stringify({ prompt: 'test' }),
 *   context: 'workspace',
 * });
 *
 * // 认证 API（同样通过 lumi-server）
 * const response = await apiClient('/api/auth/login', {
 *   method: 'POST',
 *   body: JSON.stringify({ email, code }),
 * });
 * ```
 *
 * @param url - 请求 URL（相对路径，如 '/api/tasks'）
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

  // 检查是否是 401 未认证
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
 * API 客户端便捷方法 - PATCH 请求
 */
export async function apiPatch(
  url: string,
  body: unknown,
  options: Omit<ApiClientOptions, "method" | "body"> = {},
): Promise<Response> {
  return apiClient(url, {
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
