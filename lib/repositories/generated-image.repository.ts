/**
 * GeneratedImage Repository - 数据访问层
 *
 * 职责：
 * - GeneratedImage 的 CRUD 操作
 * - 查询请求关联的图片
 * - 不包含业务逻辑
 */

import type { GeneratedImage, ImageStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ============================================
// 查询操作
// ============================================

/**
 * 根据 ID 查询 GeneratedImage
 */
export async function findImageById(imageId: string) {
  return prisma.generatedImage.findUnique({
    where: { id: imageId },
    include: {
      request: {
        select: {
          id: true,
          userId: true,
          prompt: true,
        },
      },
      generatedModel: {
        select: {
          id: true,
          modelUrl: true,
          previewImageUrl: true,
          format: true,
          completedAt: true,
        },
      },
    },
  });
}

/**
 * 查询请求的所有图片
 */
export async function findImagesByRequestId(requestId: string) {
  return prisma.generatedImage.findMany({
    where: { requestId },
    orderBy: { index: "asc" },
    include: {
      generatedModel: {
        select: {
          id: true,
          modelUrl: true,
          previewImageUrl: true,
          format: true,
          completedAt: true,
          failedAt: true,
          errorMessage: true,
        },
      },
      generationJob: {
        select: {
          id: true,
          status: true,
          retryCount: true,
        },
      },
    },
  });
}

/**
 * 查询特定状态的图片
 *
 * @param status - 图片状态（PENDING/GENERATING/COMPLETED/FAILED）
 * @param options - 查询选项
 */
export async function findImagesByStatus(
  status: ImageStatus,
  options?: {
    limit?: number;
    includeJob?: boolean;
  },
) {
  const { limit = 10, includeJob = true } = options || {};

  return prisma.generatedImage.findMany({
    where: { imageStatus: status },
    orderBy: { createdAt: "asc" },
    include: {
      request: {
        select: {
          id: true,
          userId: true,
          prompt: true,
        },
      },
      ...(includeJob && {
        generationJob: {
          select: {
            id: true,
            status: true,
            retryCount: true,
          },
        },
      }),
    },
    take: limit,
  });
}

/**
 * 查询请求中待生成的图片（imageStatus=PENDING）
 */
export async function findPendingImagesByRequestId(requestId: string) {
  return prisma.generatedImage.findMany({
    where: {
      requestId,
      imageStatus: "PENDING",
    },
    orderBy: { index: "asc" },
    include: {
      generationJob: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
}

// ============================================
// 创建操作
// ============================================

/**
 * 创建单张图片
 */
export async function createImage(data: {
  requestId: string;
  index: number;
  imageUrl?: string | null; // 可选，生成后才有
  imagePrompt?: string;
  imageStatus?: ImageStatus; // 默认 PENDING
  providerTaskId?: string;
  providerRequestId?: string;
}): Promise<GeneratedImage> {
  return prisma.generatedImage.create({
    data: {
      requestId: data.requestId,
      index: data.index,
      imageUrl: data.imageUrl ?? null,
      imagePrompt: data.imagePrompt,
      imageStatus: data.imageStatus ?? "PENDING",
      providerTaskId: data.providerTaskId,
      providerRequestId: data.providerRequestId,
    },
  });
}

/**
 * 批量创建图片
 */
export async function createImages(
  images: Array<{
    requestId: string;
    index: number;
    imageUrl?: string | null;
    imagePrompt?: string;
    imageStatus?: ImageStatus;
    providerTaskId?: string;
    providerRequestId?: string;
  }>,
): Promise<void> {
  await prisma.generatedImage.createMany({
    data: images.map((img) => ({
      requestId: img.requestId,
      index: img.index,
      imageUrl: img.imageUrl ?? null,
      imagePrompt: img.imagePrompt,
      imageStatus: img.imageStatus ?? "PENDING",
      providerTaskId: img.providerTaskId,
      providerRequestId: img.providerRequestId,
    })),
  });
}

// ============================================
// 更新操作
// ============================================

/**
 * 更新图片
 */
export async function updateImage(
  imageId: string,
  data: Prisma.GeneratedImageUpdateInput,
): Promise<GeneratedImage> {
  return prisma.generatedImage.update({
    where: { id: imageId },
    data,
  });
}

/**
 * 更新图片状态
 *
 * @param imageId - 图片 ID
 * @param status - 新状态（PENDING/GENERATING/COMPLETED/FAILED）
 * @param additionalData - 其他字段（如 completedAt/failedAt/errorMessage）
 */
export async function updateImageStatus(
  imageId: string,
  status: ImageStatus,
  additionalData?: Partial<Prisma.GeneratedImageUpdateInput>,
): Promise<GeneratedImage> {
  return prisma.generatedImage.update({
    where: { id: imageId },
    data: {
      imageStatus: status,
      ...additionalData,
    },
  });
}

// ============================================
// 删除操作
// ============================================

/**
 * 删除图片
 */
export async function deleteImage(imageId: string): Promise<void> {
  await prisma.generatedImage.delete({
    where: { id: imageId },
  });
}

/**
 * 删除请求的所有图片
 */
export async function deleteImagesByRequestId(
  requestId: string,
): Promise<void> {
  await prisma.generatedImage.deleteMany({
    where: { requestId },
  });
}
