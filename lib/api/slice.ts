/**
 * 切片相关 API 调用
 */

import { apiRequestGet, apiRequestPost } from "@/lib/api-client";
import type {
	CreateSliceResponse,
	SliceTaskStatusResponse,
} from "@/types/slice";

/**
 * 创建切片任务
 * @param modelId 模型 ID
 * @returns 切片任务信息（包含 sliceTaskId）
 */
export async function createSliceTask(modelId: string) {
	return apiRequestPost<CreateSliceResponse>("/api/slices", {
		modelId,
	});
}

/**
 * 查询切片任务状态
 * @param sliceTaskId 切片任务 ID
 * @returns 切片任务状态和结果
 */
export async function getSliceTaskStatus(sliceTaskId: string) {
	return apiRequestGet<SliceTaskStatusResponse>(
		`/api/slices/${sliceTaskId}`,
	);
}
