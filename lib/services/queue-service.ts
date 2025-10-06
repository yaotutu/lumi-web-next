/**
 * 队列管理服务
 * 职责：任务队列的添加、取消、状态查询
 * 原则：封装底层队列实现细节，提供统一的业务接口
 */

import { prisma } from "@/lib/db/prisma";
import {
  addTask,
  cancelTask as cancelQueueTask,
  getQueueStatus,
} from "@/lib/task-queue";
import { AppError } from "@/lib/utils/errors";

/**
 * 队列状态类型
 */
export interface QueueStatus {
  running: number; // 当前运行中的任务数
  maxConcurrent: number; // 最大并发数
}

/**
 * 添加任务到队列
 * 如果队列已满或添加失败，会标记任务为失败状态
 *
 * @param taskId 任务ID
 * @param prompt 生成提示词
 * @throws AppError QUEUE_FULL - 队列已满，无法添加
 */
export async function enqueueTask(
  taskId: string,
  prompt: string,
): Promise<void> {
  try {
    // 调用底层队列添加任务
    await addTask(taskId, prompt);
  } catch (error) {
    // 队列添加失败，标记任务为失败状态
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage:
          error instanceof Error ? error.message : "队列已满，请稍后重试",
      },
    });

    // 抛出业务层错误
    throw new AppError("QUEUE_FULL", "任务队列已满，请稍后重试", error);
  }
}

/**
 * 从队列中取消任务
 * 注意：这只是尝试从队列中移除任务，实际取消逻辑由task-service处理
 *
 * @param taskId 任务ID
 * @returns 是否成功从队列中取消（true=队列中存在并已取消，false=队列中不存在）
 */
export async function dequeueTask(taskId: string): Promise<boolean> {
  // 调用底层队列取消函数
  return await cancelQueueTask(taskId);
}

/**
 * 获取队列当前状态
 * @returns 队列状态信息（运行中的任务数、最大并发数）
 */
export function getStatus(): QueueStatus {
  // 调用底层队列状态查询
  return getQueueStatus();
}
