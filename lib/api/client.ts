/**
 * 统一的 API 客户端
 *
 * 功能：
 * - 封装所有 HTTP 请求
 * - 自动添加 credentials 和 headers
 * - 统一错误处理
 * - 类型安全的 API 调用
 *
 * 优势：
 * - 未来拆分后端时只需修改 API_CONFIG.baseURL
 * - 所有 API 调用集中管理，易于维护
 * - 完整的 TypeScript 类型提示
 */

import { API_CONFIG, buildApiUrl } from "@/lib/config/api";
import type {
  GenerationRequestResponse,
  Model,
  User,
  UserAsset,
  UserAssetWithUser,
} from "@/types";
import type { ApiResponse } from "@/types/api-response";

/**
 * HTTP 请求方法
 */
type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

/**
 * API 客户端类
 */
class ApiClient {
  /**
   * 通用请求方法
   *
   * @template T 响应数据类型
   * @param endpoint API 端点
   * @param options 请求选项
   * @returns API 响应
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);

    try {
      const response = await fetch(url, {
        ...API_CONFIG.defaultOptions,
        ...options,
        headers: {
          ...API_CONFIG.defaultOptions.headers,
          ...options?.headers,
        },
      });

      // 解析 JSON 响应
      const data = await response.json();

      return data as ApiResponse<T>;
    } catch (error) {
      // 网络错误或 JSON 解析失败
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "网络请求失败",
        },
      };
    }
  }

  /**
   * GET 请求
   */
  private get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  /**
   * POST 请求
   */
  private post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH 请求
   */
  private patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE 请求
   */
  private delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // ========================================
  // 任务相关 API
  // ========================================

  /**
   * 任务 API 集合
   */
  tasks = {
    /**
     * 获取任务列表
     *
     * @param params 查询参数
     * @returns 任务列表
     *
     * @example
     * const response = await apiClient.tasks.list({ limit: 20 });
     * if (response.success) {
     *   console.log(response.data); // GenerationRequest[]
     * }
     */
    list: (params?: { limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.offset) query.set("offset", String(params.offset));

      const queryString = query.toString();
      const endpoint = queryString ? `/api/tasks?${queryString}` : "/api/tasks";

      return this.get<GenerationRequestResponse[]>(endpoint);
    },

    /**
     * 创建图片生成任务
     *
     * @param data 请求数据
     * @returns 创建的任务
     *
     * @example
     * const response = await apiClient.tasks.create({ prompt: '一只可爱的猫' });
     * if (response.success) {
     *   console.log(response.data.id);
     * }
     */
    create: (data: { prompt: string }) => {
      return this.post<GenerationRequestResponse>("/api/tasks", data);
    },

    /**
     * 获取任务详情
     *
     * @param id 任务 ID
     * @returns 任务详情
     */
    get: (id: string) => {
      return this.get<GenerationRequestResponse>(`/api/tasks/${id}`);
    },

    /**
     * 更新任务（选择图片生成 3D 模型）
     *
     * @param id 任务 ID
     * @param data 更新数据
     * @returns 生成的模型
     */
    update: (id: string, data: { selectedImageIndex: number }) => {
      return this.patch<{ model: Model; selectedImageIndex: number }>(
        `/api/tasks/${id}`,
        data,
      );
    },

    /**
     * 删除任务
     *
     * @param id 任务 ID
     * @returns 删除结果
     */
    delete: (id: string) => {
      return this.delete<void>(`/api/tasks/${id}`);
    },

    /**
     * 创建 SSE 连接（实时任务状态）
     *
     * @param id 任务 ID
     * @returns EventSource 实例
     *
     * @example
     * const eventSource = apiClient.tasks.events(taskId);
     * eventSource.addEventListener('message', (e) => {
     *   const event = JSON.parse(e.data);
     *   console.log(event.type, event.data);
     * });
     */
    events: (id: string): EventSource => {
      const url = buildApiUrl(`/api/tasks/${id}/events`);
      return new EventSource(url);
    },

    /**
     * 提交打印任务
     *
     * @param id 任务 ID
     * @returns 打印任务 ID
     */
    print: (id: string) => {
      return this.post<{ taskId: string }>(`/api/tasks/${id}/print`);
    },

    /**
     * 查询打印任务状态
     *
     * @param id 任务 ID
     * @returns 打印任务状态
     */
    printStatus: (id: string) => {
      return this.get<{
        taskId: string;
        status: string;
        progress: number;
        message?: string;
      }>(`/api/tasks/${id}/print-status`);
    },

    /**
     * 重试失败的任务
     *
     * @param id 任务 ID
     * @param type 重试类型（image 或 model）
     * @returns 重试结果
     */
    retry: (id: string, type: "image" | "model") => {
      return this.post<void>(`/api/tasks/${id}/retry`, { type });
    },
  };

  // ========================================
  // 认证相关 API
  // ========================================

  /**
   * 认证 API 集合
   */
  auth = {
    /**
     * 发送邮箱验证码
     *
     * @param email 邮箱地址
     * @returns 发送结果
     */
    sendCode: (email: string) => {
      return this.post<void>("/api/auth/send-code", { email });
    },

    /**
     * 验证码登录/注册
     *
     * @param email 邮箱地址
     * @param code 验证码
     * @returns 用户信息和 Token
     */
    verifyCode: (email: string, code: string) => {
      return this.post<{ user: User; token: string }>("/api/auth/verify-code", {
        email,
        code,
      });
    },

    /**
     * 获取当前登录用户
     *
     * @returns 用户信息
     */
    me: () => {
      return this.get<{ user: User }>("/api/auth/me");
    },

    /**
     * 退出登录
     *
     * @returns 登出结果
     */
    logout: () => {
      return this.post<void>("/api/auth/logout");
    },
  };

  // ========================================
  // 画廊相关 API
  // ========================================

  /**
   * 画廊 API 集合
   */
  gallery = {
    /**
     * 获取公开模型列表
     *
     * @param params 查询参数
     * @returns 模型列表
     */
    list: (params?: { sortBy?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.sortBy) query.set("sortBy", params.sortBy);
      if (params?.limit) query.set("limit", String(params.limit));

      const queryString = query.toString();
      const endpoint = queryString
        ? `/api/gallery/models?${queryString}`
        : "/api/gallery/models";

      return this.get<UserAsset[]>(endpoint);
    },

    /**
     * 获取模型详情
     *
     * @param id 模型 ID
     * @returns 模型详情（包含用户信息）
     */
    get: (id: string) => {
      return this.get<UserAssetWithUser>(`/api/gallery/models/${id}`);
    },

    /**
     * 增加模型下载计数
     *
     * @param id 模型 ID
     * @returns 下载结果
     */
    download: (id: string) => {
      return this.post<void>(`/api/gallery/models/${id}/download`);
    },
  };

  // ========================================
  // 代理相关 API
  // ========================================

  /**
   * 代理 API 集合（用于解决 CORS 问题）
   */
  proxy = {
    /**
     * 获取代理后的图片 URL
     *
     * @param imageUrl 原始图片 URL
     * @returns 代理 URL
     */
    image: (imageUrl: string): string => {
      const encodedUrl = encodeURIComponent(imageUrl);
      return buildApiUrl(`/api/proxy/image?url=${encodedUrl}`);
    },

    /**
     * 获取代理后的模型 URL
     *
     * @param modelUrl 原始模型 URL
     * @returns 代理 URL
     */
    model: (modelUrl: string): string => {
      const encodedUrl = encodeURIComponent(modelUrl);
      return buildApiUrl(`/api/proxy/model?url=${encodedUrl}`);
    },
  };
}

/**
 * 导出单例 API 客户端
 *
 * 使用示例：
 * ```typescript
 * import { apiClient } from '@/lib/api/client';
 *
 * // 创建任务
 * const response = await apiClient.tasks.create({ prompt: '一只猫' });
 * if (response.success) {
 *   console.log(response.data);
 * } else {
 *   console.error(response.error.message);
 * }
 *
 * // 获取任务列表
 * const listResponse = await apiClient.tasks.list({ limit: 20 });
 *
 * // SSE 实时推送
 * const eventSource = apiClient.tasks.events(taskId);
 * eventSource.addEventListener('message', (e) => {
 *   const event = JSON.parse(e.data);
 *   // 处理事件
 * });
 * ```
 */
export const apiClient = new ApiClient();
