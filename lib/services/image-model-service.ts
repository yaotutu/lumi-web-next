/**
 * 图片和模型管理服务
 * 职责：处理任务相关的图片和模型记录
 * 原则：函数式编程，纯函数优先，使用统一错误处理和Zod验证
 */
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
// Service层不再进行Zod验证，验证在API路由层完成
// 类型定义保留在Service层以确保类型安全
import type {
  AddImageInput,
  CreateModelInput,
} from "@/lib/validators/task-validators";

/**
 * 添加图片记录到任务
 * @param taskId 任务ID
 * @param imageData 图片数据（已验证）
 * @returns 创建的图片记录
 * @throws AppError NOT_FOUND - 任务不存在
 */
export async function addImageToTask(
  taskId: string,
  imageData: AddImageInput,
) {
  // 参数已在外层API路由验证，直接使用

  // 验证任务存在
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new AppError("NOT_FOUND", `任务不存在: ${taskId}`);
  }

  // 创建图片记录
  const image = await prisma.taskImage.create({
    data: {
      taskId,
      url: imageData.url,
      index: imageData.index,
      aliyunTaskId: imageData.aliyunTaskId,
      aliyunRequestId: imageData.aliyunRequestId,
    },
  });

  return image;
}

/**
 * 创建3D模型记录
 * @param taskId 任务ID
 * @param modelData 模型数据（已验证）
 * @returns 创建的模型记录
 * @throws AppError NOT_FOUND - 任务不存在
 */
export async function createModelForTask(
  taskId: string,
  modelData: CreateModelInput,
) {
  // 参数已在外层API路由验证，直接使用

  // 验证任务存在
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new AppError("NOT_FOUND", `任务不存在: ${taskId}`);
  }

  // 创建模型记录
  const model = await prisma.taskModel.create({
    data: {
      taskId,
      name: modelData.name.trim(),
      status: "PENDING",
      progress: 0,
    },
  });

  return model;
}

/**
 * 更新3D模型记录
 * @param taskId 任务ID
 * @param modelData 模型更新数据
 * @returns 更新后的模型记录
 * @throws AppError NOT_FOUND - 任务或模型不存在
 */
export async function updateTaskModel(
  taskId: string,
  modelData: Partial<{
    status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
    progress: number;
    url?: string;
    errorMessage?: string;
  }>,
) {
  // 查找该任务的模型
  const existingModel = await prisma.taskModel.findUnique({
    where: { taskId },
  });

  if (!existingModel) {
    throw new AppError("NOT_FOUND", "模型记录不存在");
  }

  // 更新模型记录
  const model = await prisma.taskModel.update({
    where: { id: existingModel.id },
    data: modelData,
  });

  return model;
}