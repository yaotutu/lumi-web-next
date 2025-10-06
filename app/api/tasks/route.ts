import type { TaskStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { MOCK_USER } from "@/lib/constants";
import * as QueueService from "@/lib/services/queue-service";
import * as TaskService from "@/lib/services/task-service";
import { withErrorHandler } from "@/lib/utils/errors";
import {
  createTaskSchema,
  listTasksQuerySchema,
} from "@/lib/validators/task-validators";

/**
 * GET /api/tasks
 * 获取用户的任务列表
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  // 提取查询参数
  const statusParam = searchParams.get("status");
  const limitParam = searchParams.get("limit");

  const queryParams = {
    status: statusParam === null ? undefined : (statusParam as TaskStatus),
    limit: limitParam === null ? undefined : limitParam,
  };

  // 使用Zod验证查询参数（错误会被withErrorHandler自动捕获）
  const validatedParams = listTasksQuerySchema.parse(queryParams);
  const { status, limit } = validatedParams;

  // 调用Service层获取任务列表
  const tasks = await TaskService.listTasks(MOCK_USER.id, { status, limit });

  return NextResponse.json({
    success: true,
    data: tasks,
    count: tasks.length,
  });
});

/**
 * POST /api/tasks
 * 创建新任务并加入队列
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 使用Zod验证输入（错误会被withErrorHandler自动捕获）
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
});
