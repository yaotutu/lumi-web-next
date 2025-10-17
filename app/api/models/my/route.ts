import { type NextRequest, NextResponse } from "next/server";
import * as ModelService from "@/lib/services/model-service";
import { getCurrentUserId } from "@/lib/utils/auth";
import { withErrorHandler } from "@/lib/utils/errors";
import { listUserModelsSchema } from "@/lib/validators/model-validators";

/**
 * GET /api/models/my
 * 获取当前用户的模型列表
 *
 * 查询参数:
 * - source?: "AI_GENERATED" | "USER_UPLOADED" | "IMPORTED"
 * - visibility?: "PRIVATE" | "PUBLIC"
 * - limit: 数量限制 (默认: 20, 最大: 100)
 * - offset: 分页偏移 (默认: 0)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  // 获取当前用户ID
  const userId = getCurrentUserId();

  // 从查询参数获取筛选条件
  const { searchParams } = new URL(request.url);
  const queryParams = {
    source: searchParams.get("source") || undefined,
    visibility: searchParams.get("visibility") || undefined,
    limit: searchParams.get("limit") || undefined,
    offset: searchParams.get("offset") || undefined,
  };

  // 验证查询参数
  const validatedParams = listUserModelsSchema.parse(queryParams);

  // 查询用户的模型列表
  const models = await ModelService.listUserModels(userId, validatedParams);

  return NextResponse.json({
    success: true,
    data: models,
  });
});
