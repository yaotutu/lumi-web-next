/**
 * Tasks API - 新架构（Image-Centric）
 *
 * 直接返回 GenerationRequest 数据，无适配层
 */

import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import { getCurrentUserId } from "@/lib/utils/auth";
import * as GenerationRequestService from "@/lib/services/generation-request-service";

/**
 * GET /api/tasks
 * 获取用户的生成请求列表
 *
 * 返回格式：
 * - GenerationRequest（无 status/phase）
 * - images: GeneratedImage[]（每个有 imageStatus）
 * - generatedModels: GeneratedModel[]
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const userId = await getCurrentUserId();
  const requests = await GenerationRequestService.listRequests(userId);

  return NextResponse.json({
    success: true,
    data: requests,
    count: requests.length,
  });
});

/**
 * POST /api/tasks
 * 创建新的生成请求
 *
 * 自动创建：
 * - 1 个 GenerationRequest
 * - 4 个 GeneratedImage（imageStatus=PENDING）
 * - 4 个 ImageGenerationJob（status=PENDING）
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { prompt } = body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "提示词不能为空" },
      { status: 400 },
    );
  }

  const userId = await getCurrentUserId();
  const generationRequest = await GenerationRequestService.createRequest(
    userId,
    prompt.trim(),
  );

  return NextResponse.json(
    {
      success: true,
      data: generationRequest,
      message: "任务已创建，4个图片生成任务已启动",
    },
    { status: 201 },
  );
});
