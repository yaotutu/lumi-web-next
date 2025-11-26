/**
 * 前端认证工具 (已弃用)
 *
 * @deprecated 请使用 stores/auth-store.ts 中的 Zustand store
 * 职责：客户端组件调用认证 API
 *
 * **迁移指南**：
 * ```typescript
 * // 旧用法 (已弃用)
 * import { getCurrentUser } from "@/lib/auth-client";
 * const user = await getCurrentUser();
 *
 * // 新用法 (推荐)
 * import { useUser } from "@/stores/auth-store";
 * const user = useUser();
 * ```
 */

import { authActions } from "@/stores/auth-store";
import type { User } from "@/types/auth";

/**
 * 用户信息类型 (从 stores/auth-store 重新导出)
 */
export type { User } from "@/types/auth";

/**
 * 获取当前登录用户信息
 *
 * @deprecated 请使用 useUser() Hook
 * @returns 用户对象（如果已登录），否则返回 null
 *
 * @example
 * ```typescript
 * // 推荐用法
 * import { useUser } from "@/stores/auth-store";
 * const user = useUser();
 *
 * // 兼容旧用法 (已弃用)
 * const user = await getCurrentUser();
 * ```
 */
export async function getCurrentUser(): Promise<User | null> {
  console.warn(
    "getCurrentUser() 已弃用，请使用 stores/auth-store.ts 中的 useUser() Hook",
  );

  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include", // 携带 Cookie
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // 更新 Zustand store
    if (data.success) {
      authActions.setAuthState(data.data.status, data.data.user);
    }

    return data.data.user;
  } catch {
    return null;
  }
}

/**
 * 退出登录
 *
 * @returns 是否成功退出
 *
 * @example
 * ```typescript
 * const success = await logout();
 * if (success) {
 *   router.push("/login");
 * }
 * ```
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include", // 携带 Cookie
    });

    // 清除前端状态
    if (response.ok) {
      authActions.resetAuth();
    }

    return response.ok;
  } catch {
    return false;
  }
}
