/**
 * 前端类型定义
 *
 * 重要：前端独立维护类型定义，不依赖后端 ORM
 * - 类型定义基于后端 API 响应格式
 * - 与后端数据库 schema 保持一致
 */

// ============================================
// 枚举类型
// ============================================

/** 请求状态 */
export type RequestStatus =
  | 'IMAGE_PENDING'
  | 'IMAGE_GENERATING'
  | 'IMAGE_COMPLETED'
  | 'IMAGE_FAILED'
  | 'MODEL_PENDING'
  | 'MODEL_GENERATING'
  | 'MODEL_COMPLETED'
  | 'MODEL_FAILED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/** 请求阶段 */
export type RequestPhase =
  | 'IMAGE_GENERATION'
  | 'AWAITING_SELECTION'
  | 'MODEL_GENERATION'
  | 'COMPLETED';

/** 图片状态 */
export type ImageStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

/** Job 状态 */
export type JobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMEOUT';

/** 模型来源 */
export type ModelSource = 'AI_GENERATED' | 'USER_UPLOADED';

/** 模型可见性 */
export type ModelVisibility = 'PRIVATE' | 'PUBLIC';

/** 交互类型 */
export type InteractionType = 'LIKE' | 'FAVORITE';

/** 打印状态 */
export type PrintStatus =
  | 'NOT_STARTED'
  | 'SLICING'
  | 'SLICE_COMPLETE'
  | 'PRINTING'
  | 'PRINT_COMPLETE'
  | 'FAILED';

// ============================================
// 基础数据类型（对应数据库表）
// ============================================

/** 用户 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/** 生成请求（主任务） */
export interface GenerationRequest {
  id: string;
  userId: string;
  prompt: string; // ✅ 优化后的提示词（用于实际生成图片）
  originalPrompt?: string | null; // ✅ 用户原始输入的提示词（用于前端显示）
  status: RequestStatus;
  phase: RequestPhase;
  selectedImageIndex: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/** 生成的图片 */
export interface GeneratedImage {
  id: string;
  requestId: string;
  index: number;
  imageUrl: string | null;
  imagePrompt: string | null;
  imageStatus: ImageStatus;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
}

/** 图片生成 Job */
export interface ImageGenerationJob {
  id: string;
  imageId: string;
  provider: string;
  providerTaskId: string | null;
  status: JobStatus;
  progress: number;
  retryCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

/** 模型 */
export interface Model {
  id: string;
  userId: string;
  source: ModelSource;
  requestId: string | null;
  sourceImageId: string | null;
  name: string;
  description: string | null;
  modelUrl: string | null;
  mtlUrl: string | null;
  textureUrl: string | null;
  previewImageUrl: string | null;
  format: string;
  fileSize: number | null;
  visibility: ModelVisibility;
  publishedAt: string | null;
  viewCount: number;
  likeCount: number;
  favoriteCount: number;
  downloadCount: number;
  sliceTaskId: string | null;
  printStatus: PrintStatus;
  printProgress: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
}

/** 模型生成 Job */
export interface ModelGenerationJob {
  id: string;
  modelId: string;
  provider: string;
  providerTaskId: string | null;
  status: JobStatus;
  progress: number;
  retryCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

/** 队列配置 */
export interface QueueConfig {
  id: string;
  queueName: string;
  maxConcurrency: number;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 扩展类型: 包含关联数据的类型
// ============================================

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
export type ModelWithDetails = Model & {
  request: GenerationRequest;
  sourceImage: GeneratedImage;
  generationJob?: ModelGenerationJob | null;
};

/**
 * 用户资产（Model 的扩展，用于画廊功能）
 * 包含可选的3D模型技术信息字段
 */
export type UserAsset = Model & {
  faceCount?: number | null;
  vertexCount?: number | null;
  quality?: string | null;
};

/**
 * 用户资产详情（包含关联用户信息）
 * 用于画廊模型详情页
 */
export type UserAssetWithUser = UserAsset & {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
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
  model:
    | (Model & {
        generationStatus?: string; // 兼容字段：从模型状态推导
        progress?: number; // 兼容字段：从模型状态推导
      })
    | null; // 1:1 关系，单数字段（与数据库设计一致）
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

// ============================================
// 从 task-adapter-client.ts 导出的类型
// ============================================
export type { GenerationRequestResponse } from "@/lib/utils/task-adapter-client";
