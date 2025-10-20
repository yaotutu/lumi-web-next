/**
 * 模型管理服务 - 业务逻辑层
 *
 * 职责：
 * - Model 实体的业务逻辑处理
 * - 权限验证、业务规则判断
 * - 调用 Repository 层进行数据访问
 *
 * 原则：
 * - 函数式编程，纯函数优先
 * - 使用统一错误处理
 * - 不直接操作数据库，通过 Repository 层
 *
 * 分为两大类方法：
 * 1. 用户 API 方法：listUserModels、getModelById、createUploadedModel 等
 * 2. Worker 方法：createAIGeneratedModel、updateModelProgress、markModelCompleted 等
 */

import type {
  ModelSource,
  ModelVisibility,
  ModelGenerationStatus,
} from "@prisma/client";
import { AppError } from "@/lib/utils/errors";
import { ModelRepository } from "@/lib/repositories";
// Service层不再进行Zod验证，验证在API路由层完成

/**
 * 获取用户的模型列表
 * @param userId 用户ID
 * @param options 查询选项（来源筛选、可见性筛选、分页）
 * @returns 模型列表
 */
export async function listUserModels(
  userId: string,
  options?: {
    source?: ModelSource;
    visibility?: ModelVisibility;
    limit?: number;
    offset?: number;
  },
) {
  // 调用 Repository 层查询用户模型
  return ModelRepository.findModelsByUserId(userId, options);
}

/**
 * 获取公开模型列表（模型广场）
 * @param options 查询选项（排序方式、分页）
 * @returns 公开模型列表
 */
export async function listPublicModels(options?: {
  sortBy?: "recent" | "popular"; // 按时间或热度排序
  limit?: number;
  offset?: number;
}) {
  // 调用 Repository 层查询公开模型
  return ModelRepository.findPublicModels(options);
}

/**
 * 根据ID获取模型详情
 * @param modelId 模型ID
 * @param userId 当前用户ID（可选，用于权限验证）
 * @returns 模型详情
 * @throws AppError NOT_FOUND - 模型不存在
 * @throws AppError FORBIDDEN - 无权访问私有模型
 */
export async function getModelById(modelId: string, userId?: string) {
  // 查询模型
  const model = await ModelRepository.findModelById(modelId);

  // 验证模型存在
  if (!model) {
    throw new AppError("NOT_FOUND", `模型不存在: ${modelId}`);
  }

  // 权限验证：私有模型只能由创建者访问
  if (model.visibility === "PRIVATE" && model.userId !== userId) {
    throw new AppError("FORBIDDEN", "无权访问此私有模型");
  }

  // 增加浏览次数（仅公开模型且非创建者访问时）
  if (model.visibility === "PUBLIC" && model.userId !== userId) {
    await ModelRepository.incrementViewCount(modelId);
  }

  return model;
}

/**
 * 创建用户上传的模型
 * @param userId 用户ID
 * @param modelData 模型数据（已验证）
 * @returns 创建的模型记录
 */
export async function createUploadedModel(
  userId: string,
  modelData: {
    name: string;
    description?: string;
    modelUrl: string;
    previewImageUrl?: string;
    format?: string;
    fileSize?: number;
    visibility?: ModelVisibility;
  },
) {
  // 调用 Repository 层创建模型
  return ModelRepository.createUploadedModel({
    user: { connect: { id: userId } },
    source: "USER_UPLOADED",
    name: modelData.name.trim(),
    description: modelData.description?.trim(),
    modelUrl: modelData.modelUrl,
    previewImageUrl: modelData.previewImageUrl,
    format: modelData.format || "OBJ",
    fileSize: modelData.fileSize,
    visibility: modelData.visibility || "PRIVATE",
    // 用户上传的模型立即完成
    completedAt: new Date(),
  });
}

/**
 * 更新模型信息
 * @param modelId 模型ID
 * @param userId 用户ID（用于权限验证）
 * @param updateData 要更新的数据（已验证）
 * @returns 更新后的模型记录
 * @throws AppError NOT_FOUND - 模型不存在
 * @throws AppError FORBIDDEN - 无权修改此模型
 */
export async function updateModel(
  modelId: string,
  userId: string,
  updateData: {
    name?: string;
    description?: string | null;
    visibility?: ModelVisibility;
  },
) {
  // 验证模型存在且用户有权限
  const existingModel = await ModelRepository.findModelById(modelId);

  if (!existingModel) {
    throw new AppError("NOT_FOUND", `模型不存在: ${modelId}`);
  }

  if (existingModel.userId !== userId) {
    throw new AppError("FORBIDDEN", "无权修改此模型");
  }

  // 准备更新数据
  const updatePayload: Record<string, unknown> = {};

  if (updateData.name !== undefined) {
    updatePayload.name = updateData.name.trim();
  }

  if (updateData.description !== undefined) {
    updatePayload.description = updateData.description?.trim() || null;
  }

  if (updateData.visibility !== undefined) {
    updatePayload.visibility = updateData.visibility;

    // 如果从私有改为公开，记录发布时间
    if (
      updateData.visibility === "PUBLIC" &&
      existingModel.visibility === "PRIVATE"
    ) {
      updatePayload.publishedAt = new Date();
    }
  }

  // 调用 Repository 层更新模型
  return ModelRepository.updateModel(modelId, updatePayload);
}

/**
 * 删除模型
 * @param modelId 模型ID
 * @param userId 用户ID（用于权限验证）
 * @throws AppError NOT_FOUND - 模型不存在
 * @throws AppError FORBIDDEN - 无权删除此模型
 */
export async function deleteModel(modelId: string, userId: string) {
  // 验证模型存在且用户有权限
  const existingModel = await ModelRepository.findModelById(modelId);

  if (!existingModel) {
    throw new AppError("NOT_FOUND", `模型不存在: ${modelId}`);
  }

  if (existingModel.userId !== userId) {
    throw new AppError("FORBIDDEN", "无权删除此模型");
  }

  // 删除数据库记录
  await ModelRepository.deleteModel(modelId);

  // TODO: 删除存储中的文件（modelUrl, previewImageUrl）
  // 需要调用 StorageProvider.deleteFile()
}

/**
 * 增加模型下载次数
 * @param modelId 模型ID
 */
export async function incrementDownloadCount(modelId: string) {
  await ModelRepository.incrementDownloadCount(modelId);
}

/**
 * 点赞/取消点赞模型（预留功能）
 * @param modelId 模型ID
 * @param increment 增加还是减少（1 或 -1）
 */
export async function updateLikeCount(modelId: string, increment: 1 | -1) {
  await ModelRepository.updateLikeCount(modelId, increment);
}

/**
 * 获取用户的模型统计
 * @param userId 用户ID
 * @returns 统计数据
 */
export async function getUserModelStats(userId: string) {
  // 查询用户的所有模型（用于统计）
  const models = await ModelRepository.findAllModelsByUserId(userId);

  // 统计数据
  const stats = {
    total: models.length,
    aiGenerated: models.filter((m) => m.source === "AI_GENERATED").length,
    userUploaded: models.filter((m) => m.source === "USER_UPLOADED").length,
    publicModels: models.filter((m) => m.visibility === "PUBLIC").length,
    privateModels: models.filter((m) => m.visibility === "PRIVATE").length,
    totalViews: models.reduce((sum, m) => sum + m.viewCount, 0),
    totalLikes: models.reduce((sum, m) => sum + m.likeCount, 0),
    totalDownloads: models.reduce((sum, m) => sum + m.downloadCount, 0),
  };

  return stats;
}

// ============================================
// Worker 方法：AI 生成模型的生命周期管理
// ============================================

/**
 * 创建 AI 生成的模型记录（Worker 专用）
 * @param userId 用户ID
 * @param taskId 任务ID
 * @param modelData 模型初始数据
 * @returns 创建的模型记录
 */
export async function createAIGeneratedModel(
  userId: string,
  taskId: string,
  modelData: {
    name: string;
    prompt: string;
  },
) {
  // 调用 Repository 层创建 AI 生成的模型
  return ModelRepository.createAIGeneratedModel({
    userId,
    taskId,
    name: modelData.name,
    prompt: modelData.prompt,
  });
}

/**
 * 更新模型的 Provider 任务 ID（Worker 专用）
 * @param modelId 模型ID
 * @param providerJobId Provider 任务 ID
 * @param providerRequestId Provider 请求 ID（可选）
 */
export async function updateModelProviderJobId(
  modelId: string,
  providerJobId: string,
  providerRequestId?: string,
) {
  // 准备更新数据
  const updateData: Record<string, unknown> = { providerJobId };
  if (providerRequestId) {
    updateData.providerRequestId = providerRequestId;
  }

  // 调用 Repository 层更新模型
  await ModelRepository.updateModel(modelId, updateData);
}

/**
 * 更新模型生成状态和进度（Worker 专用）
 * @param modelId 模型ID
 * @param generationStatus 生成状态
 * @param progress 进度百分比（0-100）
 */
export async function updateModelProgress(
  modelId: string,
  generationStatus: ModelGenerationStatus,
  progress: number,
) {
  // 调用 Repository 层更新模型状态和进度
  await ModelRepository.updateModel(modelId, {
    generationStatus,
    progress,
  });
}

/**
 * 标记模型生成完成（Worker 专用）
 * @param modelId 模型ID
 * @param resultData 生成结果数据
 */
export async function markModelCompleted(
  modelId: string,
  resultData: {
    modelUrl: string;
    previewImageUrl?: string;
    format?: string;
  },
) {
  // 调用 Repository 层更新模型为完成状态
  await ModelRepository.updateModel(modelId, {
    generationStatus: "COMPLETED",
    progress: 100,
    modelUrl: resultData.modelUrl,
    previewImageUrl: resultData.previewImageUrl,
    format: resultData.format,
    completedAt: new Date(),
  });
}

/**
 * 标记模型生成失败（Worker 专用）
 * @param modelId 模型ID
 * @param errorMessage 错误信息
 */
export async function markModelFailed(
  modelId: string,
  errorMessage: string,
) {
  // 调用 Repository 层更新模型为失败状态
  await ModelRepository.updateModel(modelId, {
    generationStatus: "FAILED",
    failedAt: new Date(),
    errorMessage,
  });
}

/**
 * 获取任务关联的所有模型（Worker 专用）
 * @param taskId 任务ID
 * @returns 模型列表
 */
export async function getModelsByTaskId(taskId: string) {
  // 调用 Repository 层查询任务关联的模型
  return ModelRepository.findModelsByTaskId(taskId);
}

/**
 * 检查任务是否有正在生成中的模型（Worker 专用）
 * @param taskId 任务ID
 * @returns 是否存在生成中的模型
 */
export async function hasGeneratingModel(taskId: string): Promise<boolean> {
  // 调用 Repository 层统计生成中的模型数量
  const count = await ModelRepository.countGeneratingModelsByTaskId(taskId);
  return count > 0;
}
