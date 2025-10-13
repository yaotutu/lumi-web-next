import { type NextRequest, NextResponse } from "next/server";
import * as TaskService from "@/lib/services/task-service";
import { addModel3DTask } from "@/lib/model3d-queue";
import { withErrorHandler } from "@/lib/utils/errors";
import { updateTaskSchema } from "@/lib/validators/task-validators";

/**
 * GET /api/tasks/:id
 * 获取任务详情
 */
export const GET = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const task = await TaskService.getTaskById(id);

    return NextResponse.json({
      success: true,
      data: task,
    });
  },
);

/**
 * PATCH /api/tasks/:id
 * 更新任务信息
 *
 * 特殊逻辑：当更新 selectedImageIndex 时，自动触发3D模型生成队列
 */
export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const body = await request.json();

    // 使用Zod验证输入（错误会被withErrorHandler自动捕获）
    const validatedData = updateTaskSchema.parse(body);

    // 调用Service层更新任务
    const task = await TaskService.updateTask(id, validatedData);

    // 🎯 关键逻辑：如果更新了 selectedImageIndex，自动触发3D模型生成
    if (
      validatedData.selectedImageIndex !== undefined &&
      task.status === "IMAGES_READY"
    ) {
      // 异步触发3D模型生成任务（不等待完成）
      addModel3DTask(id).catch((error) => {
        console.error("启动3D模型生成任务失败:", error);
      });
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  },
);

/**
 * DELETE /api/tasks/:id
 * 删除任务及相关资源
 */
export const DELETE = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    await TaskService.deleteTask(id);

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  },
);
