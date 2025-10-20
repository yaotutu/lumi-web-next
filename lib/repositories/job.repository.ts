/**
 * Job Repository - 数据访问层
 *
 * 职责：
 * - ImageGenerationJob 和 ModelGenerationJob 的 CRUD 操作
 * - 查询待处理任务
 * - 不包含业务逻辑
 */

import type {
  ImageGenerationJob,
  ModelGenerationJob,
  JobStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ============================================
// ImageGenerationJob 查询操作
// ============================================

/**
 * 根据 ID 查询 ImageGenerationJob
 */
export async function findImageJobById(jobId: string) {
  return prisma.imageGenerationJob.findUnique({
    where: { id: jobId },
    include: {
      image: {
        select: {
          id: true,
          requestId: true,
          index: true,
          imageUrl: true,
          imageStatus: true,
          request: {
            select: {
              id: true,
              userId: true,
              prompt: true,
            },
          },
        },
      },
    },
  });
}

/**
 * 根据 imageId 查询 ImageGenerationJob（1:1 关系）
 */
export async function findImageJobByImageId(imageId: string) {
  return prisma.imageGenerationJob.findUnique({
    where: { imageId },
    include: {
      image: {
        include: {
          request: {
            select: {
              id: true,
              userId: true,
              prompt: true,
            },
          },
        },
      },
    },
  });
}

/**
 * 查询特定状态的 ImageGenerationJob
 */
export async function findImageJobsByStatus(
  status: JobStatus,
  options?: {
    excludeIds?: string[];
    limit?: number;
  },
) {
  const { excludeIds = [], limit = 10 } = options || {};

  return prisma.imageGenerationJob.findMany({
    where: {
      status,
      ...(excludeIds.length > 0 && {
        id: { notIn: excludeIds },
      }),
    },
    include: {
      image: {
        include: {
          request: {
            select: {
              id: true,
              userId: true,
              prompt: true,
            },
          },
        },
      },
    },
    orderBy: [
      { priority: "desc" }, // 优先级高的先执行
      { createdAt: "asc" }, // 同优先级按创建时间排序
    ],
    take: limit,
  });
}

// ============================================
// ImageGenerationJob 更新操作
// ============================================

/**
 * 更新 ImageGenerationJob
 */
export async function updateImageJob(
  jobId: string,
  data: Prisma.ImageGenerationJobUpdateInput,
): Promise<ImageGenerationJob> {
  return prisma.imageGenerationJob.update({
    where: { id: jobId },
    data,
  });
}

/**
 * 更新 ImageGenerationJob 状态
 */
export async function updateImageJobStatus(
  jobId: string,
  status: JobStatus,
  additionalData?: Partial<Prisma.ImageGenerationJobUpdateInput>,
): Promise<ImageGenerationJob> {
  return prisma.imageGenerationJob.update({
    where: { id: jobId },
    data: {
      status,
      ...additionalData,
    },
  });
}

// ============================================
// ModelGenerationJob 查询操作
// ============================================

/**
 * 根据 ID 查询 ModelGenerationJob
 */
export async function findModelJobById(jobId: string) {
  return prisma.modelGenerationJob.findUnique({
    where: { id: jobId },
    include: {
      model: {
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
            },
          },
        },
      },
    },
  });
}

/**
 * 根据 modelId 查询 ModelGenerationJob
 */
export async function findModelJobByModelId(modelId: string) {
  return prisma.modelGenerationJob.findUnique({
    where: { modelId },
    include: {
      model: {
        include: {
          request: true,
          sourceImage: true,
        },
      },
    },
  });
}

/**
 * 查询特定状态的 ModelGenerationJob
 */
export async function findModelJobsByStatus(
  status: JobStatus,
  options?: {
    excludeIds?: string[];
    limit?: number;
  },
) {
  const { excludeIds = [], limit = 10 } = options || {};

  return prisma.modelGenerationJob.findMany({
    where: {
      status,
      ...(excludeIds.length > 0 && {
        id: { notIn: excludeIds },
      }),
    },
    include: {
      model: {
        include: {
          request: true,
          sourceImage: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: limit,
  });
}

// ============================================
// ModelGenerationJob 更新操作
// ============================================

/**
 * 更新 ModelGenerationJob
 */
export async function updateModelJob(
  jobId: string,
  data: Prisma.ModelGenerationJobUpdateInput,
): Promise<ModelGenerationJob> {
  return prisma.modelGenerationJob.update({
    where: { id: jobId },
    data,
  });
}

/**
 * 更新 ModelGenerationJob 状态
 */
export async function updateModelJobStatus(
  jobId: string,
  status: JobStatus,
  additionalData?: Partial<Prisma.ModelGenerationJobUpdateInput>,
): Promise<ModelGenerationJob> {
  return prisma.modelGenerationJob.update({
    where: { id: jobId },
    data: {
      status,
      ...additionalData,
    },
  });
}

// ============================================
// 删除操作
// ============================================

/**
 * 删除 ImageGenerationJob
 */
export async function deleteImageJob(jobId: string): Promise<void> {
  await prisma.imageGenerationJob.delete({
    where: { id: jobId },
  });
}

/**
 * 删除 ModelGenerationJob
 */
export async function deleteModelJob(jobId: string): Promise<void> {
  await prisma.modelGenerationJob.delete({
    where: { id: jobId },
  });
}
