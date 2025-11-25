/**
 * 模型画廊 API - 增加下载计数
 *
 * POST /api/gallery/models/[id]/download
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  findModelById,
  incrementModelCount,
} from "@/lib/repositories/model.repository";
import { AppError, withErrorHandler } from "@/lib/utils/errors";

// POST /api/gallery/models/[id]/download - 增加下载计数
export const POST = withErrorHandler(
  async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ) => {
    // 等待 params（Next.js 15 要求）
    const params = await context.params;
    const { id } = params;

    // 检查模型是否存在
    const model = await findModelById(id);
    if (!model) {
      throw new AppError("NOT_FOUND", `模型不存在: ${id}`);
    }

    // 增加下载计数
    await incrementModelCount(id, "downloadCount");

    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: "下载计数已更新",
    });
  },
);
