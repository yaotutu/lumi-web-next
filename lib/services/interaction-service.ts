/**
 * Interaction 服务层 - 业务逻辑层
 *
 * 职责：
 * - 点赞/收藏的业务逻辑处理
 * - 维护 Model 表的统计计数
 * - 调用 Repository 层进行数据访问
 *
 * 原则：
 * - 函数式编程，纯函数优先
 * - 使用统一错误处理
 * - 不直接操作数据库，通过 Repository 层
 */

import type { InteractionType } from "@prisma/client";
import {
  ModelInteractionRepository,
  ModelRepository,
} from "@/lib/repositories";
import { AppError } from "@/lib/utils/errors";

// ============================================
// 点赞操作
// ============================================

/**
 * 切换点赞状态（点赞/取消点赞）
 * @param userId 用户ID
 * @param modelId 模型ID
 * @returns 操作结果（是否点赞）
 * @throws AppError NOT_FOUND - 模型不存在
 */
export async function toggleLike(
  userId: string,
  modelId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  // 验证模型存在
  const model = await ModelRepository.findModelById(modelId);
  if (!model) {
    throw new AppError("NOT_FOUND", `模型不存在: ${modelId}`);
  }

  // 检查是否已点赞
  const hasLiked = await ModelInteractionRepository.hasInteraction(
    userId,
    modelId,
    "LIKE",
  );

  if (hasLiked) {
    // 取消点赞
    await ModelInteractionRepository.deleteInteraction(userId, modelId, "LIKE");
    const updatedModel = await ModelRepository.decrementModelCount(
      modelId,
      "likeCount",
    );
    return { liked: false, likeCount: updatedModel.likeCount };
  } else {
    // 点赞
    await ModelInteractionRepository.createInteraction({
      userId,
      modelId,
      type: "LIKE",
    });
    const updatedModel = await ModelRepository.incrementModelCount(
      modelId,
      "likeCount",
    );
    return { liked: true, likeCount: updatedModel.likeCount };
  }
}

// ============================================
// 收藏操作
// ============================================

/**
 * 切换收藏状态（收藏/取消收藏）
 * @param userId 用户ID
 * @param modelId 模型ID
 * @returns 操作结果（是否收藏）
 * @throws AppError NOT_FOUND - 模型不存在
 */
export async function toggleFavorite(
  userId: string,
  modelId: string,
): Promise<{ favorited: boolean; favoriteCount: number }> {
  // 验证模型存在
  const model = await ModelRepository.findModelById(modelId);
  if (!model) {
    throw new AppError("NOT_FOUND", `模型不存在: ${modelId}`);
  }

  // 检查是否已收藏
  const hasFavorited = await ModelInteractionRepository.hasInteraction(
    userId,
    modelId,
    "FAVORITE",
  );

  if (hasFavorited) {
    // 取消收藏
    await ModelInteractionRepository.deleteInteraction(
      userId,
      modelId,
      "FAVORITE",
    );
    const updatedModel = await ModelRepository.decrementModelCount(
      modelId,
      "favoriteCount",
    );
    return { favorited: false, favoriteCount: updatedModel.favoriteCount };
  } else {
    // 收藏
    await ModelInteractionRepository.createInteraction({
      userId,
      modelId,
      type: "FAVORITE",
    });
    const updatedModel = await ModelRepository.incrementModelCount(
      modelId,
      "favoriteCount",
    );
    return { favorited: true, favoriteCount: updatedModel.favoriteCount };
  }
}

// ============================================
// 查询操作
// ============================================

/**
 * 获取用户对模型的交互状态
 * @param userId 用户ID
 * @param modelId 模型ID
 * @returns 交互状态
 */
export async function getUserInteractionStatus(
  userId: string,
  modelId: string,
): Promise<{ liked: boolean; favorited: boolean }> {
  const interactions =
    await ModelInteractionRepository.findUserInteractionsForModel(
      userId,
      modelId,
    );

  return {
    liked: interactions.some((i) => i.type === "LIKE"),
    favorited: interactions.some((i) => i.type === "FAVORITE"),
  };
}

/**
 * 批量获取用户对多个模型的交互状态
 * @param userId 用户ID
 * @param modelIds 模型ID列表
 * @returns 交互状态映射
 */
export async function getUserInteractionStatusBatch(
  userId: string,
  modelIds: string[],
): Promise<Map<string, { liked: boolean; favorited: boolean }>> {
  const interactions =
    await ModelInteractionRepository.findUserInteractionsForModels(
      userId,
      modelIds,
    );

  // 初始化结果
  const result = new Map<string, { liked: boolean; favorited: boolean }>();
  for (const modelId of modelIds) {
    result.set(modelId, { liked: false, favorited: false });
  }

  // 填充交互状态
  for (const interaction of interactions) {
    const status = result.get(interaction.modelId);
    if (status) {
      if (interaction.type === "LIKE") {
        status.liked = true;
      } else if (interaction.type === "FAVORITE") {
        status.favorited = true;
      }
    }
  }

  return result;
}

/**
 * 获取用户点赞的模型列表
 * @param userId 用户ID
 * @param options 分页选项
 */
export async function getUserLikedModels(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
) {
  const interactions = await ModelInteractionRepository.findUserLikedModels(
    userId,
    options,
  );

  return interactions.map((i) => i.model);
}

/**
 * 获取用户收藏的模型列表
 * @param userId 用户ID
 * @param options 分页选项
 */
export async function getUserFavoritedModels(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
) {
  const interactions = await ModelInteractionRepository.findUserFavoritedModels(
    userId,
    options,
  );

  return interactions.map((i) => i.model);
}

// ============================================
// 通用交互操作
// ============================================

/**
 * 通用交互切换方法（点赞/收藏）
 * @param params 交互参数
 * @returns 操作结果
 */
export async function toggleInteraction(params: {
  userId: string;
  modelId: string;
  type: InteractionType;
}): Promise<{ isInteracted: boolean; model: any }> {
  const { userId, modelId, type } = params;

  // 验证模型存在
  const model = await ModelRepository.findModelById(modelId);
  if (!model) {
    throw new AppError("NOT_FOUND", `模型不存在: ${modelId}`);
  }

  // 检查是否已有交互记录
  const hasInteraction = await ModelInteractionRepository.hasInteraction(
    userId,
    modelId,
    type,
  );

  if (hasInteraction) {
    // 取消交互
    await ModelInteractionRepository.deleteInteraction(userId, modelId, type);
    await ModelRepository.decrementInteractionCount(modelId, type);
    console.log(`👎 用户 ${userId} 取消了对模型 ${modelId} 的 ${type} 交互`);

    const updatedModel = await ModelRepository.findModelById(modelId);
    return {
      isInteracted: false,
      model: updatedModel!,
    };
  } else {
    // 添加交互
    await ModelInteractionRepository.createInteraction({
      userId,
      modelId,
      type,
    });
    await ModelRepository.incrementInteractionCount(modelId, type);
    console.log(`👍 用户 ${userId} 对模型 ${modelId} 执行了 ${type} 交互`);

    const updatedModel = await ModelRepository.findModelById(modelId);
    return {
      isInteracted: true,
      model: updatedModel!,
    };
  }
}

/**
 * 获取用户对单个模型的所有交互
 * @param userId 用户ID
 * @param modelId 模型ID
 * @returns 交互类型数组
 */
export async function getUserModelInteractions(
  userId: string,
  modelId: string,
): Promise<InteractionType[]> {
  const interactions =
    await ModelInteractionRepository.findUserInteractionsForModel(
      userId,
      modelId,
    );

  return interactions.map((interaction) => interaction.type);
}

/**
 * 批量获取用户对多个模型的交互状态
 * @param userId 用户ID
 * @param modelIds 模型ID数组
 * @returns 交互状态映射 { modelId: InteractionType[] }
 */
export async function getBatchUserModelInteractions(
  userId: string,
  modelIds: string[],
): Promise<Record<string, InteractionType[]>> {
  const interactions =
    await ModelInteractionRepository.findUserInteractionsForModels(
      userId,
      modelIds,
    );

  // 初始化结果对象
  const result: Record<string, InteractionType[]> = {};
  for (const modelId of modelIds) {
    result[modelId] = [];
  }

  // 填充交互状态
  for (const interaction of interactions) {
    if (!result[interaction.modelId]) {
      result[interaction.modelId] = [];
    }
    result[interaction.modelId].push(interaction.type);
  }

  return result;
}
