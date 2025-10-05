import { NextRequest, NextResponse } from "next/server";
import { taskQueue } from "@/lib/task-queue";

/**
 * GET /api/queue/status
 * 获取任务队列状态
 */
export async function GET(request: NextRequest) {
  try {
    const status = taskQueue.getStatus();

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Failed to get queue status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get queue status" },
      { status: 500 },
    );
  }
}
