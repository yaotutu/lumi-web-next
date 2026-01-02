/**
 * 用户相关 API 调用方法
 *
 * 提供用户收藏、点赞、我的模型等功能的 API 调用封装
 */

import { type ApiResult, apiRequestGet } from "@/lib/api-client";
import type { Model } from "@/types/model";

/**
 * 获取用户收藏的模型列表
 *
 * @param options - 查询选项
 * @param options.limit - 每页数量（默认 20）
 * @param options.offset - 偏移量（默认 0）
 * @returns 用户收藏的模型列表
 */
export async function getUserFavorites(
  options: { limit?: number; offset?: number } = {},
): Promise<ApiResult<Model[]>> {
  const { limit = 20, offset = 0 } = options;

  // 构建查询参数
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  // 调用 API
  return apiRequestGet<Model[]>(
    `/api/users/favorites?${queryParams.toString()}`,
  );
}

/**
 * 获取用户点赞的模型列表
 *
 * @param options - 查询选项
 * @param options.limit - 每页数量（默认 20）
 * @param options.offset - 偏移量（默认 0）
 * @returns 用户点赞的模型列表
 */
export async function getUserLikes(
  options: { limit?: number; offset?: number } = {},
): Promise<ApiResult<Model[]>> {
  const { limit = 20, offset = 0 } = options;

  // 构建查询参数
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  // 调用 API
  return apiRequestGet<Model[]>(`/api/users/likes?${queryParams.toString()}`);
}

/**
 * 获取用户创建的模型列表
 *
 * @param options - 查询选项
 * @param options.visibility - 可见性筛选（PUBLIC-公开，PRIVATE-私有）
 * @param options.sortBy - 排序方式（latest-最新，name-名称，popular-最受欢迎）
 * @param options.limit - 每页数量（默认 20）
 * @param options.offset - 偏移量（默认 0）
 * @returns 用户创建的模型列表
 */
export async function getUserMyModels(
  options: {
    visibility?: "PUBLIC" | "PRIVATE";
    sortBy?: "latest" | "name" | "popular";
    limit?: number;
    offset?: number;
  } = {},
): Promise<ApiResult<Model[]>> {
  const { visibility, sortBy = "latest", limit = 20, offset = 0 } = options;

  // 构建查询参数
  const queryParams = new URLSearchParams({
    sortBy,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  // 添加可选的 visibility 参数
  if (visibility) {
    queryParams.append("visibility", visibility);
  }

  // 调用 API
  return apiRequestGet<Model[]>(
    `/api/users/my-models?${queryParams.toString()}`,
  );
}
