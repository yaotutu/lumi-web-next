/**
 * 管理 API：队列配置管理
 *
 * GET /api/admin/queues/[name] - 获取队列配置
 * PATCH /api/admin/queues/[name] - 更新队列配置
 */

import { type NextRequest, NextResponse } from "next/server";
import { QueueConfigRepository } from "@/lib/repositories";
import { withErrorHandler } from "@/lib/utils/errors";
import { workerConfigManager } from "@/lib/workers/worker-config-manager";

/**
 * GET /api/admin/queues/[name]
 * 获取队列配置
 */
export const GET = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ name: string }> },
  ) => {
    const { name } = await params;

    const config = await QueueConfigRepository.findConfigByQueueName(name);

    if (!config) {
      return NextResponse.json(
        { success: false, error: "队列配置不存在" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  },
);

/**
 * PATCH /api/admin/queues/[name]
 * 更新队列配置
 *
 * Body:
 * {
 *   "maxConcurrency": 2,
 *   "jobTimeout": 600000,
 *   "maxRetries": 3,
 *   "isActive": true
 * }
 */
export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> },
  ) => {
    const { name } = await params;
    const body = await request.json();

    // 更新配置
    const updatedConfig = await QueueConfigRepository.updateConfig(name, body);

    // 强制刷新 WorkerConfigManager 缓存
    await workerConfigManager.forceRefresh();

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: "队列配置已更新，Worker 将在下一轮轮询时生效",
    });
  },
);
