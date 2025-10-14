import { type NextRequest, NextResponse } from "next/server";
import * as TaskService from "@/lib/services/task-service";
import { withErrorHandler } from "@/lib/utils/errors";

/**
 * POST /api/tasks/:id/retry
 * 重试失败的任务
 *
 * Worker架构说明：
 * - API层只负责更新任务状态
 * - Worker监听状态变化，自动开始处理
 *
 * 请求体:
 * - type: "images" | "model" - 重试类型
 *
 * 逻辑:
 * - type="images": 清理旧数据，状态设为GENERATING_IMAGES，Worker自动处理
 * - type="model": 清理旧模型，状态设为GENERATING_MODEL，Worker自动处理
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
      // 重试图片生成：清理旧数据，状态设为IMAGE_PENDING
      // retryImageGeneration 内部已经处理状态更新
      const updatedTask = await TaskService.retryImageGeneration(id);

      return NextResponse.json({
        success: true,
        data: updatedTask,
        message: "图片生成已重新启动",
      });
    }

    // 重试3D模型生成：清理旧模型，状态设为MODEL_PENDING
    // retryModelGeneration 内部已经处理状态更新
    const updatedTask = await TaskService.retryModelGeneration(id);

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: "3D模型生成已重新启动",
    });
  },
);
