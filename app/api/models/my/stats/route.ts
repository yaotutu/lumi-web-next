import { type NextRequest, NextResponse } from "next/server";
import * as ModelService from "@/lib/services/model-service";
import { getCurrentUserId } from "@/lib/utils/auth";
import { withErrorHandler } from "@/lib/utils/errors";

/**
 * GET /api/models/my/stats
 * 获取当前用户的模型统计数据
 *
 * 返回:
 * {
 *   total: number,
 *   aiGenerated: number,
 *   userUploaded: number,
 *   publicModels: number,
 *   privateModels: number,
 *   totalViews: number,
 *   totalLikes: number,
 *   totalDownloads: number
 * }
 */
export const GET = withErrorHandler(async (_request: NextRequest) => {
  // 获取当前用户ID
  const userId = getCurrentUserId();

  // 获取用户的模型统计
  const stats = await ModelService.getUserModelStats(userId);

  return NextResponse.json({
    success: true,
    data: stats,
  });
});
