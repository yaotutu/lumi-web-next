/**
 * Auth Service
 * 职责：认证相关的业务逻辑
 *
 * 功能：
 * - 发送验证码（创建验证码记录）
 * - 验证验证码并登录（创建/更新用户）
 * - 获取用户信息
 *
 * 依赖：
 * - Repository 层：用户和验证码 CRUD
 * - Utils 层：Cookie 会话管理
 */

import {
  createVerificationCode,
  findLatestValidCode,
  markCodeAsVerified,
} from "@/lib/repositories/email-verification.repository";
import {
  createUser,
  findUserByEmail,
  updateLastLoginAt,
} from "@/lib/repositories/user.repository";
import { AppError } from "@/lib/utils/errors";
import type { User } from "@prisma/client";

/**
 * 验证码有效期（默认 5 分钟，单位：秒）
 */
const CODE_EXPIRES_IN = Number.parseInt(
  process.env.EMAIL_CODE_EXPIRES_IN || "300",
  10,
);

/**
 * 硬编码的验证码（开发环境）
 */
const HARDCODED_CODE = "0000";

/**
 * 发送验证码（创建验证码记录）
 *
 * **开发环境实现**：
 * - 验证码硬编码为 "0000"
 * - 不真实发送邮件
 * - 只在数据库中创建记录
 *
 * **未来实现**：
 * - 生成随机 4 位数字验证码
 * - 调用邮件服务发送验证码
 *
 * @param email - 用户邮箱
 * @returns 验证码记录 ID
 * @throws AppError VALIDATION_ERROR - 邮箱格式错误
 *
 * @example
 * ```typescript
 * await sendVerificationCode("user@example.com");
 * // 用户会在邮箱中收到验证码（开发环境请使用 0000）
 * ```
 */
export async function sendVerificationCode(email: string): Promise<string> {
  // 检查是否存在未过期的验证码（防止频繁发送）
  const existingCode = await findLatestValidCode(email);
  if (existingCode) {
    const remainingTime = Math.floor(
      (existingCode.expiresAt.getTime() - Date.now()) / 1000,
    );
    throw new AppError(
      "VALIDATION_ERROR",
      `验证码已发送，请 ${remainingTime} 秒后再试`,
    );
  }

  // 计算过期时间
  const expiresAt = new Date(Date.now() + CODE_EXPIRES_IN * 1000);

  // 创建验证码记录（硬编码 0000）
  const codeRecord = await createVerificationCode({
    email,
    code: HARDCODED_CODE,
    expiresAt,
  });

  // TODO: 未来接入真实邮件服务
  // await sendEmail({
  //   to: email,
  //   subject: "Lumi 登录验证码",
  //   text: `您的验证码是：${code}，有效期 ${CODE_EXPIRES_IN / 60} 分钟`,
  // });

  return codeRecord.id;
}

/**
 * 验证验证码并登录
 *
 * 业务流程：
 * 1. 查询最新的有效验证码
 * 2. 验证验证码是否匹配
 * 3. 查询或创建用户
 * 4. 标记验证码为已使用
 * 5. 更新用户最后登录时间
 *
 * @param email - 用户邮箱
 * @param code - 验证码（4位数字）
 * @returns 用户对象
 * @throws AppError VALIDATION_ERROR - 验证码错误或已过期
 *
 * @example
 * ```typescript
 * const user = await verifyCodeAndLogin(
 *   "user@example.com",
 *   "0000"
 * );
 * // API 路由会调用 setUserCookie 设置会话
 * ```
 */
export async function verifyCodeAndLogin(
  email: string,
  code: string,
): Promise<User> {
  // 1. 查询最新的有效验证码
  const codeRecord = await findLatestValidCode(email);

  if (!codeRecord) {
    throw new AppError("VALIDATION_ERROR", "验证码不存在或已过期，请重新获取");
  }

  // 2. 验证验证码是否匹配
  if (codeRecord.code !== code) {
    throw new AppError("VALIDATION_ERROR", "验证码错误，请重新输入");
  }

  // 3. 查询或创建用户
  let user = await findUserByEmail(email);
  if (!user) {
    // 新用户：创建用户记录
    user = await createUser({ email });
  } else {
    // 老用户：更新最后登录时间
    user = await updateLastLoginAt(user.id);
  }

  // 4. 标记验证码为已使用
  await markCodeAsVerified(codeRecord.id);

  return user;
}

/**
 * 根据 ID 获取用户信息
 *
 * @param userId - 用户 ID
 * @returns 用户对象
 * @throws AppError NOT_FOUND - 用户不存在
 *
 * @example
 * ```typescript
 * const user = await getUserById("user-123");
 * console.log(user.email);
 * ```
 */
export async function getUserById(userId: string): Promise<User> {
  const { findUserById } = await import("@/lib/repositories/user.repository");
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError("NOT_FOUND", `用户不存在: ${userId}`);
  }

  return user;
}
