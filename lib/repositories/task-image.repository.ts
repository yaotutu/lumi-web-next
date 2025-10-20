/**
 * TaskImage Repository - 数据访问层
 *
 * 职责：
 * - 任务图片的 CRUD 操作
 * - 不包含业务逻辑
 */

import type { TaskImage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ============================================
// 查询操作
// ============================================

/**
 * 根据任务 ID 查询所有图片
 */
export async function findImagesByTaskId(taskId: string) {
  return prisma.taskImage.findMany({
    where: { taskId },
    orderBy: { index: "asc" },
  });
}

/**
 * 根据 ID 查询图片
 */
export async function findImageById(imageId: string) {
  return prisma.taskImage.findUnique({
    where: { id: imageId },
  });
}

/**
 * 查询任务的特定索引图片
 */
export async function findImageByTaskIdAndIndex(
  taskId: string,
  index: number,
) {
  return prisma.taskImage.findFirst({
    where: { taskId, index },
  });
}

// ============================================
// 创建操作
// ============================================

/**
 * 创建单张图片
 */
export async function createImage(
  data: Prisma.TaskImageCreateInput,
): Promise<TaskImage> {
  return prisma.taskImage.create({ data });
}

/**
 * 批量创建图片
 */
export async function createManyImages(
  data: Prisma.TaskImageCreateManyInput[],
): Promise<number> {
  const result = await prisma.taskImage.createMany({ data });
  return result.count;
}

// ============================================
// 更新操作
// ============================================

/**
 * 更新图片
 */
export async function updateImage(
  imageId: string,
  data: Prisma.TaskImageUpdateInput,
): Promise<TaskImage> {
  return prisma.taskImage.update({
    where: { id: imageId },
    data,
  });
}

// ============================================
// 删除操作
// ============================================

/**
 * 删除图片
 */
export async function deleteImage(imageId: string): Promise<void> {
  await prisma.taskImage.delete({
    where: { id: imageId },
  });
}

/**
 * 删除任务的所有图片
 */
export async function deleteImagesByTaskId(taskId: string): Promise<number> {
  const result = await prisma.taskImage.deleteMany({
    where: { taskId },
  });
  return result.count;
}
