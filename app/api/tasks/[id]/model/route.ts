import { type NextRequest, NextResponse } from "next/server";
import * as ImageModelService from "@/lib/services/image-model-service";
import { withErrorHandler } from "@/lib/utils/errors";
import {
  createModelSchema,
  updateModelSchema,
} from "@/lib/validators/task-validators";

/**
 * POST /api/tasks/:id/model
 * 创建3D模型记录
 */
export const POST = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const body = await request.json();

    // 使用Zod验证输入（错误会被withErrorHandler自动捕获）
    const validatedData = createModelSchema.parse(body);

    // 调用Service层创建模型
    const model = await ImageModelService.createModelForTask(id, validatedData);

    return NextResponse.json(
      {
        success: true,
        data: model,
      },
      { status: 201 },
    );
  },
);

/**
 * PATCH /api/tasks/:id/model
 * 更新3D模型信息
 */
export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const body = await request.json();

    // 使用Zod验证输入（错误会被withErrorHandler自动捕获）
    const validatedData = updateModelSchema.parse(body);

    // 调用Service层更新模型
    const model = await ImageModelService.updateTaskModel(id, validatedData);

    return NextResponse.json({
      success: true,
      data: model,
    });
  },
);
