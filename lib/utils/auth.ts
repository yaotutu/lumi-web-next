/**
 * 认证工具函数
 * 职责：JWT 生成/验证、用户身份认证
 *
 * 技术栈：
 * - jose: Next.js 官方推荐的 JWT 库（支持 Edge Runtime）
 * - HTTP-only Cookie: 存储 JWT token
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { AppError } from "./errors";

// ============================================
// 配置常量
// ============================================

/**
 * JWT 密钥（从环境变量读取）
 * 必须是 32 字节以上的随机字符串
 */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("环境变量 JWT_SECRET 未设置");
}

/**
 * JWT 过期时间（默认 7 天）
 */
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Cookie 名称
 */
const AUTH_COOKIE_NAME = "auth-token";

/**
 * JWT 算法
 */
const JWT_ALGORITHM = "HS256";

// ============================================
// JWT Payload 类型定义
// ============================================

/**
 * JWT Payload 结构
 */
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number; // issued at（签发时间）
  exp?: number; // expiration time（过期时间）
}

// ============================================
// JWT 工具函数
// ============================================

/**
 * 生成 JWT token
 *
 * @param payload - JWT 载荷数据
 * @returns JWT 字符串
 *
 * @example
 * ```typescript
 * const jwt = await generateJWT({
 *   userId: "user-123",
 *   email: "user@example.com"
 * });
 * ```
 */
export async function generateJWT(payload: {
  userId: string;
  email: string;
}): Promise<string> {
  // 将密钥字符串转换为 Uint8Array
  const secret = new TextEncoder().encode(JWT_SECRET);

  // 解析过期时间（支持 "7d", "24h" 等格式）
  const expiresIn = parseExpireTime(JWT_EXPIRES_IN);

  // 生成 JWT
  const jwt = await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: JWT_ALGORITHM }) // 设置算法
    .setIssuedAt() // 设置签发时间
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn) // 设置过期时间
    .sign(secret); // 签名

  return jwt;
}

/**
 * 验证并解析 JWT token
 *
 * @param token - JWT 字符串
 * @returns 解析后的 JWT Payload
 * @throws AppError UNAUTHORIZED - Token 无效或已过期
 *
 * @example
 * ```typescript
 * const payload = await verifyJWT(token);
 * console.log(payload.userId); // "user-123"
 * ```
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    // 将密钥字符串转换为 Uint8Array
    const secret = new TextEncoder().encode(JWT_SECRET);

    // 验证并解析 JWT
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });

    return payload as JWTPayload;
  } catch (error) {
    throw new AppError(
      "UNAUTHORIZED",
      "登录已过期或无效，请重新登录",
      error,
    );
  }
}

/**
 * 解析过期时间字符串（支持 "7d", "24h", "60m" 等格式）
 *
 * @param timeString - 时间字符串（如 "7d", "24h"）
 * @returns 秒数
 */
function parseExpireTime(timeString: string): number {
  const regex = /^(\d+)([dhms])$/;
  const match = timeString.match(regex);

  if (!match) {
    throw new Error(`无效的过期时间格式: ${timeString}`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60; // 天 → 秒
    case "h":
      return value * 60 * 60; // 小时 → 秒
    case "m":
      return value * 60; // 分钟 → 秒
    case "s":
      return value; // 秒
    default:
      throw new Error(`不支持的时间单位: ${unit}`);
  }
}

// ============================================
// Cookie 工具函数
// ============================================

/**
 * 从请求的 Cookie 中获取当前用户 ID
 *
 * @returns 当前用户 ID
 * @throws AppError UNAUTHORIZED - 用户未登录或 Token 无效
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
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    throw new AppError("UNAUTHORIZED", "用户未登录，请先登录");
  }

  const payload = await verifyJWT(token);
  return payload.userId;
}

/**
 * 从请求的 Cookie 中获取当前用户完整信息
 *
 * @returns JWT Payload（包含 userId 和 email）
 * @throws AppError UNAUTHORIZED - 用户未登录或 Token 无效
 *
 * @example
 * ```typescript
 * const user = await getCurrentUser();
 * console.log(user.email); // "user@example.com"
 * ```
 */
export async function getCurrentUser(): Promise<JWTPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    throw new AppError("UNAUTHORIZED", "用户未登录，请先登录");
  }

  return await verifyJWT(token);
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
