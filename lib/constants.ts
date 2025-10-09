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

// Mock 用户配置（开发阶段）
export const MOCK_USER = {
  id: "user_dev_001",
  email: "dev@lumi.com",
  name: "Development User",
} as const;

// 存储路径配置
export const STORAGE_PATHS = {
  IMAGES_DIR: "/generated/images",
  MODELS_DIR: "/generated/models",
} as const;

// 任务队列配置
export const TASK_QUEUE = {
  /** 最大并发任务数 */
  MAX_CONCURRENT: 3,
  /** 任务超时时间(毫秒) */
  TASK_TIMEOUT: 120000, // 2分钟
  /** 最大重试次数 */
  MAX_RETRIES: 3,
  /** 重试延迟基数(毫秒) */
  RETRY_DELAY_BASE: 2000,
  /** 队列最大长度 */
  MAX_QUEUE_SIZE: 100,
  /** 轮询间隔(毫秒) */
  POLL_INTERVAL: 1000, // 1秒
} as const;
