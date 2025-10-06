/**
 * 任务管理服务
 * 职责：任务的CRUD操作、状态管理、业务逻辑验证
 * 原则：函数式编程，纯函数优先，使用统一错误处理
 */
import { prisma } from "@/lib/db/prisma";
import { LocalStorage } from "@/lib/providers/storage";
import { AppError } from "@/lib/utils/errors";
import { TaskStatus } from "@prisma/client";
import { IMAGE_GENERATION } from "@/lib/constants";
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
  },
) {
  // 验证任务存在
  await getTaskById(taskId);

  // 参数已在外层API路由验证，但为了服务层的独立性，我们也进行基本验证
  // 验证选中图片索引范围（如果提供了该字段）
  if (data.selectedImageIndex !== undefined && (data.selectedImageIndex < 0 || data.selectedImageIndex > 3)) {
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
    throw new AppError(
      "INVALID_STATE",
      `任务状态不允许取消: ${task.status}`,
      { currentStatus: task.status, allowedStatuses: cancellableStatuses },
    );
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
