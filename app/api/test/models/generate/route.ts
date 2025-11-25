/**
 * 测试 API：创建 3D 模型生成任务
 *
 * POST /api/test/models/generate - 为图片创建 3D 模型生成任务
 *
 * 新架构：1 Request : 1 Model，接受 requestId 和 imageIndex
 */

import { type NextRequest, NextResponse } from "next/server";
import * as ModelService from "@/lib/services/model-service";
import { withErrorHandler } from "@/lib/utils/errors";

/**
 * POST /api/test/models/generate
 * 为图片创建 3D 模型生成任务
 *
 * Body:
 * {
 *   "requestId": "clxxx",
 *   "imageIndex": 0  // 图片索引 (0-3)
 * }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { requestId, imageIndex } = body;

  // 简单验证
  if (!requestId || typeof imageIndex !== "number") {
    return NextResponse.json(
      { success: false, error: "缺少必需参数 requestId 或 imageIndex" },
      { status: 400 },
    );
  }

  // 新架构：使用 createModelForRequest，接受 requestId 和 imageIndex
  const model = await ModelService.createModelForRequest(requestId, imageIndex);

  return NextResponse.json({
    success: true,
    data: model,
    message: "3D 模型生成任务已创建，已加入队列",
  });
});
