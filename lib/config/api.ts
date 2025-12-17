/**
 * API 配置
 *
 * 功能：
 * - 统一 API 配置
 * - 前端直接请求后端 API 地址
 * - 通过环境变量配置后端地址
 *
 * 使用示例：
 * ```typescript
 * import { buildApiUrl } from '@/lib/config/api';
 *
 * // 自动拼接后端地址：
 * buildApiUrl('/api/tasks')
 * // 返回：http://192.168.88.100:3000/api/tasks
 *
 * buildApiUrl('/api/auth/login')
 * // 返回：http://192.168.88.100:3000/api/auth/login
 * ```
 */

export const API_CONFIG = {
  /**
   * 后端 API 基础地址（lumi-server）
   * 前端直接请求该地址
   */
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "",

  /**
   * 默认请求配置
   */
  defaultOptions: {
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
 * // 返回：http://192.168.88.100:3000/api/tasks
 *
 * buildApiUrl('/api/auth/login')
 * // 返回：http://192.168.88.100:3000/api/auth/login
 */
export function buildApiUrl(endpoint: string): string {
  // 确保 endpoint 以 / 开头
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  // 获取 baseURL
  const baseURL = API_CONFIG.baseURL;

  // 如果 baseURL 为空，直接返回 endpoint（相对路径）
  if (!baseURL) {
    return normalizedEndpoint;
  }

  // 移除 baseURL 末尾的斜杠（如果有）
  const normalizedBaseURL = baseURL.endsWith("/")
    ? baseURL.slice(0, -1)
    : baseURL;

  return `${normalizedBaseURL}${normalizedEndpoint}`;
}

