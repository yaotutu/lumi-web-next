import { type NextRequest, NextResponse } from "next/server";
import * as ModelService from "@/lib/services/model-service";
import { getCurrentUserId } from "@/lib/utils/auth";
import { withErrorHandler } from "@/lib/utils/errors";
import {
  listPublicModelsSchema,
  createUploadedModelSchema,
} from "@/lib/validators/model-validators";

/**
 * GET /api/models
 * 获取公开模型列表（模型广场）
 *
 * 查询参数:
 * - sortBy: "recent" | "popular" (默认: recent)
 * - limit: 数量限制 (默认: 20, 最大: 100)
 * - offset: 分页偏移 (默认: 0)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  // 从查询参数获取筛选条件
  const { searchParams } = new URL(request.url);
  const queryParams = {
    sortBy: searchParams.get("sortBy") || undefined,
    limit: searchParams.get("limit") || undefined,
    offset: searchParams.get("offset") || undefined,
  };

  // 验证查询参数
  const validatedParams = listPublicModelsSchema.parse(queryParams);

  // 查询公开模型列表
  const models = await ModelService.listPublicModels(validatedParams);

  return NextResponse.json({
    success: true,
    data: models,
  });
});

/**
 * POST /api/models
 * 创建用户上传的模型
 *
 * Body:
 * {
 *   name: string,
 *   description?: string,
 *   modelUrl: string,
 *   previewImageUrl?: string,
 *   format?: string,
 *   fileSize?: number,
 *   visibility?: "PRIVATE" | "PUBLIC"
 * }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证输入（错误会被withErrorHandler自动捕获）
  const validatedData = createUploadedModelSchema.parse(body);

  // 获取当前用户ID
  const userId = getCurrentUserId();

  // 创建模型记录
  const model = await ModelService.createUploadedModel(userId, validatedData);

  return NextResponse.json(
    {
      success: true,
      data: model,
      message: "模型创建成功",
    },
    { status: 201 },
  );
});
