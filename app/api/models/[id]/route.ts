import { type NextRequest, NextResponse } from "next/server";
import * as ModelService from "@/lib/services/model-service";
import { withErrorHandler } from "@/lib/utils/errors";
import {
  modelIdSchema,
  updateModelSchema,
} from "@/lib/validators/model-validators";

/**
 * GET /api/models/:id
 * 获取模型详情
 */
export const GET = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;

    // 验证模型 ID 格式
    const modelId = modelIdSchema.parse(id);

    // TODO: 获取当前用户ID（从session或JWT）
    // 临时使用 undefined（未登录状态）
    const userId = undefined;

    // 获取模型详情（包含权限验证和浏览计数）
    const model = await ModelService.getModelById(modelId, userId);

    return NextResponse.json({
      success: true,
      data: model,
    });
  },
);

/**
 * PATCH /api/models/:id
 * 更新模型信息
 *
 * Body:
 * {
 *   name?: string,
 *   description?: string,
 *   visibility?: "PRIVATE" | "PUBLIC"
 * }
 */
export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const body = await request.json();

    // 验证模型 ID 和更新数据
    const modelId = modelIdSchema.parse(id);
    const validatedData = updateModelSchema.parse(body);

    // TODO: 获取当前用户ID（从session或JWT）
    // 临时使用硬编码的测试用户ID
    const userId = "test-user-id";

    // 更新模型（包含权限验证）
    const model = await ModelService.updateModel(
      modelId,
      userId,
      validatedData,
    );

    return NextResponse.json({
      success: true,
      data: model,
      message: "模型更新成功",
    });
  },
);

/**
 * DELETE /api/models/:id
 * 删除模型
 */
export const DELETE = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;

    // 验证模型 ID
    const modelId = modelIdSchema.parse(id);

    // TODO: 获取当前用户ID（从session或JWT）
    // 临时使用硬编码的测试用户ID
    const userId = "test-user-id";

    // 删除模型（包含权限验证）
    await ModelService.deleteModel(modelId, userId);

    return NextResponse.json({
      success: true,
      message: "模型删除成功",
    });
  },
);
