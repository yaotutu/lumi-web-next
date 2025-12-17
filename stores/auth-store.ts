/**
 * 认证状态管理 (Zustand)
 * 职责：轻量级的全局认证状态管理
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { type AuthState, AuthStatus, type User } from "@/types/auth";
import { tokenActions } from "@/stores/token-store";
import { apiGet } from "@/lib/api-client";

// 导出类型供外部使用
export type { User } from "@/types/auth";

/**
 * 认证状态 Store 接口
 */
interface AuthStore extends AuthState {
  /** 设置认证状态 */
  setAuthState: (status: AuthStatus, user: User | null) => void;
  /** 刷新认证状态 */
  refreshAuth: () => Promise<void>;
  /** 重置认证状态 */
  resetAuth: () => void;
  /** 认证状态是否已加载 */
  isLoaded: boolean;
  /** 设置加载状态 */
  setLoaded: (loaded: boolean) => void;
}

/**
 * 认证状态 Store
 *
 * **初始状态**：未认证，用户为空，未加载
 * **特点**：
 * - 轻量级，无额外依赖
 * - 持久化到 localStorage（可选）
 * - 支持开发工具调试
 * - 类型安全
 */
export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      status: AuthStatus.UNAUTHENTICATED,
      user: null,
      lastChecked: new Date(),
      isLoaded: false,

      /**
       * 设置认证状态
       * @param status 认证状态
       * @param user 用户信息
       */
      setAuthState: (status: AuthStatus, user: User | null) => {
        set({
          status,
          user,
          lastChecked: new Date(),
          isLoaded: true,
        });
      },

      /**
       * 刷新认证状态
       * 从后端获取最新的认证状态（后端会代理到外部用户服务）
       */
      refreshAuth: async () => {
        try {
          // 如果没有 Token，直接设置为未认证
          const token = tokenActions.getToken();
          console.log('🔍 [refreshAuth] Token 状态:', token ? '存在' : '不存在');

          if (!token) {
            get().setAuthState(AuthStatus.UNAUTHENTICATED, null);
            return;
          }

          // 调用后端代理接口获取用户信息
          console.log('🌐 [refreshAuth] 调用后端代理接口...');
          const response = await apiGet('/api/auth/me');

          console.log('📦 [refreshAuth] API 响应:', response);

          if (response.ok) {
            const data = await response.json();

            // 检查认证状态
            if (data.status === 'success' && data.data?.status === 'authenticated' && data.data?.user) {
              // 转换为前端用户格式
              const user: User = {
                id: data.data.user.id,
                email: data.data.user.email || '',
                name: data.data.user.nickName || data.data.user.userName,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              };
              console.log('✅ [refreshAuth] 设置认证状态 - AUTHENTICATED', user);
              get().setAuthState(AuthStatus.AUTHENTICATED, user);
            } else {
              // Token 无效，清除并设置为未认证
              console.warn('⚠️ [refreshAuth] 获取用户信息失败，清除认证状态');
              tokenActions.clearToken();
              get().setAuthState(AuthStatus.UNAUTHENTICATED, null);
            }
          } else {
            // 请求失败
            console.warn('⚠️ [refreshAuth] 请求失败，清除认证状态');
            tokenActions.clearToken();
            get().setAuthState(AuthStatus.UNAUTHENTICATED, null);
          }
        } catch (error) {
          console.error("❌ [refreshAuth] 认证状态检查失败:", error);
          // 发生错误时，设置为错误状态
          get().setAuthState(AuthStatus.ERROR, null);
        }
      },

      /**
       * 重置认证状态
       * 用户登出时调用
       */
      resetAuth: () => {
        // 清除 Token
        tokenActions.clearToken();

        // 重置认证状态
        set({
          status: AuthStatus.UNAUTHENTICATED,
          user: null,
          lastChecked: new Date(),
          isLoaded: true,
        });
      },

      /**
       * 设置加载状态
       * @param loaded 是否已加载
       */
      setLoaded: (loaded: boolean) => {
        set({ isLoaded: loaded });
      },
    }),
    {
      name: "auth-store", // Store 名称，用于开发工具标识
    },
  ),
);

/**
 * 认证状态选择器
 */
export const useAuth = () => useAuthStore();

/**
 * 认证状态便捷选择器
 */
export const useAuthStatus = () => useAuthStore((state) => state.status);
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.status === AuthStatus.AUTHENTICATED);
export const useIsLoaded = () => useAuthStore((state) => state.isLoaded);
export const useLastChecked = () => useAuthStore((state) => state.lastChecked);

/**
 * 认证状态操作方法
 */
export const authActions = {
  /** 设置认证状态 */
  setAuthState: (status: AuthStatus, user: User | null) => {
    useAuthStore.getState().setAuthState(status, user);
  },

  /** 刷新认证状态 */
  refreshAuth: () => {
    return useAuthStore.getState().refreshAuth();
  },

  /** 重置认证状态 */
  resetAuth: () => {
    useAuthStore.getState().resetAuth();
  },

  /** 设置加载状态 */
  setLoaded: (loaded: boolean) => {
    useAuthStore.getState().setLoaded(loaded);
  },
};
