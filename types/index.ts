// ============================================
// Prisma 导出的类型
// ============================================
export type { Task, TaskImage, TaskModel, User } from "@prisma/client";
export { ModelStatus, TaskStatus } from "@prisma/client";

// 扩展类型: 任务详情（包含关联数据）
import type { Task, TaskImage, TaskModel } from "@prisma/client";

export type TaskWithDetails = Task & {
  images: TaskImage[];
  model: TaskModel | null;
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
// 以下类型已废弃，将被 Prisma 类型替代
// ============================================

/**
 * @deprecated 使用 TaskImage 替代
 */
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
}

/**
 * @deprecated 使用 TaskModel 替代
 */
export interface Model3D {
  id: string;
  name: string;
  sourceImageId: string;
  status: "generating" | "completed" | "failed";
  progress: number;
  modelUrl?: string;
  createdAt: Date;
}
