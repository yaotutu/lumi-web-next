import { type NextRequest, NextResponse } from "next/server";
import * as TaskService from "@/lib/services/task-service";
import * as QueueService from "@/lib/services/queue-service";
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
      // 重试图片生成：重置任务为PENDING状态
      const task = await TaskService.retryImageGeneration(id);

      // 加入图片生成队列（自动开始处理）
      await QueueService.enqueueTask(id, task.prompt);

      return NextResponse.json({
        success: true,
        data: task,
        message: "图片生成已重新启动",
      });
    }

    // 重试3D模型生成：重置任务为IMAGES_READY状态
    // 注意：3D模型生成使用Worker架构，只需要更新状态为GENERATING_MODEL即可
    // Worker会自动监听状态变化并开始处理
    const task = await TaskService.retryModelGeneration(id);

    // 将状态更新为GENERATING_MODEL，触发Worker处理
    const updatedTask = await TaskService.updateTask(id, {
      status: "GENERATING_MODEL",
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: "3D模型生成已重新启动",
    });
  },
);
