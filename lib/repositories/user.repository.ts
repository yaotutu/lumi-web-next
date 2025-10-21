/**
 * User Repository
 * 职责：用户数据访问层（CRUD 操作）
 *
 * 遵循 Repository 模式：
 * - 封装 Prisma 操作
 * - 不包含业务逻辑
 * - 统一命名规范：find*, create*, update*, delete*
 */

import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * 根据邮箱查询用户
 *
 * @param email - 用户邮箱
 * @returns 用户对象（如果存在），否则返回 null
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * 根据 ID 查询用户
 *
 * @param userId - 用户 ID
 * @returns 用户对象（如果存在），否则返回 null
 */
export async function findUserById(userId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

/**
 * 创建新用户
 *
 * @param data - 用户数据（email 必填，name 可选）
 * @returns 创建的用户对象
 */
export async function createUser(data: {
  email: string;
  name?: string;
}): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      lastLoginAt: new Date(), // 创建时设置为当前时间
    },
  });
}

/**
 * 更新用户的最后登录时间
 *
 * @param userId - 用户 ID
 * @returns 更新后的用户对象
 */
export async function updateLastLoginAt(userId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
    },
  });
}

/**
 * 更新用户信息
 *
 * @param userId - 用户 ID
 * @param data - 要更新的数据
 * @returns 更新后的用户对象
 */
export async function updateUser(
  userId: string,
  data: {
    name?: string;
    email?: string;
  },
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}
