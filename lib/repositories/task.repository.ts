/**
 * Task Repository - 数据访问层
 *
 * 职责：
 * - 任务的 CRUD 操作
 * - 任务查询和状态更新
 * - 不包含业务逻辑
 */

import type { Task, TaskStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ============================================
// 查询操作
// ============================================

/**
 * 根据 ID 查询任务（包含关联数据）
 */
export async function findTaskById(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      images: {
        orderBy: { index: "asc" },
      },
      models: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * 查询用户的任务列表
 */
export async function findTasksByUserId(
  userId: string,
  options?: {
    status?: TaskStatus;
    limit?: number;
    offset?: number;
  },
) {
  const { status, limit = 20, offset = 0 } = options || {};

  return prisma.task.findMany({
    where: {
      userId,
      ...(status && { status }),
    },
    include: {
      images: {
        orderBy: { index: "asc" },
      },
      models: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });
}

/**
 * 查询特定状态的任务（用于 Worker）
 */
export async function findTasksByStatus(
  status: TaskStatus,
  options?: {
    excludeIds?: string[];
    limit?: number;
  },
) {
  const { excludeIds = [], limit = 10 } = options || {};

  return prisma.task.findMany({
    where: {
      status,
      ...(excludeIds.length > 0 && {
        id: { notIn: excludeIds },
      }),
    },
    include: {
      images: { orderBy: { index: "asc" } },
      models: { orderBy: { createdAt: "desc" } },
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: limit,
  });
}

// ============================================
// 创建操作
// ============================================

/**
 * 创建任务
 */
export async function createTask(data: {
  userId: string;
  prompt: string;
  status?: TaskStatus;
}): Promise<Task> {
  return prisma.task.create({
    data: {
      userId: data.userId,
      prompt: data.prompt,
      status: data.status || "IMAGE_PENDING",
    },
  });
}

// ============================================
// 更新操作
// ============================================

/**
 * 更新任务
 */
export async function updateTask(
  taskId: string,
  data: Prisma.TaskUpdateInput,
): Promise<Task> {
  return prisma.task.update({
    where: { id: taskId },
    data,
  });
}

/**
 * 更新任务状态
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  additionalData?: Partial<Prisma.TaskUpdateInput>,
): Promise<Task> {
  return prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      ...additionalData,
    },
  });
}

// ============================================
// 删除操作
// ============================================

/**
 * 删除任务
 */
export async function deleteTask(taskId: string): Promise<void> {
  await prisma.task.delete({
    where: { id: taskId },
  });
}
