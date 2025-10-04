import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MOCK_USER } from "@/lib/constants";
import { TaskStatus } from "@prisma/client";

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
 * 创建新任务
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
