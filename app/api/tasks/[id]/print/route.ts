/**
 * 打印接口 - 一键打印功能
 *
 * 新架构：1 Request : 1 Model
 */

import { type NextRequest, NextResponse } from "next/server";
import * as GenerationRequestService from "@/lib/services/generation-request-service";
import * as ModelService from "@/lib/services/model-service";
import { AppError, withErrorHandler } from "@/lib/utils/errors";

/**
 * POST /api/tasks/:id/print
 * 一键打印：将3D模型提交到打印服务
 */
export const POST = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;

    // 1. 获取请求详情
    const request = await GenerationRequestService.getRequestById(id);

    // 2. 新架构：1 Request : 1 Model（通过 request.model 访问）
    const model = request.model;

    if (!model) {
      throw new AppError("NOT_FOUND", "未找到关联的3D模型");
    }

    // 检查模型是否已完成
    if (model.generationJob?.status !== "COMPLETED" || !model.modelUrl) {
      throw new AppError("INVALID_STATE", "3D模型尚未生成完成");
    }

    // 3. 提取对象存储路径
    const objectPath = extractObjectPath(model.modelUrl);

    // 4. 准备文件名
    let fileName = model.name;
    if (!fileName.includes(".")) {
      fileName = `${fileName}.${model.format.toLowerCase()}`;
    }

    // 5. 调用打印服务
    const printRequest = {
      task_name: `切片任务-${request.prompt.substring(0, 20)}`,
      object_path: objectPath,
      file_name: fileName,
      auto_orient: true,
      auto_arrange: true,
      auto_convert_unit: true,
      scale: 2,
      upload_to_printer: true,
      auto_print: true,
      moonraker_url: "http://192.168.200.209:7125",
      enable_support: true,
    };

    const response = await fetch("http://192.168.110.210:80/api/v1/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(printRequest),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new AppError(
        "EXTERNAL_API_ERROR",
        `打印服务错误: ${response.status}`,
      );
    }

    const printResult = JSON.parse(responseText);

    // 6. 保存 sliceTaskId 到数据库
    const sliceTaskId = printResult.slice_task_id;
    if (sliceTaskId && model.id) {
      try {
        await ModelService.updateSliceTaskId(model.id, sliceTaskId);
        console.log(
          `✅ [打印接口] 已保存切片任务ID: modelId=${model.id}, sliceTaskId=${sliceTaskId}`,
        );
      } catch (saveError) {
        // 保存失败只记录日志，不影响返回
        console.warn(`⚠️ [打印接口] 保存切片任务ID失败:`, saveError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        requestId: id,
        modelId: model.id,
        sliceTaskId,
        printResult,
      },
      message: "打印任务已提交",
    });
  },
);

/**
 * 从模型 URL 提取对象存储路径
 */
function extractObjectPath(modelUrl: string): string {
  if (modelUrl.startsWith("https://") || modelUrl.startsWith("http://")) {
    try {
      const url = new URL(modelUrl);
      return url.pathname.substring(1);
    } catch (_error) {
      // 继续处理
    }
  }

  if (modelUrl.startsWith("/generated/")) {
    return modelUrl.replace(/^\/generated\//, "");
  }

  if (modelUrl.startsWith("models/")) {
    return modelUrl;
  }

  return modelUrl.replace(/^\/+/, "");
}
