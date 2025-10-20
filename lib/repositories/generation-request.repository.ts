/**
 * GenerationRequest Repository - 数据访问层
 *
 * 职责：
 * - GenerationRequest 的 CRUD 操作
 * - 查询用户的生成请求
 * - 不包含业务逻辑
 */

import type { GenerationRequest, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ============================================
// 查询操作
// ============================================

/**
 * 根据 ID 查询 GenerationRequest（包含关联数据）
 */
export async function findRequestById(requestId: string) {
  return prisma.generationRequest.findUnique({
    where: { id: requestId },
    include: {
      images: {
        orderBy: { index: "asc" },
        include: {
          generatedModel: {
            // 一对一关系：该图片生成的模型
            select: {
              id: true,
              modelUrl: true,
              previewImageUrl: true,
              format: true,
              createdAt: true,
              completedAt: true,
              failedAt: true,
              errorMessage: true,
              sliceTaskId: true, // 打印任务ID
            },
          },
          generationJob: {
            // 图片的生成任务
            select: {
              id: true,
              status: true,
              retryCount: true,
            },
          },
        },
      },
      generatedModels: {
        // 直接查询所有模型（用于打印等功能）
        orderBy: { createdAt: "desc" },
        include: {
          generationJob: {
            select: {
              id: true,
              status: true,
              progress: true,
            },
          },
        },
      },
    },
  });
}

/**
 * 查询用户的生成请求列表
 */
export async function findRequestsByUserId(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
) {
  const { limit = 20, offset = 0 } = options || {};

  return prisma.generationRequest.findMany({
    where: {
      userId,
    },
    include: {
      images: {
        orderBy: { index: "asc" },
        include: {
          generatedModel: {
            select: {
              id: true,
              modelUrl: true,
              previewImageUrl: true,
              format: true,
              completedAt: true,
            },
          },
          generationJob: {
            select: {
              status: true,
            },
          },
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

// ============================================
// 创建操作
// ============================================

/**
 * 创建 GenerationRequest、4个 GeneratedImage 和 4个 ImageGenerationJob（事务）
 *
 * 每次请求生成 4 张图片，每张图片有自己的 Job
 */
export async function createRequestWithImagesAndJobs(data: {
  userId: string;
  prompt: string;
}): Promise<{
  request: GenerationRequest;
  imageIds: string[];
  jobIds: string[];
}> {
  const result = await prisma.$transaction(async (tx) => {
    // 1. 创建 GenerationRequest（无状态）
    const request = await tx.generationRequest.create({
      data: {
        userId: data.userId,
        prompt: data.prompt,
      },
    });

    // 2. 创建 4 个 GeneratedImage（初始状态 PENDING，imageUrl 为 null）
    const images = await Promise.all(
      [0, 1, 2, 3].map((index) =>
        tx.generatedImage.create({
          data: {
            requestId: request.id,
            index,
            imageStatus: "PENDING", // 初始状态
            imageUrl: null, // 待生成
          },
        }),
      ),
    );

    // 3. 为每个 Image 创建 ImageGenerationJob
    const jobs = await Promise.all(
      images.map((image) =>
        tx.imageGenerationJob.create({
          data: {
            imageId: image.id, // 1:1 关系
            status: "PENDING",
            priority: 0,
          },
        }),
      ),
    );

    return {
      request,
      imageIds: images.map((img) => img.id),
      jobIds: jobs.map((job) => job.id),
    };
  });

  return result;
}

// ============================================
// 更新操作
// ============================================

/**
 * 更新 GenerationRequest
 */
export async function updateRequest(
  requestId: string,
  data: Prisma.GenerationRequestUpdateInput,
): Promise<GenerationRequest> {
  return prisma.generationRequest.update({
    where: { id: requestId },
    data,
  });
}

// ============================================
// 删除操作
// ============================================

/**
 * 删除 GenerationRequest（级联删除关联数据）
 */
export async function deleteRequest(requestId: string): Promise<void> {
  await prisma.generationRequest.delete({
    where: { id: requestId },
  });
}
