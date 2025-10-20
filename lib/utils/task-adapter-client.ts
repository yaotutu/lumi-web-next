/**
 * 客户端任务适配器
 *
 * 职责：将后端的 GenerationRequest 数据转换为前端期望的 TaskWithDetails 格式
 * 主要功能：从 images 的 imageStatus 推导整体的 status 字段
 */

import type {
  GenerationRequest,
  GeneratedImage,
  GeneratedModel,
  ImageGenerationJob,
} from "@prisma/client";
import type { TaskWithDetails } from "@/types";

/**
 * 后端返回的完整 GenerationRequest 数据结构
 */
export type GenerationRequestResponse = GenerationRequest & {
  images: (GeneratedImage & {
    generationJob?: ImageGenerationJob | null;
    generatedModel?: GeneratedModel | null;
  })[];
};

/**
 * 从 images 的状态推导整体任务 status
 */
function deriveTaskStatus(
  images: (GeneratedImage & { generatedModel?: GeneratedModel | null })[],
): string {
  // 1. 检查图片生成状态
  if (images.length === 0) {
    return "IMAGE_PENDING";
  }

  const allCompleted = images.every((img) => img.imageStatus === "COMPLETED");
  const anyFailed = images.some((img) => img.imageStatus === "FAILED");
  const anyGenerating = images.some((img) => img.imageStatus === "GENERATING");
  const allPending = images.every((img) => img.imageStatus === "PENDING");

  // 任何图片失败 → FAILED
  if (anyFailed) {
    return "FAILED";
  }

  // 2. 从 images 中收集所有模型，检查模型状态
  const models = images
    .map((img) => img.generatedModel)
    .filter((model): model is GeneratedModel => model !== null);

  if (models.length > 0) {
    const hasCompleted = models.some((m) => !!m.completedAt);
    const hasFailed = models.some((m) => !!m.failedAt);

    // 有完成的模型 → MODEL_COMPLETED
    if (hasCompleted) {
      return "MODEL_COMPLETED";
    }

    // 有失败的模型（且无完成的）→ 检查是否还在重试
    if (hasFailed && !hasCompleted) {
      // 如果都失败了，返回 FAILED
      if (models.every((m) => !!m.failedAt)) {
        return "FAILED";
      }
      // 还有未失败的，说明在重试中
      return "MODEL_GENERATING";
    }

    // 模型生成中
    return "MODEL_GENERATING";
  }

  // 3. 只有图片状态，无模型
  if (allCompleted) {
    return "IMAGE_COMPLETED";
  }

  if (anyGenerating) {
    return "IMAGE_GENERATING";
  }

  if (allPending) {
    return "IMAGE_PENDING";
  }

  // 默认状态
  return "IMAGE_GENERATING";
}

/**
 * 将 GenerationRequest 适配为 TaskWithDetails
 */
export function adaptGenerationRequest(
  request: GenerationRequestResponse,
): TaskWithDetails {
  // 推导整体 status
  const status = deriveTaskStatus(request.images);

  // 从 images 中收集所有模型
  const models = request.images
    .map((img) => img.generatedModel)
    .filter((model): model is GeneratedModel => model !== null);

  // selectedImageIndex 不由后端推导，保持为 undefined
  // 这是前端 UI 状态，由用户点击图片来设置，不应该被后端数据覆盖
  const selectedImageIndex = undefined;

  // 推导 modelGenerationStartedAt：所有模型中最早创建的时间
  let modelGenerationStartedAt: Date | null = null;
  if (models.length > 0) {
    const firstModel = models[0];
    modelGenerationStartedAt =
      firstModel.createdAt instanceof Date
        ? firstModel.createdAt
        : new Date(firstModel.createdAt);
  }

  // 适配 images 字段：将 imageUrl 映射为 url（向后兼容）
  const adaptedImages = request.images.map((img) => ({
    ...img,
    url: img.imageUrl, // 添加兼容字段
  }));

  // 适配 models 字段：从 images[].generatedModel 收集，并添加 generationStatus 和 progress
  const adaptedModels = models.map((model) => ({
    ...model,
    generationStatus: "COMPLETED", // 简化：如果有 completedAt 说明完成，否则根据 failedAt 判断
    progress: model.completedAt ? 100 : model.failedAt ? 0 : 50,
  }));

  return {
    ...request,
    images: adaptedImages as any,
    status: status as any, // 添加推导的 status
    selectedImageIndex,
    models: adaptedModels,
    modelGenerationStartedAt,
  };
}

/**
 * 适配 API 响应（单个任务）
 */
export function adaptTaskResponse(response: {
  success: boolean;
  data: GenerationRequestResponse;
  message?: string;
}): {
  success: boolean;
  data: TaskWithDetails;
  message?: string;
} {
  return {
    ...response,
    data: adaptGenerationRequest(response.data),
  };
}

/**
 * 适配 API 响应（任务列表）
 */
export function adaptTasksResponse(response: {
  success: boolean;
  data: GenerationRequestResponse[];
  count?: number;
}): {
  success: boolean;
  data: TaskWithDetails[];
  count?: number;
} {
  return {
    ...response,
    data: response.data.map(adaptGenerationRequest),
  };
}
