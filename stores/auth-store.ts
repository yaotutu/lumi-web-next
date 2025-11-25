/**
 * 认证状态管理 (Zustand)
 * 职责：轻量级的全局认证状态管理
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { type AuthState, AuthStatus, type User } from "@/types/auth";

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
       * 从服务器获取最新的认证状态
       */
      refreshAuth: async () => {
        try {
          const response = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache",
            },
          });

          if (!response.ok) {
            throw new Error(`认证检查失败: ${response.status}`);
          }

          const data = await response.json();

          if (data.success) {
            get().setAuthState(data.data.status, data.data.user);
          } else {
            // API 返回错误，重置为错误状态
            get().setAuthState(AuthStatus.ERROR, null);
          }
        } catch (error) {
          console.error("认证状态检查失败:", error);
          // 发生错误时，设置为错误状态
          get().setAuthState(AuthStatus.ERROR, null);
        }
      },

      /**
       * 重置认证状态
       * 用户登出时调用
       */
      resetAuth: () => {
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
