import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import * as ImageModelService from "@/lib/services/image-model-service";
import { addImageSchema } from "@/lib/validators/task-validators";

/**
 * POST /api/tasks/:id/images
 * 保存任务的图片记录
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const body = await request.json();

  // 使用Zod验证输入
  const validatedData = addImageSchema.parse(body);

  const image = await ImageModelService.addImageToTask(id, validatedData);

  return NextResponse.json(
    {
      success: true,
      data: image,
    },
    { status: 201 },
  );
});