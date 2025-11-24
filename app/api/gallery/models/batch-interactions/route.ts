/**
 * 批量交互状态查询 API
 *
 * POST /api/gallery/models/batch-interactions - 批量获取用户对多个模型的交互状态
 */

import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import * as InteractionService from "@/lib/services/interaction-service";
import { getCurrentUser } from "@/lib/auth-client";
import { z } from "zod";

// 请求体验证 schema
const batchInteractionsSchema = z.object({
  modelIds: z.array(z.string()).min(1).max(50), // 最多一次查询50个模型
});

/**
 * POST /api/gallery/models/batch-interactions
 * 批量获取用户对多个模型的交互状态
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({
      success: true,
      data: {
        isAuthenticated: false,
        interactions: {},
      },
    });
  }

  const body = await request.json();
  const { modelIds } = batchInteractionsSchema.parse(body);

  // 批量获取用户对多个模型的交互状态
  const interactionsMap = await InteractionService.getBatchUserModelInteractions(
    user.id,
    modelIds,
  );

  console.log(`📊 用户 ${user.id} 批量查询 ${modelIds.length} 个模型的交互状态`, {
    interactionCount: Object.keys(interactionsMap).length,
  });

  return NextResponse.json({
    success: true,
    data: {
      isAuthenticated: true,
      interactions: interactionsMap,
    },
  });
});