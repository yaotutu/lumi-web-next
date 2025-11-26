/**
 * Tasks API - 新架构（Image-Centric）
 *
 * 直接返回 GenerationRequest 数据，无适配层
 * 采用 JSend 响应规范
 */

import { type NextRequest } from "next/server";
import * as GenerationRequestService from "@/lib/services/generation-request-service";
import { getCurrentUserId } from "@/lib/utils/auth";
import { withErrorHandler, AppError } from "@/lib/utils/errors";
import { success, fail } from "@/lib/utils/api-response";

/**
 * GET /api/tasks
 * 获取用户的生成请求列表（JSend success 格式）
 *
 * 返回格式：
 * {
 *   status: 'success',
 *   data: {
 *     items: GenerationRequest[],  // 包含 images 和 model
 *     total: number
 *   }
 * }
 */
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const userId = await getCurrentUserId();
  const requests = await GenerationRequestService.listRequests(userId);

  // JSend success 格式 - 列表数据嵌套在 data.items 中
  return success({
    items: requests,
    total: requests.length,
  });
});

/**
 * POST /api/tasks
 * 创建新的生成请求（JSend success/fail 格式）
 *
 * 自动创建：
 * - 1 个 GenerationRequest
 * - 4 个 GeneratedImage（imageStatus=PENDING）
 * - 4 个 ImageGenerationJob（status=PENDING）
 *
 * 返回格式：
 * {
 *   status: 'success',
 *   data: GenerationRequest  // 包含 id, prompt, images 等
 * }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { prompt } = body;

  // 验证 prompt - 使用 JSend fail 格式
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new AppError("VALIDATION_ERROR", "提示词不能为空");
  }

  const userId = await getCurrentUserId();
  const generationRequest = await GenerationRequestService.createRequest(
    userId,
    prompt.trim(),
  );

  // JSend success 格式 - 返回创建的资源，使用 201 状态码
  return success(generationRequest, { status: 201 });
});
