/**
 * 管理 API：队列配置管理（JSend 规范）
 *
 * GET /api/admin/queues/[name] - 获取队列配置
 * PATCH /api/admin/queues/[name] - 更新队列配置
 */

import { type NextRequest } from "next/server";
import { QueueConfigRepository } from "@/lib/repositories";
import { withErrorHandler, AppError } from "@/lib/utils/errors";
import { success } from "@/lib/utils/api-response";
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

    // 使用 AppError 自动转换为 JSend fail 格式
    if (!config) {
      throw new AppError("NOT_FOUND", "队列配置不存在");
    }

    // JSend success 格式
    return success(config);
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

    // JSend success 格式
    return success(updatedConfig);
  },
);
