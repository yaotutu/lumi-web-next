import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import * as QueueService from "@/lib/services/queue-service";

/**
 * GET /api/queue/status
 * 获取任务队列状态
 */
export const GET = async (request: NextRequest) => {
  const status = QueueService.getStatus();

  return NextResponse.json({
    success: true,
    data: status,
  });
};