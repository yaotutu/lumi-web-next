import { type NextRequest, NextResponse } from "next/server";
import * as TaskService from "@/lib/services/task-service";
import { addImageTask } from "@/lib/image-queue";
import { addModel3DTask } from "@/lib/model3d-queue";
import { withErrorHandler } from "@/lib/utils/errors";

/**
 * POST /api/tasks/:id/retry
 * 重试失败的任务
 *
 * 请求体:
 * - type: "images" | "model" - 重试类型
 *
 * 逻辑:
 * - type="images": 重置任务为PENDING,清理旧图片和模型,重新加入图片生成队列
 * - type="model": 重置任务为IMAGES_READY,清理旧模型,重新加入3D模型生成队列
 */
export const POST = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const body = await request.json();

    // 验证请求体
    const { type } = body;
    if (type !== "images" && type !== "model") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "type 必须是 'images' 或 'model'",
          },
        },
        { status: 400 },
      );
    }

    // 根据类型执行不同的重试逻辑
    if (type === "images") {
      // 重试图片生成
      const task = await TaskService.retryImageGeneration(id);

      // 重新加入图片生成队列
      addImageTask(id).catch((error) => {
        console.error("重新加入图片生成队列失败:", error);
      });

      return NextResponse.json({
        success: true,
        data: task,
        message: "图片生成已重新启动",
      });
    }

    // 重试3D模型生成
    const task = await TaskService.retryModelGeneration(id);

    // 重新加入3D模型生成队列
    addModel3DTask(id).catch((error) => {
      console.error("重新加入3D模型生成队列失败:", error);
    });

    return NextResponse.json({
      success: true,
      data: task,
      message: "3D模型生成已重新启动",
    });
  },
);
