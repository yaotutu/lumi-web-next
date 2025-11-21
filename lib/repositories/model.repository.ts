/**
 * Model Repository - 数据访问层
 *
 * 职责：
 * - Model 的 CRUD 操作（统一管理 AI 生成和用户上传的模型）
 * - 查询用户的模型、公开模型
 * - 不包含业务逻辑
 */

import type {
  Model,
  Prisma,
  ModelSource,
  ModelVisibility,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ============================================
// 查询操作
// ============================================

/**
 * 根据 ID 查询 Model（包含关联数据）
 */
export async function findModelById(modelId: string) {
  return prisma.model.findUnique({
    where: { id: modelId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      request: {
        select: {
          id: true,
          prompt: true,
          status: true,
          phase: true,
        },
      },
      sourceImage: {
        select: {
          id: true,
          imageUrl: true,
          index: true,
          imagePrompt: true,
        },
      },
      generationJob: {
        select: {
          id: true,
          status: true,
          progress: true,
          retryCount: true,
          providerJobId: true,
        },
      },
    },
  });
}

/**
 * 根据 requestId 查询 Model（1:1 关系）
 */
export async function findModelByRequestId(requestId: string) {
  return prisma.model.findUnique({
    where: { requestId },
    include: {
      sourceImage: true,
      generationJob: {
        select: {
          id: true,
          status: true,
          progress: true,
        },
      },
    },
  });
}

/**
 * 根据源图片 ID 查询 Model（1:1 关系）
 */
export async function findModelBySourceImageId(sourceImageId: string) {
  return prisma.model.findUnique({
    where: { sourceImageId },
    include: {
      request: true,
      sourceImage: true,
      generationJob: true,
    },
  });
}

/**
 * 查询用户的所有模型
 */
export async function findModelsByUserId(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    source?: ModelSource;
  },
) {
  const { limit = 20, offset = 0, source } = options || {};

  return prisma.model.findMany({
    where: {
      userId,
      ...(source && { source }),
    },
    include: {
      sourceImage: {
        select: {
          id: true,
          imageUrl: true,
          index: true,
        },
      },
      generationJob: {
        select: {
          id: true,
          status: true,
          progress: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * 查询公开模型（模型广场）
 */
export async function findPublicModels(options?: {
  limit?: number;
  offset?: number;
  orderBy?: "latest" | "popular";
}) {
  const { limit = 20, offset = 0, orderBy = "latest" } = options || {};

  return prisma.model.findMany({
    where: {
      visibility: "PUBLIC",
      completedAt: { not: null }, // 只显示已完成的模型
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      sourceImage: {
        select: {
          imageUrl: true,
        },
      },
    },
    orderBy:
      orderBy === "popular" ? { likeCount: "desc" } : { publishedAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * 统计公开模型数量
 */
export async function countPublicModels(): Promise<number> {
  return prisma.model.count({
    where: {
      visibility: "PUBLIC",
      completedAt: { not: null },
    },
  });
}

// ============================================
// 创建操作
// ============================================

/**
 * 创建 Model 和 ModelGenerationJob（事务）- AI 生成模型
 */
export async function createModelWithJob(data: {
  userId: string;
  requestId: string;
  sourceImageId: string;
  name: string;
  previewImageUrl?: string;
}): Promise<{ model: Model; jobId: string }> {
  const result = await prisma.$transaction(async (tx) => {
    // 1. 创建 Model
    const model = await tx.model.create({
      data: {
        userId: data.userId,
        requestId: data.requestId,
        sourceImageId: data.sourceImageId,
        name: data.name,
        previewImageUrl: data.previewImageUrl,
        source: "AI_GENERATED",
        format: "OBJ",
      },
    });

    // 2. 创建 ModelGenerationJob
    const job = await tx.modelGenerationJob.create({
      data: {
        modelId: model.id,
        status: "PENDING",
        priority: 0,
      },
    });

    return { model, jobId: job.id };
  });

  return result;
}

/**
 * 创建用户上传的模型（无 Job）
 */
export async function createUploadedModel(data: {
  userId: string;
  name: string;
  description?: string;
  modelUrl: string;
  previewImageUrl?: string;
  format: string;
  fileSize?: number;
}): Promise<Model> {
  return prisma.model.create({
    data: {
      userId: data.userId,
      name: data.name,
      description: data.description,
      modelUrl: data.modelUrl,
      previewImageUrl: data.previewImageUrl,
      format: data.format,
      fileSize: data.fileSize,
      source: "USER_UPLOADED",
      completedAt: new Date(), // 上传即完成
    },
  });
}

// ============================================
// 更新操作
// ============================================

/**
 * 更新 Model
 */
export async function updateModel(
  modelId: string,
  data: Prisma.ModelUpdateInput,
): Promise<Model> {
  return prisma.model.update({
    where: { id: modelId },
    data,
  });
}

/**
 * 标记模型为已完成
 */
export async function markModelCompleted(
  modelId: string,
  data: {
    modelUrl: string;
    previewImageUrl?: string;
    format: string;
    fileSize?: number;
  },
): Promise<Model> {
  return prisma.model.update({
    where: { id: modelId },
    data: {
      ...data,
      completedAt: new Date(),
      failedAt: null,
      errorMessage: null,
    },
  });
}

/**
 * 标记模型为失败
 */
export async function markModelFailed(
  modelId: string,
  errorMessage: string,
): Promise<Model> {
  return prisma.model.update({
    where: { id: modelId },
    data: {
      failedAt: new Date(),
      errorMessage,
    },
  });
}

/**
 * 发布模型到广场
 */
export async function publishModel(modelId: string): Promise<Model> {
  return prisma.model.update({
    where: { id: modelId },
    data: {
      visibility: "PUBLIC",
      publishedAt: new Date(),
    },
  });
}

/**
 * 取消发布模型
 */
export async function unpublishModel(modelId: string): Promise<Model> {
  return prisma.model.update({
    where: { id: modelId },
    data: {
      visibility: "PRIVATE",
      publishedAt: null,
    },
  });
}

/**
 * 增加统计计数
 */
export async function incrementModelCount(
  modelId: string,
  field: "viewCount" | "likeCount" | "favoriteCount" | "downloadCount",
): Promise<Model> {
  return prisma.model.update({
    where: { id: modelId },
    data: {
      [field]: { increment: 1 },
    },
  });
}

/**
 * 减少统计计数
 */
export async function decrementModelCount(
  modelId: string,
  field: "likeCount" | "favoriteCount",
): Promise<Model> {
  return prisma.model.update({
    where: { id: modelId },
    data: {
      [field]: { decrement: 1 },
    },
  });
}

// ============================================
// 删除操作
// ============================================

/**
 * 删除模型
 */
export async function deleteModel(modelId: string): Promise<void> {
  await prisma.model.delete({
    where: { id: modelId },
  });
}
