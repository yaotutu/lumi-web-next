import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MOCK_USER, IMAGE_GENERATION } from "@/lib/constants";
import { TaskStatus } from "@prisma/client";
import { generateImageStream } from "@/lib/aliyun-image";

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
 * 后台异步生成图片任务
 */
async function generateImagesInBackground(taskId: string, prompt: string) {
  try {
    // 更新任务状态为生成中
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "GENERATING_IMAGES",
        imageGenerationStartedAt: new Date(),
      },
    });

    let index = 0;

    // 生成图片
    for await (const imageUrl of generateImageStream(
      prompt,
      IMAGE_GENERATION.COUNT,
    )) {
      // 保存图片到数据库
      await prisma.taskImage.create({
        data: {
          taskId,
          url: imageUrl,
          index,
        },
      });
      index++;
    }

    // 更新任务状态为图片就绪
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "IMAGES_READY",
        imageGenerationCompletedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Background image generation failed:", error);
    // 更新任务状态为失败
    await prisma.task
      .update({
        where: { id: taskId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      })
      .catch((err) => console.error("Failed to update task status:", err));
  }
}

/**
 * POST /api/tasks
 * 创建新任务并立即触发图片生成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Prompt is required" },
        { status: 400 },
      );
    }

    const task = await prisma.task.create({
      data: {
        userId: MOCK_USER.id,
        prompt: prompt.trim(),
        status: "PENDING",
      },
      include: {
        images: true,
        model: true,
      },
    });

    // 立即在后台触发图片生成(不阻塞响应)
    generateImagesInBackground(task.id, prompt.trim());

    return NextResponse.json(
      {
        success: true,
        data: task,
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
