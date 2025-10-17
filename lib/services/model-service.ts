/**
 * 模型管理服务
 * 职责：Model 实体的 CRUD 操作、业务逻辑验证
 * 原则：函数式编程，纯函数优先，使用统一错误处理
 */

import type { ModelSource, ModelVisibility } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
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
  const { source, visibility, limit = 20, offset = 0 } = options || {};

  // 查询用户的模型，按创建时间倒序
  const models = await prisma.model.findMany({
    where: {
      userId,
      ...(source && { source }),
      ...(visibility && { visibility }),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });

  return models;
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
  const { sortBy = "recent", limit = 20, offset = 0 } = options || {};

  // 排序规则
  const orderBy =
    sortBy === "popular"
      ? { likeCount: "desc" as const }
      : { publishedAt: "desc" as const };

  // 查询公开模型
  const models = await prisma.model.findMany({
    where: {
      visibility: "PUBLIC",
      publishedAt: { not: null }, // 必须已发布
    },
    orderBy,
    take: limit,
    skip: offset,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return models;
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
  const model = await prisma.model.findUnique({
    where: { id: modelId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      task: {
        select: {
          id: true,
          prompt: true,
          createdAt: true,
        },
      },
    },
  });

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
    await prisma.model.update({
      where: { id: modelId },
      data: { viewCount: { increment: 1 } },
    });
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
  // 创建模型记录
  const model = await prisma.model.create({
    data: {
      userId,
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
    },
  });

  return model;
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
  const existingModel = await prisma.model.findUnique({
    where: { id: modelId },
  });

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

  // 更新模型记录
  const model = await prisma.model.update({
    where: { id: modelId },
    data: updatePayload,
  });

  return model;
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
  const existingModel = await prisma.model.findUnique({
    where: { id: modelId },
  });

  if (!existingModel) {
    throw new AppError("NOT_FOUND", `模型不存在: ${modelId}`);
  }

  if (existingModel.userId !== userId) {
    throw new AppError("FORBIDDEN", "无权删除此模型");
  }

  // 删除数据库记录
  await prisma.model.delete({
    where: { id: modelId },
  });

  // TODO: 删除存储中的文件（modelUrl, previewImageUrl）
  // 需要调用 StorageProvider.deleteFile()
}

/**
 * 增加模型下载次数
 * @param modelId 模型ID
 */
export async function incrementDownloadCount(modelId: string) {
  await prisma.model.update({
    where: { id: modelId },
    data: { downloadCount: { increment: 1 } },
  });
}

/**
 * 点赞/取消点赞模型（预留功能）
 * @param modelId 模型ID
 * @param increment 增加还是减少（1 或 -1）
 */
export async function updateLikeCount(modelId: string, increment: 1 | -1) {
  await prisma.model.update({
    where: { id: modelId },
    data: { likeCount: { increment } },
  });
}

/**
 * 获取用户的模型统计
 * @param userId 用户ID
 * @returns 统计数据
 */
export async function getUserModelStats(userId: string) {
  // 查询用户的所有模型
  const models = await prisma.model.findMany({
    where: { userId },
    select: {
      source: true,
      visibility: true,
      viewCount: true,
      likeCount: true,
      downloadCount: true,
    },
  });

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
