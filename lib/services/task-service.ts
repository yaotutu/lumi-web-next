/**
 * 任务管理服务
 * 职责：任务的CRUD操作、状态管理、业务逻辑验证
 * 原则：函数式编程，纯函数优先，使用统一错误处理
 */

import type { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { LocalStorage } from "@/lib/providers/storage";
import { AppError } from "@/lib/utils/errors";
// Service层不再进行Zod验证，验证在API路由层完成

/**
 * 获取任务列表
 * @param userId 用户ID
 * @param options 查询选项（状态筛选、分页限制）
 * @returns 任务列表（包含关联的图片和模型）
 */
export async function listTasks(
  userId: string,
  options?: {
    status?: TaskStatus;
    limit?: number;
  },
) {
  // 参数已在外层API路由验证，直接使用
  const { status, limit = 20 } = options || {};

  // 查询任务，包含关联的图片和模型
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(status && { status }),
    },
    include: {
      images: {
        orderBy: { index: "asc" },
      },
      model: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return tasks;
}

/**
 * 根据ID获取任务详情
 * @param taskId 任务ID
 * @returns 任务详情
 * @throws AppError NOT_FOUND - 任务不存在
 */
export async function getTaskById(taskId: string) {
  // 查询任务
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      images: {
        orderBy: { index: "asc" },
      },
      model: true,
    },
  });

  // 验证任务存在
  if (!task) {
    throw new AppError("NOT_FOUND", `任务不存在: ${taskId}`);
  }

  return task;
}

/**
 * 创建新任务
 * @param userId 用户ID
 * @param prompt 文本提示词（已验证）
 * @returns 创建的任务对象
 * @throws AppError VALIDATION_ERROR - 提示词验证失败
 */
export async function createTask(userId: string, prompt: string) {
  // 参数已在外层API路由验证，但为了服务层的独立性，我们也进行基本验证
  const trimmedPrompt = prompt.trim();

  // 验证提示词不为空
  if (trimmedPrompt.length === 0) {
    throw new AppError("VALIDATION_ERROR", "提示词不能为空");
  }

  // 验证提示词长度
  if (trimmedPrompt.length > 500) {
    throw new AppError("VALIDATION_ERROR", "提示词长度不能超过500个字符");
  }

  // 创建数据库记录
  const task = await prisma.task.create({
    data: {
      userId,
      prompt: trimmedPrompt,
      status: "PENDING",
    },
    include: {
      images: true,
      model: true,
    },
  });

  return task;
}

/**
 * 创建新任务并指定初始状态
 * @param userId 用户ID
 * @param prompt 文本提示词（已验证）
 * @param status 初始状态
 * @returns 创建的任务对象
 * @throws AppError VALIDATION_ERROR - 提示词验证失败
 */
export async function createTaskWithStatus(
  userId: string,
  prompt: string,
  status: TaskStatus,
) {
  // 参数已在外层API路由验证，但为了服务层的独立性，我们也进行基本验证
  const trimmedPrompt = prompt.trim();

  // 验证提示词不为空
  if (trimmedPrompt.length === 0) {
    throw new AppError("VALIDATION_ERROR", "提示词不能为空");
  }

  // 验证提示词长度
  if (trimmedPrompt.length > 500) {
    throw new AppError("VALIDATION_ERROR", "提示词长度不能超过500个字符");
  }

  // 创建数据库记录
  const task = await prisma.task.create({
    data: {
      userId,
      prompt: trimmedPrompt,
      status,
    },
    include: {
      images: true,
      model: true,
    },
  });

  return task;
}

/**
 * 更新任务信息
 * @param taskId 任务ID
 * @param data 要更新的数据（已验证）
 * @returns 更新后的任务对象
 * @throws AppError NOT_FOUND - 任务不存在
 * @throws AppError VALIDATION_ERROR - 数据验证失败
 */
export async function updateTask(
  taskId: string,
  data: {
    selectedImageIndex?: number;
    status?: TaskStatus;
    modelGenerationStartedAt?: Date | null;
    modelGenerationCompletedAt?: Date | null;
    completedAt?: Date | null;
    failedAt?: Date | null;
    errorMessage?: string | null;
  },
) {
  // 验证任务存在
  await getTaskById(taskId);

  // 参数已在外层API路由验证，但为了服务层的独立性，我们也进行基本验证
  // 验证选中图片索引范围（如果提供了该字段）
  if (
    data.selectedImageIndex !== undefined &&
    (data.selectedImageIndex < 0 || data.selectedImageIndex > 3)
  ) {
    throw new AppError("VALIDATION_ERROR", "选中图片索引必须在0-3之间");
  }

  // 更新数据库记录
  const task = await prisma.task.update({
    where: { id: taskId },
    data,
    include: {
      images: true,
      model: true,
    },
  });

  return task;
}

/**
 * 删除任务及其所有资源（图片、模型文件）
 * @param taskId 任务ID
 * @throws AppError NOT_FOUND - 任务不存在
 */
export async function deleteTask(taskId: string) {
  // 验证任务存在
  await getTaskById(taskId);

  // 删除本地文件资源（图片和模型）
  await LocalStorage.deleteTaskResources(taskId);

  // 删除数据库记录（级联删除images和model）
  await prisma.task.delete({
    where: { id: taskId },
  });
}

/**
 * 取消任务
 * 只能取消PENDING或GENERATING_IMAGES状态的任务
 * @param taskId 任务ID
 * @returns 取消前的任务对象
 * @throws AppError NOT_FOUND - 任务不存在
 * @throws AppError INVALID_STATE - 任务状态不允许取消
 */
export async function cancelTask(taskId: string) {
  // 获取任务当前状态
  const task = await getTaskById(taskId);

  // 验证状态：只能取消进行中的任务
  const cancellableStatuses: TaskStatus[] = ["PENDING", "GENERATING_IMAGES"];
  if (!cancellableStatuses.includes(task.status)) {
    throw new AppError("INVALID_STATE", `任务状态不允许取消: ${task.status}`, {
      currentStatus: task.status,
      allowedStatuses: cancellableStatuses,
    });
  }

  // 更新任务状态为失败，并记录取消原因
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      errorMessage: "用户取消",
    },
  });

  return task;
}

/**
 * 重试图片生成
 * 将失败的任务重置为PENDING状态，清理旧的图片记录
 * @param taskId 任务ID
 * @returns 重置后的任务对象
 * @throws AppError NOT_FOUND - 任务不存在
 * @throws AppError INVALID_STATE - 任务状态不允许重试
 */
export async function retryImageGeneration(taskId: string) {
  // 获取任务当前状态
  const task = await getTaskById(taskId);

  // 验证状态：只能重试失败的任务
  if (task.status !== "FAILED") {
    throw new AppError(
      "INVALID_STATE",
      `只有失败的任务才能重试图片生成，当前状态: ${task.status}`,
      {
        currentStatus: task.status,
      },
    );
  }

  // 事务：清理旧数据 + 重置任务状态
  const updatedTask = await prisma.$transaction(async (tx) => {
    // 1. 删除旧的图片记录
    await tx.taskImage.deleteMany({
      where: { taskId },
    });

    // 2. 删除旧的模型记录（如果有）
    await tx.taskModel.deleteMany({
      where: { taskId },
    });

    // 3. 重置任务状态为PENDING
    const resetTask = await tx.task.update({
      where: { id: taskId },
      data: {
        status: "PENDING",
        selectedImageIndex: null,
        imageGenerationStartedAt: null,
        imageGenerationCompletedAt: null,
        modelGenerationStartedAt: null,
        modelGenerationCompletedAt: null,
        failedAt: null,
        errorMessage: null,
        completedAt: null,
      },
      include: {
        images: true,
        model: true,
      },
    });

    return resetTask;
  });

  return updatedTask;
}

/**
 * 重试3D模型生成
 * 将失败的任务重置为IMAGES_READY状态，清理旧的模型记录
 * @param taskId 任务ID
 * @returns 重置后的任务对象
 * @throws AppError NOT_FOUND - 任务不存在
 * @throws AppError INVALID_STATE - 任务状态不允许重试或图片未生成
 */
export async function retryModelGeneration(taskId: string) {
  // 获取任务当前状态
  const task = await getTaskById(taskId);

  // 验证状态：只能重试失败的任务
  if (task.status !== "FAILED") {
    throw new AppError(
      "INVALID_STATE",
      `只有失败的任务才能重试模型生成，当前状态: ${task.status}`,
      {
        currentStatus: task.status,
      },
    );
  }

  // 验证必须有图片记录
  if (!task.images || task.images.length === 0) {
    throw new AppError("INVALID_STATE", "任务没有图片记录，无法重试3D模型生成");
  }

  // 验证必须已选择图片
  if (
    task.selectedImageIndex === null ||
    task.selectedImageIndex === undefined
  ) {
    throw new AppError("INVALID_STATE", "任务未选择图片，无法重试3D模型生成");
  }

  // 事务：清理旧模型 + 重置任务状态
  const updatedTask = await prisma.$transaction(async (tx) => {
    // 1. 删除旧的模型记录
    await tx.taskModel.deleteMany({
      where: { taskId },
    });

    // 2. 重置任务状态为IMAGES_READY（保留图片记录和selectedImageIndex）
    const resetTask = await tx.task.update({
      where: { id: taskId },
      data: {
        status: "IMAGES_READY",
        modelGenerationStartedAt: null,
        modelGenerationCompletedAt: null,
        failedAt: null,
        errorMessage: null,
        completedAt: null,
      },
      include: {
        images: true,
        model: true,
      },
    });

    return resetTask;
  });

  return updatedTask;
}
