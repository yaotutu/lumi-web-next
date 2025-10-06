import { type NextRequest, NextResponse } from "next/server";
import * as QueueService from "@/lib/services/queue-service";
import { withErrorHandler } from "@/lib/utils/errors";

/**
 * GET /api/queue/status
 * 获取任务队列状态
 */
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const status = QueueService.getStatus();

  return NextResponse.json({
    success: true,
    data: status,
  });
});
