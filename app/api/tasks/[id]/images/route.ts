import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tasks/:id/images
 * 保存任务的图片记录
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { url, index, aliyunTaskId, aliyunRequestId } = body;

    if (typeof url !== "string" || typeof index !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid image data" },
        { status: 400 },
      );
    }

    const image = await prisma.taskImage.create({
      data: {
        taskId: id,
        url,
        index,
        aliyunTaskId,
        aliyunRequestId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: image,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to save image:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save image" },
      { status: 500 },
    );
  }
}
