// ============================================
// Prisma 导出的类型
// ============================================
export type {
  User,
  GenerationRequest,
  GeneratedImage,
  GeneratedModel,
  ImageGenerationJob,
  ModelGenerationJob,
  QueueConfig,
  UserAsset,
} from "@prisma/client";

export {
  ImageStatus, // ✅ 新架构：图片状态
  JobStatus,
  AssetSource,
  AssetVisibility,
} from "@prisma/client";

// ============================================
// 扩展类型: 包含关联数据的类型
// ============================================
import type {
  GenerationRequest,
  GeneratedImage,
  GeneratedModel,
  ImageGenerationJob,
  ModelGenerationJob,
} from "@prisma/client";

/**
 * 生成请求详情（包含关联数据）
 */
export type GenerationRequestWithDetails = GenerationRequest & {
  images: GeneratedImage[];
  imageGenerationJob?: ImageGenerationJob | null;
};

/**
 * 生成的模型详情（包含关联数据）
 */
export type GeneratedModelWithDetails = GeneratedModel & {
  request: GenerationRequest;
  sourceImage: GeneratedImage;
  generationJob?: ModelGenerationJob | null;
};

// ============================================
// 向后兼容类型别名（用于前端组件）
// ============================================

/**
 * TaskWithDetails 别名（向后兼容）
 * 前端组件仍然使用 Task 名称，但实际是 GenerationRequest
 */
export type TaskWithDetails = GenerationRequestWithDetails & {
  status: string; // 适配字段：从 images[].imageStatus 推导的整体状态
  selectedImageIndex?: number | null; // 兼容字段：从有模型的图片推导
  models: Array<
    GeneratedModel & {
      generationStatus?: string; // 兼容字段：从模型状态推导
      progress?: number; // 兼容字段：从模型状态推导
    }
  >; // 兼容字段：从 images[].generatedModel 收集
  modelGenerationStartedAt?: Date | null; // 兼容字段：从最早模型推导
  errorMessage?: string | null; // 兼容字段：错误信息
};

// ============================================
// 前端组件使用的状态类型
// ============================================

/**
 * 生成状态（用于UI组件）
 */
export type GenerationStatus = "idle" | "generating" | "completed" | "failed";

/**
 * 错误类型
 */
export interface GenerationError {
  code: string;
  message: string;
}
