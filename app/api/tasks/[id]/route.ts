/**
 * Task Detail API - 新架构（Image-Centric）
 *
 * GET /api/tasks/[id] - 获取任务详情
 * PATCH /api/tasks/[id] - 更新任务（选择图片触发3D生成）
 * 采用 JSend 响应规范
 */

import type { NextRequest } from "next/server";
import * as GenerationRequestService from "@/lib/services/generation-request-service";
import * as ModelService from "@/lib/services/model-service";
import { success } from "@/lib/utils/api-response";
import { AppError, withErrorHandler } from "@/lib/utils/errors";

/**
 * GET /api/tasks/[id]
 * 获取任务详情（JSend success 格式）
 *
 * 返回格式：
 * {
 *   status: 'success',
 *   data: GenerationRequest  // 包含 images 和 model（1:1关系）
 * }
 */
export const GET = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const generationRequest = await GenerationRequestService.getRequestById(id);

    // JSend success 格式
    return success(generationRequest);
  },
);

/**
 * PATCH /api/tasks/[id]
 * 选择图片并触发3D模型生成（JSend success/fail 格式）
 *
 * Body: { selectedImageIndex: number }
 *
 * 新架构核心变更：
 * - 1 Request : 1 Model（每个请求只能生成一个3D模型）
 *
 * 返回格式：
 * {
 *   status: 'success',
 *   data: {
 *     model: GeneratedModel,
 *     selectedImageIndex: number
 *   }
 * }
 */
export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const body = await request.json();
    const { selectedImageIndex } = body;

    // 验证参数 - 使用 AppError 自动转换为 JSend fail 格式
    if (typeof selectedImageIndex !== "number") {
      throw new AppError("VALIDATION_ERROR", "selectedImageIndex 必须是数字");
    }

    // 使用新的 ModelService 创建 3D 模型生成任务
    // 新架构：接受 requestId 和 imageIndex，自动验证 1:1 约束
    const newModel = await ModelService.createModelForRequest(
      id,
      selectedImageIndex,
    );

    // JSend success 格式 - 返回模型数据
    return success({
      model: newModel,
      selectedImageIndex,
    });
  },
);
