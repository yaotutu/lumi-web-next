import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tasks/:id/model
 * 创建3D模型记录
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Model name is required" },
        { status: 400 },
      );
    }

    const model = await prisma.taskModel.create({
      data: {
        taskId: id,
        name: name.trim(),
        status: "PENDING",
        progress: 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: model,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create model:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create model" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/tasks/:id/model
 * 更新3D模型信息
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 查找该任务的模型
    const existingModel = await prisma.taskModel.findUnique({
      where: { taskId: id },
    });

    if (!existingModel) {
      return NextResponse.json(
        { success: false, error: "Model not found" },
        { status: 404 },
      );
    }

    const model = await prisma.taskModel.update({
      where: { id: existingModel.id },
      data: body,
    });

    return NextResponse.json({
      success: true,
      data: model,
    });
  } catch (error) {
    console.error("Failed to update model:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update model" },
      { status: 500 },
    );
  }
}
