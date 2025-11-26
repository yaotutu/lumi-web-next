/**
 * 管理 API：暂停/恢复队列（JSend 规范）
 *
 * POST /api/admin/queues/[name]/pause - 暂停队列
 * DELETE /api/admin/queues/[name]/pause - 恢复队列
 */

import type { NextRequest } from "next/server";
import { QueueConfigRepository } from "@/lib/repositories";
import { success } from "@/lib/utils/api-response";
import { withErrorHandler } from "@/lib/utils/errors";
import { workerConfigManager } from "@/lib/workers/worker-config-manager";

/**
 * POST /api/admin/queues/[name]/pause
 * 暂停队列
 */
export const POST = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ name: string }> },
  ) => {
    const { name } = await params;

    // 暂停队列
    const config = await QueueConfigRepository.pauseQueue(name);

    // 强制刷新 WorkerConfigManager 缓存
    await workerConfigManager.forceRefresh();

    // JSend success 格式
    return success(config);
  },
);

/**
 * DELETE /api/admin/queues/[name]/pause
 * 恢复队列
 */
export const DELETE = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ name: string }> },
  ) => {
    const { name } = await params;

    // 恢复队列
    const config = await QueueConfigRepository.resumeQueue(name);

    // 强制刷新 WorkerConfigManager 缓存
    await workerConfigManager.forceRefresh();

    // JSend success 格式
    return success(config);
  },
);
