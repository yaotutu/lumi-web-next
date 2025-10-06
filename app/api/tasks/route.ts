import { NextRequest, NextResponse } from "next/server";
import { MOCK_USER } from "@/lib/constants";
import { withErrorHandler } from "@/lib/utils/errors";
import * as TaskService from "@/lib/services/task-service";
import * as QueueService from "@/lib/services/queue-service";
import { TaskStatus } from "@prisma/client";
import { createTaskSchema, listTasksQuerySchema } from "@/lib/validators/task-validators";
import { ZodError } from "zod";

/**
 * GET /api/tasks
 * 获取用户的任务列表
 */
export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  // 使用Zod验证查询参数
  try {
    const statusParam = searchParams.get("status");
    const limitParam = searchParams.get("limit");

    const queryParams = {
      status: statusParam === null ? undefined : (statusParam as TaskStatus),
      limit: limitParam === null ? undefined : limitParam,
    };

    const validatedParams = listTasksQuerySchema.parse(queryParams);
    const { status, limit } = validatedParams;

    const tasks = await TaskService.listTasks(MOCK_USER.id, { status, limit });

    return NextResponse.json({
      success: true,
      data: tasks,
      count: tasks.length,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "查询参数验证失败",
          details: error.issues,
        },
        { status: 400 },
      );
    }
    throw error;
  }
};

/**
 * POST /api/tasks
 * 创建新任务并加入队列
 */
export const POST = async (request: NextRequest) => {
  const body = await request.json();

  // 使用Zod验证输入
  try {
    const validatedData = createTaskSchema.parse(body);
    const { prompt } = validatedData;

    // 创建任务
    const task = await TaskService.createTask(MOCK_USER.id, prompt);

    // 添加到任务队列
    await QueueService.enqueueTask(task.id, task.prompt);

    // 获取队列状态
    const queueStatus = QueueService.getStatus();

    return NextResponse.json(
      {
        success: true,
        data: task,
        queue: queueStatus,
      },
      { status: 201 },
    );
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