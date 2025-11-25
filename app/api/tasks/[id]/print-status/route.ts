/**
 * 打印状态查询接口
 *
 * 新架构：1 Request : 1 Model
 */

import { type NextRequest, NextResponse } from "next/server";
import * as GenerationRequestService from "@/lib/services/generation-request-service";
import { AppError, withErrorHandler } from "@/lib/utils/errors";

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

    // 2. 新架构：1 Request : 1 Model
    const model = request.model;

    if (!model) {
      throw new AppError("NOT_FOUND", "未找到关联的3D模型");
    }

    // 检查模型是否已完成
    if (model.generationJob?.status !== "COMPLETED" || !model.modelUrl) {
      throw new AppError("INVALID_STATE", "3D模型尚未生成完成");
    }

    // 3. 检查是否有 sliceTaskId
    if (!model.sliceTaskId) {
      return NextResponse.json({
        success: true,
        data: {
          requestId: id,
          modelId: model.id,
          hasPrintTask: false,
          message: "尚未提交打印任务",
        },
      });
    }

    // 4. 调用外部打印服务查询状态
    const printServiceUrl = `http://192.168.110.214:80/api/v1/tasks/${model.sliceTaskId}`;

    console.log(
      `🔍 [打印状态] 查询打印任务状态: sliceTaskId=${model.sliceTaskId}`,
    );

    try {
      const response = await fetch(printServiceUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error(`❌ [打印状态] 查询失败:`, {
          sliceTaskId: model.sliceTaskId,
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
          modelId: model.id,
          sliceTaskId: model.sliceTaskId,
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
