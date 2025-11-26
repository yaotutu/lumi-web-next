/**
 * 批量交互状态查询 API（JSend 规范）
 *
 * POST /api/gallery/models/batch-interactions - 批量获取用户对多个模型的交互状态
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import * as InteractionService from "@/lib/services/interaction-service";
import { success } from "@/lib/utils/api-response";
import { checkAuthStatus } from "@/lib/utils/auth";
import { withErrorHandler } from "@/lib/utils/errors";

// 请求体验证 schema
const batchInteractionsSchema = z.object({
  modelIds: z.array(z.string()).min(1).max(50), // 最多一次查询50个模型
});

/**
 * POST /api/gallery/models/batch-interactions
 * 批量获取用户对多个模型的交互状态
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // 检查认证状态
  const authResult = await checkAuthStatus();
  if (!authResult.isAuthenticated || !authResult.userSession) {
    // 用户未登录（JSend success 格式）
    return success({
      isAuthenticated: false,
      interactions: {},
    });
  }

  const body = await request.json();
  const { modelIds } = batchInteractionsSchema.parse(body);

  // 批量获取用户对多个模型的交互状态
  const interactionsMap =
    await InteractionService.getBatchUserModelInteractions(
      authResult.userSession.userId,
      modelIds,
    );

  console.log(
    `📊 用户 ${authResult.userSession.userId} 批量查询 ${modelIds.length} 个模型的交互状态`,
    {
      interactionCount: Object.keys(interactionsMap).length,
    },
  );

  // JSend success 格式
  return success({
    isAuthenticated: true,
    interactions: interactionsMap,
  });
});
