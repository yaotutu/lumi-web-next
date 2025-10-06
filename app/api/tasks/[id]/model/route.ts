import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import * as ImageModelService from "@/lib/services/image-model-service";
import { createModelSchema, updateTaskSchema } from "@/lib/validators/task-validators";
import { ZodError } from "zod";

/**
 * POST /api/tasks/:id/model
 * 创建3D模型记录
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const body = await request.json();

  // 使用Zod验证输入
  try {
    const validatedData = createModelSchema.parse(body);

    const model = await ImageModelService.createModelForTask(id, validatedData);

    return NextResponse.json(
      {
        success: true,
        data: model,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "模型数据验证失败",
          details: error.issues,
        },
        { status: 400 },
      );
    }
    throw error;
  }
};

/**
 * PATCH /api/tasks/:id/model
 * 更新3D模型信息
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const body = await request.json();

  // 使用Zod验证输入
  try {
    // 对于模型更新，我们使用updateTaskSchema的部分验证
    const validatedData = updateTaskSchema.partial().parse(body);

    const model = await ImageModelService.updateTaskModel(id, validatedData);

    return NextResponse.json({
      success: true,
      data: model,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "模型更新数据验证失败",
          details: error.issues,
        },
        { status: 400 },
      );
    }
    throw error;
  }
};