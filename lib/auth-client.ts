/**
 * 前端认证工具
 * 职责：客户端组件调用认证 API
 *
 * 功能：
 * - 获取当前用户信息
 * - 退出登录
 */

/**
 * 用户信息类型
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/**
 * 获取当前登录用户信息
 *
 * @returns 用户对象（如果已登录），否则返回 null
 *
 * @example
 * ```typescript
 * const user = await getCurrentUser();
 * if (user) {
 *   console.log(user.email);
 * } else {
 *   console.log("未登录");
 * }
 * ```
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include", // 携带 Cookie
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
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

    return response.ok;
  } catch {
    return false;
  }
}
