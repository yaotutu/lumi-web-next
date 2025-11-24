/**
 * API 配置
 *
 * 功能：
 * - 支持动态配置 API Base URL
 * - 开发环境使用相对路径（Monorepo）
 * - 生产环境可配置为独立后端地址
 *
 * 使用示例：
 * ```typescript
 * import { API_CONFIG } from '@/lib/config/api';
 *
 * // 当前（Monorepo）：
 * // NEXT_PUBLIC_API_BASE_URL 未设置
 * // 实际请求：/api/tasks
 *
 * // 未来（后端独立部署）：
 * // NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
 * // 实际请求：https://api.yourdomain.com/api/tasks
 * ```
 */

export const API_CONFIG = {
  /**
   * API Base URL
   *
   * - 开发环境：留空（使用相对路径）
   * - 生产环境（拆分后）：配置为后端服务地址
   *
   * 环境变量：NEXT_PUBLIC_API_BASE_URL
   */
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "",

  /**
   * 默认请求配置
   */
  defaultOptions: {
    credentials: "include" as RequestCredentials, // 携带 Cookie
    headers: {
      "Content-Type": "application/json",
    },
  },

  /**
   * 超时时间（毫秒）
   */
  timeout: 30000, // 30 秒

  /**
   * SSE 重连配置
   */
  sse: {
    reconnectDelay: 2000, // 重连延迟 2 秒
    maxReconnectAttempts: 5, // 最多重连 5 次
  },
} as const;

/**
 * 构建完整的 API URL
 *
 * @param endpoint API 端点（如 `/api/tasks`）
 * @returns 完整的 URL
 *
 * @example
 * buildApiUrl('/api/tasks')
 * // 当前：/api/tasks
 * // 未来：https://api.yourdomain.com/api/tasks
 */
export function buildApiUrl(endpoint: string): string {
  // 确保 endpoint 以 / 开头
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  // 如果 baseURL 为空，直接返回 endpoint（相对路径）
  if (!API_CONFIG.baseURL) {
    return normalizedEndpoint;
  }

  // 移除 baseURL 末尾的斜杠（如果有）
  const normalizedBaseURL = API_CONFIG.baseURL.endsWith("/")
    ? API_CONFIG.baseURL.slice(0, -1)
    : API_CONFIG.baseURL;

  return `${normalizedBaseURL}${normalizedEndpoint}`;
}
