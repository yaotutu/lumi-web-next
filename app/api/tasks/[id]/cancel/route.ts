import { type NextRequest, NextResponse } from "next/server";
import * as QueueService from "@/lib/services/queue-service";
import * as TaskService from "@/lib/services/task-service";
import { withErrorHandler } from "@/lib/utils/errors";

/**
 * POST /api/tasks/:id/cancel
 * 取消任务
 */
export const POST = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;

    // 尝试从队列中取消任务
    const cancelledFromQueue = await QueueService.dequeueTask(id);

    // 取消任务（更新任务状态为失败）
    await TaskService.cancelTask(id);

    return NextResponse.json({
      success: true,
      message: "Task cancelled successfully",
      cancelledFromQueue,
    });
  },
);
