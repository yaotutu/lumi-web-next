/**
 * 模型交互 API - 点赞/收藏操作（JSend 规范）
 *
 * GET  /api/gallery/models/[id]/interactions - 获取用户对该模型的交互状态
 * POST /api/gallery/models/[id]/interactions - 执行点赞/收藏操作
 */

import { InteractionType } from "@prisma/client";
import { type NextRequest } from "next/server";
import { z } from "zod";
import * as InteractionService from "@/lib/services/interaction-service";
import { checkAuthStatus } from "@/lib/utils/auth";
import { withErrorHandler, AppError } from "@/lib/utils/errors";
import { success } from "@/lib/utils/api-response";

// 请求体验证 schema
const interactionSchema = z.object({
  type: z.enum([InteractionType.LIKE, InteractionType.FAVORITE]),
});

/**
 * POST /api/gallery/models/[id]/interactions
 * 执行点赞/收藏操作（切换状态）
 */
export const POST = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id: modelId } = await params;

    // 检查认证状态（使用 AppError 自动转换为 JSend fail 格式）
    const authResult = await checkAuthStatus();
    if (!authResult.isAuthenticated || !authResult.userSession) {
      throw new AppError("UNAUTHORIZED", "请先登录后再进行操作");
    }

    const body = await request.json();
    const { type } = interactionSchema.parse(body);

    // 执行交互操作（点赞/收藏切换）
    const result = await InteractionService.toggleInteraction({
      userId: authResult.userSession.userId,
      modelId,
      type,
    });

    console.log(
      `👍 用户 ${authResult.userSession.userId} 对模型 ${modelId} 执行 ${type} 操作`,
      {
        isInteracted: result.isInteracted,
        newLikeCount: result.model.likeCount,
        newFavoriteCount: result.model.favoriteCount,
      },
    );

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
