/**
 * 打印状态查询接口
 */

import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler, AppError } from "@/lib/utils/errors";
import * as GenerationRequestService from "@/lib/services/generation-request-service";

/**
 * GET /api/tasks/:id/print-status
 * 查询打印任务状态
 */
export const GET = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;

    // 1. 获取请求详情
    const request = await GenerationRequestService.getRequestById(id);

    // 2. 找到已完成的模型
    const completedModel = request.generatedModels?.find(
      (model) => model.generationJob?.status === "COMPLETED" && model.modelUrl,
    );

    if (!completedModel) {
      throw new AppError("NOT_FOUND", "未找到已完成的3D模型");
    }

    // 3. 检查是否有 sliceTaskId
    if (!completedModel.sliceTaskId) {
      return NextResponse.json({
        success: true,
        data: {
          requestId: id,
          modelId: completedModel.id,
          hasPrintTask: false,
          message: "尚未提交打印任务",
        },
      });
    }

    // 4. 调用外部打印服务查询状态
    const printServiceUrl = `http://192.168.110.214:80/api/v1/tasks/${completedModel.sliceTaskId}`;

    console.log(
      `🔍 [打印状态] 查询打印任务状态: sliceTaskId=${completedModel.sliceTaskId}`,
    );

    try {
      const response = await fetch(printServiceUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error(`❌ [打印状态] 查询失败:`, {
          sliceTaskId: completedModel.sliceTaskId,
          statusCode: response.status,
          responseBody: responseText,
        });

        throw new AppError(
          "EXTERNAL_API_ERROR",
          `查询打印状态失败: ${response.status}`,
        );
      }

      const printStatus = JSON.parse(responseText);

      console.log(`✅ [打印状态] 查询成功:`, printStatus);

      return NextResponse.json({
        success: true,
        data: {
          requestId: id,
          modelId: completedModel.id,
          sliceTaskId: completedModel.sliceTaskId,
          hasPrintTask: true,
          printStatus,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error(`❌ [打印状态] 查询异常:`, error);

      throw new AppError(
        "EXTERNAL_API_ERROR",
        `查询打印状态异常: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  },
);
