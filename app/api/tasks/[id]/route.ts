/**
 * Task Detail API - 新架构（Image-Centric）
 *
 * GET /api/tasks/[id] - 获取任务详情
 * PATCH /api/tasks/[id] - 更新任务（选择图片触发3D生成）
 */

import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import * as GenerationRequestService from "@/lib/services/generation-request-service";
import * as GeneratedModelService from "@/lib/services/generated-model-service";

/**
 * GET /api/tasks/[id]
 * 获取任务详情
 *
 * 返回格式：
 * - GenerationRequest（无 status/phase）
 * - images: GeneratedImage[]（每个有 imageStatus）
 * - generatedModels: GeneratedModel[]
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

    // 1. 获取请求详情
    const generationRequest =
      await GenerationRequestService.getRequestById(id);

    if (!generationRequest.images || generationRequest.images.length === 0) {
      return NextResponse.json(
        { success: false, error: "任务尚未生成图片" },
        { status: 400 },
      );
    }

    // 2. 查找选中的图片
    const selectedImage = generationRequest.images.find(
      (img) => img.index === selectedImageIndex,
    );

    if (!selectedImage) {
      return NextResponse.json(
        { success: false, error: `图片索引 ${selectedImageIndex} 不存在` },
        { status: 400 },
      );
    }

    // 3. 检查图片状态是否为 COMPLETED
    if (selectedImage.imageStatus !== "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          error: `图片状态为 ${selectedImage.imageStatus}，只能选择已完成的图片`,
        },
        { status: 400 },
      );
    }

    // 4. 创建 3D 模型生成任务
    await GeneratedModelService.createModelForImage(id, selectedImage.id);

    // 5. 返回更新后的请求详情
    const updatedRequest = await GenerationRequestService.getRequestById(id);

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: "图片已选择，3D模型生成已启动",
    });
  },
);
