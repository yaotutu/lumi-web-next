/**
 * UserAsset Repository - 数据访问层
 *
 * 职责：
 * - UserAsset 的 CRUD 操作
 * - 查询用户资产和公开资产
 * - 不包含业务逻辑
 */

import type { UserAsset, AssetSource, AssetVisibility, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ============================================
// 查询操作
// ============================================

/**
 * 根据 ID 查询 UserAsset
 */
export async function findAssetById(assetId: string) {
  return prisma.userAsset.findUnique({
    where: { id: assetId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      generatedModel: {
        select: {
          id: true,
          name: true,
          format: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * 查询用户的所有资产
 */
export async function findAssetsByUserId(
  userId: string,
  options?: {
    source?: AssetSource;
    visibility?: AssetVisibility;
    limit?: number;
    offset?: number;
  },
) {
  const { source, visibility, limit = 20, offset = 0 } = options || {};

  return prisma.userAsset.findMany({
    where: {
      userId,
      ...(source && { source }),
      ...(visibility && { visibility }),
    },
    include: {
      generatedModel: {
        select: {
          id: true,
          name: true,
          format: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });
}

/**
 * 查询公开的资产（模型广场）
 */
export async function findPublicAssets(options?: {
  sortBy?: "latest" | "popular";
  limit?: number;
  offset?: number;
}) {
  const { sortBy = "latest", limit = 20, offset = 0 } = options || {};

  return prisma.userAsset.findMany({
    where: {
      visibility: "PUBLIC",
      publishedAt: {
        not: null,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy:
      sortBy === "latest"
        ? { publishedAt: "desc" }
        : { likeCount: "desc" },
    take: limit,
    skip: offset,
  });
}

// ============================================
// 创建操作
// ============================================

/**
 * 从 GeneratedModel 创建 UserAsset
 */
export async function createAssetFromModel(data: {
  userId: string;
  generatedModelId: string;
  name: string;
  description?: string;
  modelUrl: string;
  previewImageUrl?: string;
  format: string;
  fileSize?: number;
}): Promise<UserAsset> {
  return prisma.userAsset.create({
    data: {
      userId: data.userId,
      source: "AI_GENERATED",
      generatedModelId: data.generatedModelId,
      name: data.name,
      description: data.description,
      modelUrl: data.modelUrl,
      previewImageUrl: data.previewImageUrl,
      format: data.format,
      fileSize: data.fileSize,
      visibility: "PRIVATE", // 默认私有
    },
  });
}

/**
 * 创建用户上传的资产
 */
export async function createUploadedAsset(data: {
  userId: string;
  name: string;
  description?: string;
  modelUrl: string;
  previewImageUrl?: string;
  format: string;
  fileSize?: number;
}): Promise<UserAsset> {
  return prisma.userAsset.create({
    data: {
      userId: data.userId,
      source: "USER_UPLOADED",
      name: data.name,
      description: data.description,
      modelUrl: data.modelUrl,
      previewImageUrl: data.previewImageUrl,
      format: data.format,
      fileSize: data.fileSize,
      visibility: "PRIVATE",
    },
  });
}

// ============================================
// 更新操作
// ============================================

/**
 * 更新资产
 */
export async function updateAsset(
  assetId: string,
  data: Prisma.UserAssetUpdateInput,
): Promise<UserAsset> {
  return prisma.userAsset.update({
    where: { id: assetId },
    data,
  });
}

/**
 * 发布资产到模型广场
 */
export async function publishAsset(assetId: string): Promise<UserAsset> {
  return prisma.userAsset.update({
    where: { id: assetId },
    data: {
      visibility: "PUBLIC",
      publishedAt: new Date(),
    },
  });
}

/**
 * 取消发布资产
 */
export async function unpublishAsset(assetId: string): Promise<UserAsset> {
  return prisma.userAsset.update({
    where: { id: assetId },
    data: {
      visibility: "PRIVATE",
      publishedAt: null,
    },
  });
}

/**
 * 增加浏览次数
 */
export async function incrementViewCount(assetId: string): Promise<void> {
  await prisma.userAsset.update({
    where: { id: assetId },
    data: {
      viewCount: {
        increment: 1,
      },
    },
  });
}

/**
 * 增加点赞次数
 */
export async function incrementLikeCount(assetId: string): Promise<void> {
  await prisma.userAsset.update({
    where: { id: assetId },
    data: {
      likeCount: {
        increment: 1,
      },
    },
  });
}

/**
 * 增加下载次数
 */
export async function incrementDownloadCount(assetId: string): Promise<void> {
  await prisma.userAsset.update({
    where: { id: assetId },
    data: {
      downloadCount: {
        increment: 1,
      },
    },
  });
}

// ============================================
// 删除操作
// ============================================

/**
 * 删除资产
 */
export async function deleteAsset(assetId: string): Promise<void> {
  await prisma.userAsset.delete({
    where: { id: assetId },
  });
}
