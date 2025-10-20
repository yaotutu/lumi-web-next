/**
 * 管理 API：暂停/恢复队列
 *
 * POST /api/admin/queues/[name]/pause - 暂停队列
 * DELETE /api/admin/queues/[name]/pause - 恢复队列
 */

import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import { QueueConfigRepository } from "@/lib/repositories";
import { workerConfigManager } from "@/lib/workers/worker-config-manager";

/**
 * POST /api/admin/queues/[name]/pause
 * 暂停队列
 */
export const POST = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> },
  ) => {
    const { name } = await params;

    // 暂停队列
    const config = await QueueConfigRepository.pauseQueue(name);

    // 强制刷新 WorkerConfigManager 缓存
    await workerConfigManager.forceRefresh();

    return NextResponse.json({
      success: true,
      data: config,
      message: "队列已暂停，Worker 将在下一轮轮询时停止处理任务",
    });
  },
);

/**
 * DELETE /api/admin/queues/[name]/pause
 * 恢复队列
 */
export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> },
  ) => {
    const { name } = await params;

    // 恢复队列
    const config = await QueueConfigRepository.resumeQueue(name);

    // 强制刷新 WorkerConfigManager 缓存
    await workerConfigManager.forceRefresh();

    return NextResponse.json({
      success: true,
      data: config,
      message: "队列已恢复，Worker 将在下一轮轮询时开始处理任务",
    });
  },
);
