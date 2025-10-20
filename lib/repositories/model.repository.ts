/**
 * Model Repository - 数据访问层
 *
 * 职责：
 * - 纯粹的数据库 CRUD 操作
 * - 查询构建和数据获取
 * - 不包含业务逻辑
 *
 * 原则：
 * - 只操作数据库，不做业务判断
 * - 函数命名清晰：find/create/update/delete
 * - 返回原始数据，由 Service 层处理业务逻辑
 */

import type {
  Model,
  ModelSource,
  ModelVisibility,
  ModelGenerationStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ============================================
// 查询操作
// ============================================

/**
 * 根据 ID 查询模型（包含关联数据）
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
}

/**
 * 查询用户的模型列表
 */
export async function findModelsByUserId(
  userId: string,
  options?: {
    source?: ModelSource;
    visibility?: ModelVisibility;
    limit?: number;
    offset?: number;
  },
) {
  const { source, visibility, limit = 20, offset = 0 } = options || {};

  return prisma.model.findMany({
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
}

/**
 * 查询公开模型列表
 */
export async function findPublicModels(options?: {
  sortBy?: "recent" | "popular";
  limit?: number;
  offset?: number;
}) {
  const { sortBy = "recent", limit = 20, offset = 0 } = options || {};

  const orderBy =
    sortBy === "popular"
      ? { likeCount: "desc" as const }
      : { publishedAt: "desc" as const };

  return prisma.model.findMany({
    where: {
      visibility: "PUBLIC",
      publishedAt: { not: null },
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
}

/**
 * 查询任务关联的所有模型
 */
export async function findModelsByTaskId(taskId: string) {
  return prisma.model.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 统计任务的生成中模型数量
 */
export async function countGeneratingModelsByTaskId(
  taskId: string,
): Promise<number> {
  return prisma.model.count({
    where: {
      taskId,
      generationStatus: "GENERATING",
    },
  });
}

/**
 * 查询用户的所有模型（用于统计）
 */
export async function findAllModelsByUserId(userId: string) {
  return prisma.model.findMany({
    where: { userId },
    select: {
      source: true,
      visibility: true,
      viewCount: true,
      likeCount: true,
      downloadCount: true,
    },
  });
}

// ============================================
// 创建操作
// ============================================

/**
 * 创建用户上传的模型
 */
export async function createUploadedModel(
  data: Prisma.ModelCreateInput,
): Promise<Model> {
  return prisma.model.create({ data });
}

/**
 * 创建 AI 生成的模型
 */
export async function createAIGeneratedModel(data: {
  userId: string;
  taskId: string;
  name: string;
  prompt: string;
}): Promise<Model> {
  return prisma.model.create({
    data: {
      userId: data.userId,
      taskId: data.taskId,
      source: "AI_GENERATED",
      name: data.name,
      prompt: data.prompt,
      modelUrl: "",
      generationStatus: "PENDING",
      progress: 0,
      providerJobId: "",
      providerRequestId: "",
    },
  });
}

// ============================================
// 更新操作
// ============================================

/**
 * 更新模型基本信息
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
 * 增加浏览次数
 */
export async function incrementViewCount(modelId: string): Promise<void> {
  await prisma.model.update({
    where: { id: modelId },
    data: { viewCount: { increment: 1 } },
  });
}

/**
 * 增加下载次数
 */
export async function incrementDownloadCount(modelId: string): Promise<void> {
  await prisma.model.update({
    where: { id: modelId },
    data: { downloadCount: { increment: 1 } },
  });
}

/**
 * 更新点赞数
 */
export async function updateLikeCount(
  modelId: string,
  increment: 1 | -1,
): Promise<void> {
  await prisma.model.update({
    where: { id: modelId },
    data: { likeCount: { increment } },
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
