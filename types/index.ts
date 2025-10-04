/**
 * 生成的图片数据结构
 */
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
}

/**
 * 3D模型数据结构
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

/**
 * 生成状态
 */
export type GenerationStatus = "idle" | "generating" | "completed" | "failed";

/**
 * 错误类型
 */
export interface GenerationError {
  code: string;
  message: string;
}
