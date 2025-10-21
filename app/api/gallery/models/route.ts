/**
 * 模型画廊 API - 获取公开模型列表
 *
 * GET /api/gallery/models
 * 查询参数：
 * - sortBy: "latest" | "popular" (默认: "latest")
 * - limit: number (默认: 20)
 * - offset: number (默认: 0)
 */

import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import {
  findPublicAssets,
  countPublicAssets,
} from "@/lib/repositories/user-asset.repository";

// GET /api/gallery/models - 获取公开模型列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  // 解析查询参数
  const sortBy = (searchParams.get("sortBy") || "latest") as
    | "latest"
    | "popular";
  const limit = Number(searchParams.get("limit")) || 20;
  const offset = Number(searchParams.get("offset")) || 0;

  // 调用 repository 查询公开模型
  const models = await findPublicAssets({
    sortBy,
    limit,
    offset,
  });

  // 统计总数（用于判断是否还有更多）
  const total = await countPublicAssets();

  // 判断是否还有更多
  const hasMore = offset + models.length < total;

  // 返回标准响应
  return NextResponse.json({
    success: true,
    data: {
      models,
      total,
      hasMore,
    },
  });
});
