/**
 * 测试 API：创建 3D 模型生成任务
 *
 * POST /api/test/models/generate - 为图片创建 3D 模型生成任务
 */

import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import * as GeneratedModelService from "@/lib/services/generated-model-service";

/**
 * POST /api/test/models/generate
 * 为图片创建 3D 模型生成任务
 *
 * Body:
 * {
 *   "requestId": "clxxx",
 *   "sourceImageId": "clxxx"
 * }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { requestId, sourceImageId } = body;

  // 简单验证
  if (!requestId || !sourceImageId) {
    return NextResponse.json(
      { success: false, error: "缺少必需参数" },
      { status: 400 },
    );
  }

  // 创建模型和 Job（同时创建 ModelGenerationJob）
  const model = await GeneratedModelService.createModelForImage(
    requestId,
    sourceImageId,
  );

  return NextResponse.json({
    success: true,
    data: model,
    message: "3D 模型生成任务已创建，已加入队列",
  });
});
