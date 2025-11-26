/**
 * 模型画廊 API - 增加下载计数（JSend 规范）
 *
 * POST /api/gallery/models/[id]/download
 */

import { type NextRequest } from "next/server";
import {
  findModelById,
  incrementModelCount,
} from "@/lib/repositories/model.repository";
import { AppError, withErrorHandler } from "@/lib/utils/errors";
import { success } from "@/lib/utils/api-response";

// POST /api/gallery/models/[id]/download - 增加下载计数
export const POST = withErrorHandler(
  async (
    _request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ) => {
    // 等待 params（Next.js 15 要求）
    const params = await context.params;
    const { id } = params;

    // 检查模型是否存在（自动转换为 JSend fail 格式）
    const model = await findModelById(id);
    if (!model) {
      throw new AppError("NOT_FOUND", `模型不存在: ${id}`);
    }

    // 增加下载计数
    await incrementModelCount(id, "downloadCount");

    // JSend success 格式
    return success({
      message: "下载计数已更新",
    });
  },
);
