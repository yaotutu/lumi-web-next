/**
 * 模型画廊 API - 获取模型详情
 *
 * GET /api/gallery/models/[id]
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  findModelById,
  incrementModelCount,
} from "@/lib/repositories/model.repository";
import { AppError, withErrorHandler } from "@/lib/utils/errors";

// GET /api/gallery/models/[id] - 获取模型详情
export const GET = withErrorHandler(
  async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ) => {
    // 等待 params（Next.js 15 要求）
    const params = await context.params;
    const { id } = params;

    // 查询模型详情
    const model = await findModelById(id);

    // 如果模型不存在，抛出 404 错误
    if (!model) {
      throw new AppError("NOT_FOUND", `模型不存在: ${id}`);
    }

    // 增加浏览计数（异步执行，不阻塞响应）
    incrementModelCount(id, "viewCount").catch((error: Error) => {
      console.error("增加浏览计数失败:", error);
    });

    // 返回模型详情
    return NextResponse.json({
      success: true,
      data: model,
    });
  },
);
