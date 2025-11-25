/**
 * 测试 API：GenerationRequest 管理
 *
 * POST /api/test/requests - 创建生成请求
 * GET /api/test/requests - 获取用户的生成请求列表
 */

import { type NextRequest, NextResponse } from "next/server";
import * as GenerationRequestService from "@/lib/services/generation-request-service";
import { withErrorHandler } from "@/lib/utils/errors";

/**
 * POST /api/test/requests
 * 创建新的生成请求
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { userId, prompt } = body;

  // 简单验证
  if (!userId || !prompt) {
    return NextResponse.json(
      { success: false, error: "缺少必需参数" },
      { status: 400 },
    );
  }

  // 创建生成请求（同时创建 ImageGenerationJob）
  const generationRequest = await GenerationRequestService.createRequest(
    userId,
    prompt,
  );

  return NextResponse.json({
    success: true,
    data: generationRequest,
    message: "生成请求已创建，图片生成任务已加入队列",
  });
});

/**
 * GET /api/test/requests
 * 获取用户的生成请求列表
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "缺少 userId 参数" },
      { status: 400 },
    );
  }

  const requests = await GenerationRequestService.listRequests(userId);

  return NextResponse.json({
    success: true,
    data: requests,
  });
});
