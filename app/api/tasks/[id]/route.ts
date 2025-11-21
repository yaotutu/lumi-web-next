/**
 * Task Detail API - 新架构（Image-Centric）
 *
 * GET /api/tasks/[id] - 获取任务详情
 * PATCH /api/tasks/[id] - 更新任务（选择图片触发3D生成）
 */

import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import * as GenerationRequestService from "@/lib/services/generation-request-service";
import * as ModelService from "@/lib/services/model-service";

/**
 * GET /api/tasks/[id]
 * 获取任务详情
 *
 * 返回格式：
 * - GenerationRequest（包含 status/phase）
 * - images: GeneratedImage[]
 * - model: Model（1:1关系）
 */
export const GET = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const generationRequest = await GenerationRequestService.getRequestById(id);

    return NextResponse.json({
      success: true,
      data: generationRequest,
    });
  },
);

/**
 * PATCH /api/tasks/[id]
 * 选择图片并触发3D模型生成
 *
 * Body: { selectedImageIndex: number }
 *
 * 新架构核心变更：
 * - 1 Request : 1 Model（每个请求只能生成一个3D模型）
 */
export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const body = await request.json();
    const { selectedImageIndex } = body;

    // 验证参数
    if (typeof selectedImageIndex !== "number") {
      return NextResponse.json(
        { success: false, error: "selectedImageIndex 必须是数字" },
        { status: 400 },
      );
    }

    // 使用新的 ModelService 创建 3D 模型生成任务
    // 新架构：接受 requestId 和 imageIndex，自动验证 1:1 约束
    const newModel = await ModelService.createModelForRequest(
      id,
      selectedImageIndex,
    );

    // 返回新创建的模型
    return NextResponse.json({
      success: true,
      model: newModel,
      selectedImageIndex,
      message: "3D模型生成已启动",
    });
  },
);
