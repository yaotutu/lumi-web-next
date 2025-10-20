/**
 * 图片和模型管理服务 - 业务逻辑层
 *
 * 职责：
 * - 处理任务相关的图片和模型记录
 * - TaskImage 和 Model 实体的业务逻辑处理
 * - 调用 Repository 层进行数据访问
 *
 * 原则：
 * - 函数式编程，纯函数优先
 * - 使用统一错误处理
 * - 不直接操作数据库，通过 Repository 层
 */

import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/utils/errors";
import {
  TaskRepository,
  TaskImageRepository,
  ModelRepository,
} from "@/lib/repositories";
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
 * @throws AppError INVALID_STATE - 图片记录已存在
 */
export async function addImageToTask(taskId: string, imageData: AddImageInput) {
  // 参数已在外层API路由验证，直接使用

  // 验证任务存在
  const task = await TaskRepository.findTaskById(taskId);

  if (!task) {
    throw new AppError("NOT_FOUND", `任务不存在: ${taskId}`);
  }

  try {
    // 调用 Repository 层创建图片记录
    const image = await TaskImageRepository.createImage({
      task: { connect: { id: taskId } },
      url: imageData.url,
      index: imageData.index,
      providerTaskId: imageData.providerTaskId,
      providerRequestId: imageData.providerRequestId,
    });

    return image;
  } catch (error) {
    // 检查是否是唯一约束违反错误
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // 检查是否是 taskId + index 的唯一约束违反
        const targetFields = error.meta?.target as string[] | undefined;
        if (
          targetFields?.includes("taskId") &&
          targetFields?.includes("index")
        ) {
          throw new AppError(
            "INVALID_STATE",
            `任务 ${taskId} 的图片索引 ${imageData.index} 已存在`,
          );
        }
      }
    }
    // 重新抛出其他错误
    throw error;
  }
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
  const task = await TaskRepository.findTaskById(taskId);

  if (!task) {
    throw new AppError("NOT_FOUND", `任务不存在: ${taskId}`);
  }

  // 调用 Repository 层创建模型记录
  const model = await ModelRepository.createAIGeneratedModel({
    userId: task.userId,
    taskId,
    name: modelData.name.trim(),
    prompt: "", // 这里没有提供 prompt，使用空字符串
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
    generationStatus: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
    progress: number;
    modelUrl?: string;
    errorMessage?: string;
  }>,
) {
  // 调用 Repository 层查找该任务的所有模型
  const models = await ModelRepository.findModelsByTaskId(taskId);

  // 获取最新的模型（按创建时间倒序，取第一个）
  const existingModel = models[0];

  if (!existingModel) {
    throw new AppError("NOT_FOUND", "模型记录不存在");
  }

  // 调用 Repository 层更新模型记录
  const model = await ModelRepository.updateModel(existingModel.id, modelData);

  return model;
}
