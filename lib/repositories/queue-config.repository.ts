/**
 * QueueConfig Repository - 数据访问层
 *
 * 职责：
 * - QueueConfig 的 CRUD 操作
 * - 查询队列配置
 * - 不包含业务逻辑
 */

import type { QueueConfig, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ============================================
// 查询操作
// ============================================

/**
 * 根据队列名称查询配置
 */
export async function findConfigByQueueName(queueName: string) {
  return prisma.queueConfig.findUnique({
    where: { queueName },
  });
}

/**
 * 查询所有队列配置
 */
export async function findAllConfigs() {
  return prisma.queueConfig.findMany({
    orderBy: {
      queueName: "asc",
    },
  });
}

// ============================================
// 创建操作
// ============================================

/**
 * 创建队列配置
 */
export async function createConfig(
  data: Prisma.QueueConfigCreateInput,
): Promise<QueueConfig> {
  return prisma.queueConfig.create({
    data,
  });
}

// ============================================
// 更新操作
// ============================================

/**
 * 更新队列配置
 */
export async function updateConfig(
  queueName: string,
  data: Prisma.QueueConfigUpdateInput,
): Promise<QueueConfig> {
  return prisma.queueConfig.update({
    where: { queueName },
    data,
  });
}

/**
 * 暂停队列
 */
export async function pauseQueue(
  queueName: string,
  updatedBy?: string,
): Promise<QueueConfig> {
  return prisma.queueConfig.update({
    where: { queueName },
    data: {
      isActive: false,
      updatedBy,
    },
  });
}

/**
 * 恢复队列
 */
export async function resumeQueue(
  queueName: string,
  updatedBy?: string,
): Promise<QueueConfig> {
  return prisma.queueConfig.update({
    where: { queueName },
    data: {
      isActive: true,
      updatedBy,
    },
  });
}

// ============================================
// 删除操作
// ============================================

/**
 * 删除队列配置
 */
export async function deleteConfig(queueName: string): Promise<void> {
  await prisma.queueConfig.delete({
    where: { queueName },
  });
}
