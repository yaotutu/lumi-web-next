/**
 * 切片相关类型定义
 */

// 切片状态枚举
export type SliceStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

// 创建切片任务请求
export interface CreateSliceRequest {
	modelId: string;
}

// 创建切片任务响应
export interface CreateSliceResponse {
	modelId: string;
	sliceTaskId: string;
	sliceStatus: SliceStatus;
	message: string;
}

// G-code 元数据
export interface GcodeMetadata {
	layer_height?: number; // 层高（毫米）
	print_time?: number; // 预计打印时间（秒）
	filament_used?: number; // 预计耗材用量（克）
}

// 查询切片状态响应
export interface SliceTaskStatusResponse {
	sliceTaskId: string;
	modelId: string;
	sliceStatus: SliceStatus;
	gcodeUrl: string | null;
	gcodeMetadata: GcodeMetadata | null;
	errorMessage: string | null;
	updatedAt: string;
}
