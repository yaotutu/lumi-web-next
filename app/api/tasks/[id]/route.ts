import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LocalStorage } from "@/lib/storage";

/**
 * GET /api/tasks/:id
 * 获取任务详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { index: "asc" },
        },
        model: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Failed to fetch task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch task" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/tasks/:id
 * 更新任务信息
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const task = await prisma.task.update({
      where: { id },
      data: body,
      include: {
        images: true,
        model: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tasks/:id
 * 删除任务及相关资源
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // 删除本地文件资源
    await LocalStorage.deleteTaskResources(id);

    // 删除数据库记录（级联删除 images 和 model）
    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
