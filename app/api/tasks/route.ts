import type { TaskStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { MOCK_USER } from "@/lib/constants";
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
 * 创建新任务
 *
 * 职责：只负责创建任务并设置状态为GENERATING_IMAGES
 * Worker会监听状态变化并执行图片生成操作
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 使用Zod验证输入（错误会被withErrorHandler自动捕获）
  const validatedData = createTaskSchema.parse(body);
  const { prompt } = validatedData;

  // 创建任务并直接设置状态为GENERATING_IMAGES
  // Worker会自动检测并处理此状态的任务
  const task = await TaskService.createTaskWithStatus(
    MOCK_USER.id,
    prompt,
    "GENERATING_IMAGES",
  );

  return NextResponse.json(
    {
      success: true,
      data: task,
      message: "任务已创建，图片生成已启动",
    },
    { status: 201 },
  );
});
