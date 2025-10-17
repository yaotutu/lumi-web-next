import { type NextRequest, NextResponse } from "next/server";
import * as TaskService from "@/lib/services/task-service";
import { withErrorHandler } from "@/lib/utils/errors";
import { updateTaskSchema } from "@/lib/validators/task-validators";
import { prisma } from "@/lib/db/prisma";

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
 * 职责：只负责更新任务状态和数据
 * Worker会监听状态变化并执行对应操作
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

    // 获取当前任务状态
    const currentTask = await TaskService.getTaskById(id);

    // 🎯 特殊逻辑：当更新 selectedImageIndex 时，自动将状态变更为 MODEL_PENDING
    // 这样Worker会监听到状态变化并开始3D模型生成
    // 支持的状态: IMAGE_COMPLETED(首次生成) | FAILED(失败重试) | MODEL_COMPLETED(重新生成)
    if (
      validatedData.selectedImageIndex !== undefined &&
      (currentTask.status === "IMAGE_COMPLETED" ||
        currentTask.status === "FAILED" ||
        currentTask.status === "MODEL_COMPLETED")
    ) {
      // 如果是MODEL_COMPLETED状态,需要先删除旧的模型记录
      if (currentTask.status === "MODEL_COMPLETED") {
        await prisma.model.deleteMany({
          where: { taskId: id },
        });
      }

      // 同时更新 selectedImageIndex 和状态
      const updatedTask = await TaskService.updateTask(id, {
        ...validatedData,
        status: "MODEL_PENDING", // 触发 Worker 监听
        // 清除旧的完成时间和错误信息
        modelGenerationStartedAt: null,
        modelGenerationCompletedAt: null,
        completedAt: null,
        failedAt: null,
        errorMessage: null,
      });

      return NextResponse.json({
        success: true,
        data: updatedTask,
        message: "图片已选择，3D模型生成已启动",
      });
    }

    // 其他情况：正常更新任务
    const task = await TaskService.updateTask(id, validatedData);

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
