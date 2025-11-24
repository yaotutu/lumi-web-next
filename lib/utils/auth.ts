/**
 * 认证工具函数（纯Cookie版本）
 * 职责：Cookie 会话管理、用户身份认证
 *
 * 技术栈：
 * - HTTP-only Cookie: 存储用户信息的 JSON
 * - 简单 JSON 解析，无需 JWT 复杂度
 */

import { cookies } from "next/headers";
import { AppError } from "./errors";

// ============================================
// 配置常量
// ============================================

/**
 * Cookie 名称
 */
const AUTH_COOKIE_NAME = "auth-session";

/**
 * Cookie 有效期（7 天）
 */
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 秒

// ============================================
// 用户信息类型定义
// ============================================

/**
 * 用户会话信息结构（存储在 Cookie 中）
 */
export interface UserSession {
  userId: string;
  email: string;
}

// ============================================
// Cookie 工具函数
// ============================================

/**
 * 设置用户会话 Cookie
 *
 * @param user - 用户信息对象
 *
 * @example
 * ```typescript
 * await setUserCookie({
 *   userId: "user-123",
 *   email: "user@example.com"
 * });
 * ```
 */
export async function setUserCookie(user: UserSession): Promise<void> {
  const cookieStore = await cookies();
  const userData = JSON.stringify(user);

  cookieStore.set(AUTH_COOKIE_NAME, userData, {
    httpOnly: true, // 防止 JavaScript 访问（防 XSS）
    secure: process.env.NODE_ENV === "production", // 生产环境使用 HTTPS
    sameSite: "lax", // 防止 CSRF 攻击
    maxAge: COOKIE_MAX_AGE, // 7 天过期
    path: "/", // 全站可用
  });
}

/**
 * 从请求的 Cookie 中获取当前用户 ID
 *
 * @returns 当前用户 ID
 * @throws AppError UNAUTHORIZED - 用户未登录或会话无效
 *
 * @example
 * ```typescript
 * // API 路由中使用
 * export const POST = withErrorHandler(async (request: NextRequest) => {
 *   const userId = await getCurrentUserId();
 *   const task = await createTask(userId, prompt);
 *   return NextResponse.json({ success: true, data: task });
 * });
 * ```
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  return user.userId;
}

/**
 * 从请求的 Cookie 中获取当前用户完整信息
 *
 * @returns 用户会话信息（包含 userId 和 email）
 * @throws AppError UNAUTHORIZED - 用户未登录或会话无效
 *
 * @example
 * ```typescript
 * const user = await getCurrentUser();
 * console.log(user.email); // "user@example.com"
 * ```
 */
export async function getCurrentUser(): Promise<UserSession> {
  const cookieStore = await cookies();
  const userData = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!userData) {
    throw new AppError("UNAUTHORIZED", "用户未登录，请先登录");
  }

  try {
    const user = JSON.parse(userData) as UserSession;

    // 验证数据格式
    if (!user.userId || !user.email) {
      throw new Error("会话数据格式无效");
    }

    return user;
  } catch (error) {
    throw new AppError("UNAUTHORIZED", "登录信息无效，请重新登录");
  }
}

/**
 * 清除用户会话 Cookie（三重保障）
 *
 * 使用三种方式确保 Cookie 完全清除：
 * 1. 设置空字符串 + maxAge: 0
 * 2. 设置过去的时间 expires
 * 3. 再次尝试 delete 方法
 */
export async function clearUserCookie(): Promise<void> {
  const cookieStore = await cookies();

  // 保障1: 设置空字符串 + maxAge: 0
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // 立即过期
    path: "/",
    expires: new Date(0), // 保障2: 显式设置过去的时间
  });

  // 保障3: 再次尝试删除（兜底）
  try {
    cookieStore.delete(AUTH_COOKIE_NAME);
  } catch {
    // 忽略删除失败，因为上面已经设置了过期
  }
}

/**
 * 检查当前用户是否有权限访问指定资源
 *
 * **当前实现（开发阶段）**：
 * - 固定返回 true（因为只有一个测试用户）
 *
 * **未来实现**：
 * - 检查资源的 userId 是否与当前用户 ID 匹配
 * - 支持管理员权限检查
 *
 * @param resourceUserId 资源所属的用户 ID
 * @returns 是否有权限访问
 *
 * @example
 * ```typescript
 * const task = await getTaskById(taskId);
 * if (!canAccessResource(task.userId)) {
 *   throw new AppError("FORBIDDEN", "无权访问该资源");
 * }
 * ```
 */
export function canAccessResource(resourceUserId: string): boolean {
  // TODO: 替换为真实的权限检查逻辑
  // 示例实现：
  // const currentUserId = getCurrentUserId();
  // return currentUserId === resourceUserId || isAdmin(currentUserId);

  // 当前实现：所有资源都属于同一个测试用户，始终有权限
  return true;
}

/**
 * 验证当前用户是否有权限访问资源（抛出异常版本）
 *
 * 这是 canAccessResource 的便捷封装，如果没有权限会直接抛出 AppError
 *
 * @param resourceUserId 资源所属的用户 ID
 * @throws AppError FORBIDDEN - 无权访问该资源
 *
 * @example
 * ```typescript
 * const task = await getTaskById(taskId);
 * requireResourceAccess(task.userId); // 无权限时自动抛出错误
 * // 继续处理...
 * ```
 */
export function requireResourceAccess(resourceUserId: string): void {
  // 导入 AppError（延迟导入避免循环依赖）
  // if (!canAccessResource(resourceUserId)) {
  //   const { AppError } = require("./errors");
  //   throw new AppError("FORBIDDEN", "无权访问该资源");
  // }
  // 当前实现：始终通过验证
  // 未来实现时需要取消上面的注释
}