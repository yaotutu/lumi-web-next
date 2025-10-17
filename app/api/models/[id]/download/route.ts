import { type NextRequest, NextResponse } from "next/server";
import * as ModelService from "@/lib/services/model-service";
import { withErrorHandler } from "@/lib/utils/errors";
import { modelIdSchema } from "@/lib/validators/model-validators";

/**
 * POST /api/models/:id/download
 * 记录模型下载（增加下载计数）
 *
 * 注意：实际文件下载由客户端直接从 modelUrl 下载
 * 此接口仅用于统计下载次数
 */
export const POST = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;

    // 验证模型 ID
    const modelId = modelIdSchema.parse(id);

    // TODO: 获取当前用户ID（可选，用于权限验证）
    const userId = undefined;

    // 验证模型存在且有权访问
    const model = await ModelService.getModelById(modelId, userId);

    // 增加下载计数
    await ModelService.incrementDownloadCount(modelId);

    return NextResponse.json({
      success: true,
      data: {
        modelId,
        modelUrl: model.modelUrl,
        downloadCount: model.downloadCount + 1,
      },
      message: "下载记录成功",
    });
  },
);
