import { NextRequest, NextResponse } from "next/server";
import { taskQueue } from "@/lib/task-queue";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tasks/:id/cancel
 * 取消任务
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 尝试从队列中取消任务
    const cancelled = await taskQueue.cancelTask(id);

    if (cancelled) {
      return NextResponse.json({
        success: true,
        message: "Task cancelled successfully",
      });
    }

    // 任务不在队列中,检查数据库状态
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 },
      );
    }

    // 任务已完成或失败,无法取消
    if (
      task.status === "IMAGES_READY" ||
      task.status === "COMPLETED" ||
      task.status === "FAILED" ||
      task.status === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Task cannot be cancelled (status: ${task.status})`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Task not found in queue",
      },
      { status: 404 },
    );
  } catch (error) {
    console.error("Failed to cancel task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel task" },
      { status: 500 },
    );
  }
}
