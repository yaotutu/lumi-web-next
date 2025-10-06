import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import * as TaskService from "@/lib/services/task-service";
import { updateTaskSchema } from "@/lib/validators/task-validators";
import { ZodError } from "zod";

/**
 * GET /api/tasks/:id
 * 获取任务详情
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const task = await TaskService.getTaskById(id);

  return NextResponse.json({
    success: true,
    data: task,
  });
});

/**
 * PATCH /api/tasks/:id
 * 更新任务信息
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const body = await request.json();

  // 使用Zod验证输入
  try {
    const validatedData = updateTaskSchema.parse(body);

    const task = await TaskService.updateTask(id, validatedData);

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "输入验证失败",
          details: error.issues,
        },
        { status: 400 },
      );
    }
    throw error;
  }
};

/**
 * DELETE /api/tasks/:id
 * 删除任务及相关资源
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  await TaskService.deleteTask(id);

  return NextResponse.json({
    success: true,
    message: "Task deleted successfully",
  });
});