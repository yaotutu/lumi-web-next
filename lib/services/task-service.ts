/**
 * 任务管理服务 - 业务逻辑层
 *
 * 职责：
 * - Task 实体的业务逻辑处理
 * - 任务状态管理、业务规则判断
 * - 调用 Repository 层进行数据访问
 *
 * 原则：
 * - 函数式编程，纯函数优先
 * - 使用统一错误处理
 * - 不直接操作数据库，通过 Repository 层
 */

import type { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createStorageProvider } from "@/lib/providers/storage";
import { AppError } from "@/lib/utils/errors";
import {
  TaskRepository,
  TaskImageRepository,
  ModelRepository,
} from "@/lib/repositories";
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
  // 调用 Repository 层查询用户任务列表
  return TaskRepository.findTasksByUserId(userId, options);
}

/**
 * 根据ID获取任务详情
 * @param taskId 任务ID
 * @returns 任务详情
 * @throws AppError NOT_FOUND - 任务不存在
 */
export async function getTaskById(taskId: string) {
  // 调用 Repository 层查询任务
  const task = await TaskRepository.findTaskById(taskId);

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
 * @returns 创建的任务对象（包含关联的 images 和 models）
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

  // 调用 Repository 层创建任务
  const task = await TaskRepository.createTask({
    userId,
    prompt: trimmedPrompt,
    status: "IMAGE_PENDING", // 默认状态为图片等待生成
  });

  // 查询完整的任务对象（包含关联数据）
  return getTaskById(task.id);
}

/**
 * 创建新任务并指定初始状态
 * @param userId 用户ID
 * @param prompt 文本提示词（已验证）
 * @param status 初始状态
 * @returns 创建的任务对象（包含关联的 images 和 models）
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

  // 调用 Repository 层创建任务
  const task = await TaskRepository.createTask({
    userId,
    prompt: trimmedPrompt,
    status,
  });

  // 查询完整的任务对象（包含关联数据）
  return getTaskById(task.id);
}

/**
 * 更新任务信息
 * @param taskId 任务ID
 * @param data 要更新的数据（已验证）
 * @returns 更新后的任务对象（包含关联的 images 和 models）
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

  // 调用 Repository 层更新任务
  await TaskRepository.updateTask(taskId, data);

  // 查询并返回完整的任务对象（包含关联数据）
  return getTaskById(taskId);
}

/**
 * 删除任务及其所有资源（图片、模型文件）
 * @param taskId 任务ID
 * @throws AppError NOT_FOUND - 任务不存在
 */
export async function deleteTask(taskId: string) {
  // 验证任务存在
  await getTaskById(taskId);

  // 删除文件资源（图片和模型）
  const storageProvider = createStorageProvider();
  await storageProvider.deleteTaskResources(taskId);

  // 调用 Repository 层删除数据库记录（级联删除 images 和 model）
  await TaskRepository.deleteTask(taskId);
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
  const cancellableStatuses: TaskStatus[] = [
    "IMAGE_PENDING",
    "IMAGE_GENERATING",
    "MODEL_PENDING",
    "MODEL_GENERATING",
  ];
  if (!cancellableStatuses.includes(task.status)) {
    throw new AppError("INVALID_STATE", `任务状态不允许取消: ${task.status}`, {
      currentStatus: task.status,
      allowedStatuses: cancellableStatuses,
    });
  }

  // 调用 Repository 层更新任务状态为失败，并记录取消原因
  await TaskRepository.updateTask(taskId, {
    status: "FAILED",
    failedAt: new Date(),
    errorMessage: "用户取消",
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
  // 注意：对于涉及多表操作的复杂事务，在 Service 层使用 prisma.$transaction 是合理的
  const updatedTask = await prisma.$transaction(async (tx) => {
    // 1. 删除旧的图片记录
    await tx.taskImage.deleteMany({
      where: { taskId },
    });

    // 2. 删除旧的模型记录（如果有）
    await tx.model.deleteMany({
      where: { taskId },
    });

    // 3. 重置任务状态为IMAGE_PENDING
    const resetTask = await tx.task.update({
      where: { id: taskId },
      data: {
        status: "IMAGE_PENDING", // 重置为图片等待生成
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
        models: true,
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
  // 注意：对于涉及多表操作的复杂事务，在 Service 层使用 prisma.$transaction 是合理的
  const updatedTask = await prisma.$transaction(async (tx) => {
    // 1. 删除旧的模型记录
    await tx.model.deleteMany({
      where: { taskId },
    });

    // 2. 重置任务状态为MODEL_PENDING（保留图片记录和selectedImageIndex）
    const resetTask = await tx.task.update({
      where: { id: taskId },
      data: {
        status: "MODEL_PENDING", // 重置为模型等待生成
        modelGenerationStartedAt: null,
        modelGenerationCompletedAt: null,
        failedAt: null,
        errorMessage: null,
        completedAt: null,
      },
      include: {
        images: true,
        models: true,
      },
    });

    return resetTask;
  });

  return updatedTask;
}

/**
 * 更新模型的 sliceTaskId（打印服务返回的切片任务ID）
 * @param taskId 任务ID
 * @param sliceTaskId 切片任务ID
 * @returns 更新后的任务模型
 * @throws AppError NOT_FOUND - 任务或模型不存在
 */
export async function updateModelSliceTaskId(
  taskId: string,
  sliceTaskId: string,
) {
  // 调用 Repository 层查询任务（需要包含 models）
  const task = await TaskRepository.findTaskById(taskId);

  // 验证任务存在
  if (!task) {
    throw new AppError("NOT_FOUND", `任务不存在: ${taskId}`);
  }

  // 验证模型存在（获取最新的已完成模型）
  const latestModel = task.models.find(
    (m) => m.generationStatus === "COMPLETED",
  );
  if (!latestModel) {
    throw new AppError("NOT_FOUND", `任务 ${taskId} 没有已完成的模型`);
  }

  // 调用 Repository 层更新模型的 sliceTaskId
  const updatedModel = await ModelRepository.updateModel(latestModel.id, {
    sliceTaskId,
  });

  return updatedModel;
}
