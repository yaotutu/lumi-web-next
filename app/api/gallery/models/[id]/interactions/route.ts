/**
 * 模型交互 API - 点赞/收藏操作
 *
 * GET  /api/gallery/models/[id]/interactions - 获取用户对该模型的交互状态
 * POST /api/gallery/models/[id]/interactions - 执行点赞/收藏操作
 */

import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/utils/errors";
import { InteractionType } from "@prisma/client";
import * as InteractionService from "@/lib/services/interaction-service";
import { getCurrentUser } from "@/lib/utils/auth";
import { z } from "zod";

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

    // 获取当前用户会话信息
    const userSession = await getCurrentUser();

    const body = await request.json();
    const { type } = interactionSchema.parse(body);

    // 执行交互操作（点赞/收藏切换）
    const result = await InteractionService.toggleInteraction({
      userId: userSession.userId,
      modelId,
      type,
    });

    console.log(`👍 用户 ${userSession.userId} 对模型 ${modelId} 执行 ${type} 操作`, {
      isInteracted: result.isInteracted,
      newLikeCount: result.model.likeCount,
      newFavoriteCount: result.model.favoriteCount,
    });

    return NextResponse.json({
      success: true,
      data: {
        isInteracted: result.isInteracted,
        type,
        likeCount: result.model.likeCount,
        favoriteCount: result.model.favoriteCount,
      },
    });
  },
);

/**
 * GET /api/gallery/models/[id]/interactions
 * 获取用户对该模型的交互状态
 */
export const GET = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id: modelId } = await params;

    try {
      // 尝试获取当前用户会话信息
      const userSession = await getCurrentUser();

      // 获取用户对该模型的交互状态
      const interactions = await InteractionService.getUserModelInteractions(
        userSession.userId,
        modelId,
      );

      return NextResponse.json({
        success: true,
        data: {
          isAuthenticated: true,
          interactions,
          isLiked: interactions.includes(InteractionType.LIKE),
          isFavorited: interactions.includes(InteractionType.FAVORITE),
        },
      });
    } catch (error) {
      // 用户未登录
      return NextResponse.json({
        success: true,
        data: {
          isAuthenticated: false,
          interactions: [],
        },
      });
    }
  },
);