/**
 * ModelInteraction Repository - 数据访问层
 *
 * 职责：
 * - 点赞/收藏记录的 CRUD 操作
 * - 查询用户的点赞/收藏列表
 * - 不包含业务逻辑
 */

import type { ModelInteraction, InteractionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ============================================
// 查询操作
// ============================================

/**
 * 查询用户对某模型的交互记录
 */
export async function findInteraction(
  userId: string,
  modelId: string,
  type: InteractionType,
) {
  return prisma.modelInteraction.findUnique({
    where: {
      userId_modelId_type: {
        userId,
        modelId,
        type,
      },
    },
  });
}

/**
 * 查询用户对某模型的所有交互（点赞+收藏）
 */
export async function findUserInteractionsForModel(
  userId: string,
  modelId: string,
) {
  return prisma.modelInteraction.findMany({
    where: {
      userId,
      modelId,
    },
  });
}

/**
 * 检查用户是否点赞/收藏了某模型
 */
export async function hasInteraction(
  userId: string,
  modelId: string,
  type: InteractionType,
): Promise<boolean> {
  const interaction = await findInteraction(userId, modelId, type);
  return interaction !== null;
}

/**
 * 批量检查用户是否点赞/收藏了多个模型
 */
export async function findUserInteractionsForModels(
  userId: string,
  modelIds: string[],
  type?: InteractionType,
) {
  return prisma.modelInteraction.findMany({
    where: {
      userId,
      modelId: { in: modelIds },
      ...(type && { type }),
    },
    select: {
      modelId: true,
      type: true,
    },
  });
}

/**
 * 查询用户点赞的模型列表
 */
export async function findUserLikedModels(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
) {
  const { limit = 20, offset = 0 } = options || {};

  return prisma.modelInteraction.findMany({
    where: {
      userId,
      type: "LIKE",
    },
    include: {
      model: {
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
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * 查询用户收藏的模型列表
 */
export async function findUserFavoritedModels(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
) {
  const { limit = 20, offset = 0 } = options || {};

  return prisma.modelInteraction.findMany({
    where: {
      userId,
      type: "FAVORITE",
    },
    include: {
      model: {
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
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * 统计模型的点赞/收藏数
 */
export async function countInteractions(
  modelId: string,
  type: InteractionType,
): Promise<number> {
  return prisma.modelInteraction.count({
    where: {
      modelId,
      type,
    },
  });
}

// ============================================
// 创建操作
// ============================================

/**
 * 创建交互记录（点赞/收藏）
 */
export async function createInteraction(data: {
  userId: string;
  modelId: string;
  type: InteractionType;
}): Promise<ModelInteraction> {
  return prisma.modelInteraction.create({
    data: {
      userId: data.userId,
      modelId: data.modelId,
      type: data.type,
    },
  });
}

// ============================================
// 删除操作
// ============================================

/**
 * 删除交互记录（取消点赞/收藏）
 */
export async function deleteInteraction(
  userId: string,
  modelId: string,
  type: InteractionType,
): Promise<void> {
  await prisma.modelInteraction.delete({
    where: {
      userId_modelId_type: {
        userId,
        modelId,
        type,
      },
    },
  });
}

/**
 * 删除用户对某模型的所有交互
 */
export async function deleteAllInteractionsForModel(
  userId: string,
  modelId: string,
): Promise<void> {
  await prisma.modelInteraction.deleteMany({
    where: {
      userId,
      modelId,
    },
  });
}
