/**
 * Token 管理 Store
 * 职责：管理用户登录 Token（localStorage 持久化）
 *
 * 功能：
 * - 保存/获取/清除 Token
 * - Token 自动持久化到 localStorage
 * - 支持多 Tab 同步（通过 Zustand persist）
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface TokenStore {
  /** 当前 Token */
  token: string | null;

  /** 设置 Token */
  setToken: (token: string) => void;

  /** 清除 Token */
  clearToken: () => void;

  /** 获取 Token */
  getToken: () => string | null;
}

/**
 * Token Store
 *
 * 使用 Zustand persist 中间件，自动持久化到 localStorage
 */
export const useTokenStore = create<TokenStore>()(
  persist(
    (set, get) => ({
      token: null,

      setToken: (token: string) => {
        set({ token });
      },

      clearToken: () => {
        set({ token: null });
      },

      getToken: () => {
        return get().token;
      },
    }),
    {
      name: "auth-token", // localStorage key
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Token 操作方法（非 React 环境也可使用）
 */
export const tokenActions = {
  /** 设置 Token */
  setToken: (token: string) => useTokenStore.getState().setToken(token),

  /** 清除 Token */
  clearToken: () => useTokenStore.getState().clearToken(),

  /** 获取 Token */
  getToken: () => useTokenStore.getState().getToken(),
};
