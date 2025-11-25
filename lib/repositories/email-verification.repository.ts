/**
 * EmailVerificationCode Repository
 * 职责：邮箱验证码数据访问层（CRUD 操作）
 *
 * 遵循 Repository 模式：
 * - 封装 Prisma 操作
 * - 不包含业务逻辑
 * - 统一命名规范：find*, create*, update*, delete*
 */

import type { EmailVerificationCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * 创建验证码记录
 *
 * @param data - 验证码数据
 * @returns 创建的验证码对象
 */
export async function createVerificationCode(data: {
  email: string;
  code: string;
  expiresAt: Date;
  userId?: string;
}): Promise<EmailVerificationCode> {
  return prisma.emailVerificationCode.create({
    data: {
      email: data.email,
      code: data.code,
      expiresAt: data.expiresAt,
      userId: data.userId,
    },
  });
}

/**
 * 查询最新的未验证验证码（按创建时间倒序）
 *
 * @param email - 用户邮箱
 * @returns 最新的未验证验证码（如果存在），否则返回 null
 */
export async function findLatestUnverifiedCode(
  email: string,
): Promise<EmailVerificationCode | null> {
  return prisma.emailVerificationCode.findFirst({
    where: {
      email,
      verifiedAt: null, // 未验证
    },
    orderBy: {
      createdAt: "desc", // 按创建时间倒序
    },
  });
}

/**
 * 查询最新的有效验证码（未过期且未验证）
 *
 * @param email - 用户邮箱
 * @returns 最新的有效验证码（如果存在），否则返回 null
 */
export async function findLatestValidCode(
  email: string,
): Promise<EmailVerificationCode | null> {
  const now = new Date();
  return prisma.emailVerificationCode.findFirst({
    where: {
      email,
      verifiedAt: null, // 未验证
      expiresAt: {
        gt: now, // 未过期
      },
    },
    orderBy: {
      createdAt: "desc", // 按创建时间倒序
    },
  });
}

/**
 * 标记验证码为已验证
 *
 * @param codeId - 验证码 ID
 * @returns 更新后的验证码对象
 */
export async function markCodeAsVerified(
  codeId: string,
): Promise<EmailVerificationCode> {
  return prisma.emailVerificationCode.update({
    where: { id: codeId },
    data: {
      verifiedAt: new Date(),
    },
  });
}

/**
 * 删除指定邮箱的所有验证码（清理操作）
 *
 * @param email - 用户邮箱
 * @returns 删除的记录数
 */
export async function deleteCodesByEmail(email: string): Promise<number> {
  const result = await prisma.emailVerificationCode.deleteMany({
    where: { email },
  });
  return result.count;
}

/**
 * 删除过期的验证码（定期清理任务）
 *
 * @returns 删除的记录数
 */
export async function deleteExpiredCodes(): Promise<number> {
  const now = new Date();
  const result = await prisma.emailVerificationCode.deleteMany({
    where: {
      expiresAt: {
        lt: now, // 已过期
      },
    },
  });
  return result.count;
}
