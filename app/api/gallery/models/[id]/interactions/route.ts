/**
 * 模型交互 API - 点赞/收藏操作（JSend 规范）
 *
 * GET  /api/gallery/models/[id]/interactions - 获取用户对该模型的交互状态（公开）
 * POST /api/gallery/models/[id]/interactions - 执行点赞/收藏操作（需要登录）
 *
 * 认证架构：
 * - POST 方法由 middleware 保护，直接从请求头读取 userId
 * - GET 方法公开访问，内部检查认证状态返回不同数据
 */

import { InteractionType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { z } from "zod";
import * as InteractionService from "@/lib/services/interaction-service";
import { success } from "@/lib/utils/api-response";
import { checkAuthStatus } from "@/lib/utils/auth";
import { withErrorHandler } from "@/lib/utils/errors";
import { getUserIdFromRequest } from "@/lib/utils/request-auth";

// 请求体验证 schema
const interactionSchema = z.object({
  type: z.enum([InteractionType.LIKE, InteractionType.FAVORITE]),
});

/**
 * POST /api/gallery/models/[id]/interactions
 * 执行点赞/收藏操作（切换状态）
 *
 * 认证：Middleware 已验证，直接从请求头读取 userId
 */
export const POST = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id: modelId } = await params;

    // 从请求头读取 userId（middleware 已验证）
    const userId = getUserIdFromRequest(request);

    const body = await request.json();
    const { type } = interactionSchema.parse(body);

    // 执行交互操作（点赞/收藏切换）
    const result = await InteractionService.toggleInteraction({
      userId,
      modelId,
      type,
    });

    console.log(`👍 用户 ${userId} 对模型 ${modelId} 执行 ${type} 操作`, {
      isInteracted: result.isInteracted,
      newLikeCount: result.model.likeCount,
      newFavoriteCount: result.model.favoriteCount,
    });

    // JSend success 格式
    return success({
      isInteracted: result.isInteracted,
      type,
      likeCount: result.model.likeCount,
      favoriteCount: result.model.favoriteCount,
    });
  },
);

/**
 * GET /api/gallery/models/[id]/interactions
 * 获取用户对该模型的交互状态
 */
export const GET = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id: modelId } = await params;

    // 检查认证状态
    const authResult = await checkAuthStatus();
    if (!authResult.isAuthenticated || !authResult.userSession) {
      // 用户未登录（JSend success 格式）
      return success({
        isAuthenticated: false,
        interactions: [],
      });
    }

    // 获取用户对该模型的交互状态
    const interactions = await InteractionService.getUserModelInteractions(
      authResult.userSession.userId,
      modelId,
    );

    // JSend success 格式
    return success({
      isAuthenticated: true,
      interactions,
      isLiked: interactions.includes(InteractionType.LIKE),
      isFavorited: interactions.includes(InteractionType.FAVORITE),
    });
  },
);
