import { z } from "zod";

/**
 * 创建任务请求验证器
 * 验证创建任务时的请求参数
 */
export const createTaskSchema = z.object({
  prompt: z
    .string()
    .min(1, { message: "提示词不能为空" })
    .max(500, { message: "提示词长度不能超过500个字符" }),
});

/**
 * 更新任务请求验证器
 * 验证更新任务时的请求参数
 */
export const updateTaskSchema = z.object({
  status: z
    .enum([
      "PENDING",
      "GENERATING_IMAGES",
      "IMAGES_READY",
      "GENERATING_MODEL",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ])
    .optional(),
  selectedImageIndex: z.number().min(0).max(3).optional(),
  prompt: z.string().min(1).max(500).optional(),
});

/**
 * 任务列表查询参数验证器
 * 验证获取任务列表时的查询参数
 */
export const listTasksQuerySchema = z.object({
  status: z
    .enum([
      "PENDING",
      "GENERATING_IMAGES",
      "IMAGES_READY",
      "GENERATING_MODEL",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ])
    .optional(),
  limit: z
    .string()
    .or(z.number())
    .transform((val) => {
      const num = typeof val === "string" ? parseInt(val, 10) : val;
      return isNaN(num) ? 10 : Math.min(Math.max(num, 1), 100);
    })
    .optional(),
  offset: z
    .string()
    .or(z.number())
    .transform((val) => {
      const num = typeof val === "string" ? parseInt(val, 10) : val;
      return isNaN(num) ? 0 : Math.max(num, 0);
    })
    .optional(),
});

/**
 * 添加图片记录请求验证器
 */
export const addImageSchema = z.object({
  url: z
    .string()
    .url({ message: "图片URL格式不正确" }),
  index: z
    .number()
    .min(0, { message: "图片索引不能小于0" })
    .max(100, { message: "图片索引不能大于100" }),
  aliyunTaskId: z.string().optional(),
  aliyunRequestId: z.string().optional(),
});

/**
 * 创建模型记录请求验证器
 */
export const createModelSchema = z.object({
  name: z
    .string()
    .min(1, { message: "模型名称不能为空" })
    .max(100, { message: "模型名称长度不能超过100个字符" }),
});

// 导出类型
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type AddImageInput = z.infer<typeof addImageSchema>;
export type CreateModelInput = z.infer<typeof createModelSchema>;