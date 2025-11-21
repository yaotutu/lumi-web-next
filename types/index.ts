// ============================================
// Prisma 导出的类型
// ============================================
export type {
  User,
  GenerationRequest,
  GeneratedImage,
  Model,
  ImageGenerationJob,
  ModelGenerationJob,
  QueueConfig,
  ModelInteraction,
} from "@prisma/client";

export {
  ImageStatus, // 图片状态
  JobStatus,
  ModelSource, // 新架构：模型来源（AI_GENERATED / USER_UPLOADED）
  ModelVisibility, // 新架构：模型可见性（PRIVATE / PUBLIC）
  RequestStatus, // 新架构：请求状态
  RequestPhase, // 新架构：请求阶段
  InteractionType, // 新架构：互动类型（LIKE / FAVORITE）
} from "@prisma/client";

// ============================================
// 扩展类型: 包含关联数据的类型
// ============================================
import type {
  GenerationRequest,
  GeneratedImage,
  Model,
  ImageGenerationJob,
  ModelGenerationJob,
} from "@prisma/client";

/**
 * 生成请求详情（包含关联数据）
 *
 * 新架构：
 * - 1 Request : 1 Model（通过 model 字段访问）
 * - Request 有 status/phase 字段
 */
export type GenerationRequestWithDetails = GenerationRequest & {
  images: GeneratedImage[];
  model?:
    | (Model & {
        generationJob?: ModelGenerationJob | null;
      })
    | null;
  imageGenerationJob?: ImageGenerationJob | null;
};

/**
 * 模型详情（包含关联数据）
 */
export type ModelWithDetails = Model & {
  request?: GenerationRequest | null;
  sourceImage?: GeneratedImage | null;
  generationJob?: ModelGenerationJob | null;
};

// ============================================
// 向后兼容类型别名（用于前端组件）
// ============================================

/**
 * TaskWithDetails 别名（向后兼容）
 * 前端组件仍然使用 Task 名称，但实际是 GenerationRequest
 *
 * 新架构变更：
 * - model: 1:1 关系的模型（新字段）
 * - models: 保留用于向后兼容的数组（从 model 转换）
 */
export type TaskWithDetails = GenerationRequestWithDetails & {
  status: string; // 适配字段：从 request.status 或 images[].imageStatus 推导
  selectedImageIndex?: number | null; // 选中的图片索引
  model?:
    | (Model & {
        generationStatus?: string;
        progress?: number;
        generationJob?: ModelGenerationJob | null;
      })
    | null; // 新架构：1:1 模型
  models: Array<
    Model & {
      generationStatus?: string; // 兼容字段：从模型状态推导
      progress?: number; // 兼容字段：从模型状态推导
    }
  >; // 兼容字段：从 model 转换为数组
  modelGenerationStartedAt?: Date | null; // 兼容字段：从模型推导
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
