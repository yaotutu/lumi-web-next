/**
 * 应用常量配置
 */

// 图片生成配置
export const IMAGE_GENERATION = {
  /** 每次生成的图片数量 */
  COUNT: 4,
  /** 模拟生成延迟(毫秒) */
  DELAY: 1500,
  /** 最大prompt长度 */
  MAX_PROMPT_LENGTH: 500,
  /** 最小prompt长度 */
  MIN_PROMPT_LENGTH: 2,
} as const;

// 3D模型生成配置
export const MODEL_GENERATION = {
  /** 模拟生成延迟(毫秒) */
  DELAY: 3000,
  /** 进度更新间隔(毫秒) */
  PROGRESS_INTERVAL: 100,
} as const;

// 验证消息
export const VALIDATION_MESSAGES = {
  PROMPT_TOO_SHORT: `请输入至少${IMAGE_GENERATION.MIN_PROMPT_LENGTH}个字符`,
  PROMPT_TOO_LONG: `描述不能超过${IMAGE_GENERATION.MAX_PROMPT_LENGTH}个字符`,
  PROMPT_REQUIRED: "请输入描述内容",
  SELECT_IMAGE_REQUIRED: "请先选择一张图片",
} as const;

// 错误消息
export const ERROR_MESSAGES = {
  IMAGE_GENERATION_FAILED: "图片生成失败,请重试",
  MODEL_GENERATION_FAILED: "3D模型生成失败,请重试",
  NETWORK_ERROR: "网络错误,请检查连接",
} as const;
