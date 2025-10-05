import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MOCK_USER } from "@/lib/constants";
import { TaskStatus } from "@prisma/client";
import { taskQueue } from "@/lib/task-queue";

/**
 * GET /api/tasks
 * 获取用户的任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as TaskStatus | null;
    const limit = parseInt(searchParams.get("limit") || "20");

    const tasks = await prisma.task.findMany({
      where: {
        userId: MOCK_USER.id,
        ...(status && { status }),
      },
      include: {
        images: {
          orderBy: { index: "asc" },
        },
        model: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tasks
 * 创建新任务并加入队列
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    // 验证输入
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Prompt is required" },
        { status: 400 },
      );
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      return NextResponse.json(
        { success: false, error: "Prompt cannot be empty" },
        { status: 400 },
      );
    }

    // 创建数据库任务记录
    const task = await prisma.task.create({
      data: {
        userId: MOCK_USER.id,
        prompt: trimmedPrompt,
        status: "PENDING",
      },
      include: {
        images: true,
        model: true,
      },
    });

    // 添加到任务队列(有错误捕获)
    try {
      const queueId = await taskQueue.addTask(task.id, trimmedPrompt);
      console.log(`[API] 任务已加入队列: ${task.id} -> ${queueId}`);
    } catch (queueError) {
      // 队列添加失败(如队列已满),更新任务状态
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage:
            queueError instanceof Error
              ? queueError.message
              : "Failed to add to queue",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            queueError instanceof Error
              ? queueError.message
              : "Failed to add task to queue",
        },
        { status: 503 }, // 503 Service Unavailable
      );
    }

    // 获取当前队列状态
    const queueStatus = taskQueue.getStatus();

    return NextResponse.json(
      {
        success: true,
        data: task,
        queue: queueStatus, // 返回队列状态给前端
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create task" },
      { status: 500 },
    );
  }
}
