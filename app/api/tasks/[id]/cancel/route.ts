import { type NextRequest, NextResponse } from "next/server";
import * as TaskService from "@/lib/services/task-service";
import { withErrorHandler } from "@/lib/utils/errors";

/**
 * POST /api/tasks/:id/cancel
 * 取消任务
 *
 * Worker架构说明：
 * - API层只负责更新任务状态
 * - Worker监听状态变化，自动停止处理
 */
export const POST = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;

    // 取消任务（更新任务状态为FAILED）
    // Worker 会在下次轮询时跳过该任务
    await TaskService.cancelTask(id);

    return NextResponse.json({
      success: true,
      message: "Task cancelled successfully",
    });
  },
);
