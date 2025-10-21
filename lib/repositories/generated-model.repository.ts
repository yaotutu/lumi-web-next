/**
 * GeneratedModel Repository - 数据访问层
 *
 * 职责：
 * - GeneratedModel 的 CRUD 操作
 * - 查询请求关联的模型
 * - 不包含业务逻辑
 */

import type { GeneratedModel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ============================================
// 查询操作
// ============================================

/**
 * 根据 ID 查询 GeneratedModel
 */
export async function findModelById(modelId: string) {
  return prisma.generatedModel.findUnique({
    where: { id: modelId },
    include: {
      request: {
        select: {
          id: true,
          userId: true,
          prompt: true,
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
      userAsset: {
        select: {
          id: true,
          visibility: true,
          publishedAt: true,
        },
      },
    },
  });
}

/**
 * 查询请求的所有模型
 */
export async function findModelsByRequestId(requestId: string) {
  return prisma.generatedModel.findMany({
    where: { requestId },
    orderBy: { createdAt: "desc" },
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
          retryCount: true,
        },
      },
    },
  });
}

/**
 * 根据源图片 ID 查询模型
 */
export async function findModelBySourceImageId(sourceImageId: string) {
  return prisma.generatedModel.findUnique({
    where: { sourceImageId },
    include: {
      request: true,
      sourceImage: true,
      generationJob: true,
    },
  });
}

// ============================================
// 创建操作
// ============================================

/**
 * 创建 GeneratedModel 和 ModelGenerationJob（事务）
 */
export async function createModelWithJob(data: {
  requestId: string;
  sourceImageId: string;
  name: string;
}): Promise<{ model: GeneratedModel; jobId: string }> {
  const result = await prisma.$transaction(async (tx) => {
    // 1. 创建 GeneratedModel
    const model = await tx.generatedModel.create({
      data: {
        requestId: data.requestId,
        sourceImageId: data.sourceImageId,
        name: data.name,
        format: "OBJ", // 默认格式
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

// ============================================
// 更新操作
// ============================================

/**
 * 更新模型
 */
export async function updateModel(
  modelId: string,
  data: Prisma.GeneratedModelUpdateInput,
): Promise<GeneratedModel> {
  return prisma.generatedModel.update({
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
): Promise<GeneratedModel> {
  return prisma.generatedModel.update({
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
): Promise<GeneratedModel> {
  return prisma.generatedModel.update({
    where: { id: modelId },
    data: {
      failedAt: new Date(),
      errorMessage,
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
  await prisma.generatedModel.delete({
    where: { id: modelId },
  });
}

/**
 * 删除请求的所有模型
 */
export async function deleteModelsByRequestId(
  requestId: string,
): Promise<void> {
  await prisma.generatedModel.deleteMany({
    where: { requestId },
  });
}
