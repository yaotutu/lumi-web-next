import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import * as ImageModelService from "@/lib/services/image-model-service";
import { addImageSchema } from "@/lib/validators/task-validators";
import { ZodError } from "zod";

/**
 * POST /api/tasks/:id/images
 * 保存任务的图片记录
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const body = await request.json();

  // 使用Zod验证输入
  try {
    const validatedData = addImageSchema.parse(body);

    const image = await ImageModelService.addImageToTask(id, validatedData);

    return NextResponse.json(
      {
        success: true,
        data: image,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "图片数据验证失败",
          details: error.issues,
        },
        { status: 400 },
      );
    }
    throw error;
  }
};