/**
 * 模型相关的 Zod 验证 Schema
 * 职责：输入数据验证、类型推导
 */

import { z } from "zod";

/**
 * 模型来源枚举验证
 * 直接定义枚举值，避免循环依赖和模块加载问题
 */
export const modelSourceSchema = z.enum([
  "AI_GENERATED",
  "USER_UPLOADED",
  "IMPORTED",
]);

/**
 * 模型可见性枚举验证
 * 直接定义枚举值，避免循环依赖和模块加载问题
 */
export const modelVisibilitySchema = z.enum(["PRIVATE", "PUBLIC"]);

/**
 * 创建用户上传模型的验证 Schema
 */
export const createUploadedModelSchema = z.object({
  name: z
    .string()
    .min(1, "模型名称不能为空")
    .max(100, "模型名称不能超过100个字符")
    .trim(),
  description: z.string().max(500, "描述不能超过500个字符").optional(),
  modelUrl: z.string().url("模型 URL 格式不正确"),
  previewImageUrl: z.string().url("预览图 URL 格式不正确").optional(),
  format: z
    .string()
    .regex(/^(obj|glb|gltf|fbx|stl)$/i, "不支持的模型格式")
    .optional(),
  fileSize: z.number().int().positive("文件大小必须为正整数").optional(),
  visibility: modelVisibilitySchema.optional(),
});

/**
 * 推导创建上传模型的输入类型
 */
export type CreateUploadedModelInput = z.infer<
  typeof createUploadedModelSchema
>;

/**
 * 更新模型的验证 Schema
 */
export const updateModelSchema = z.object({
  name: z
    .string()
    .min(1, "模型名称不能为空")
    .max(100, "模型名称不能超过100个字符")
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, "描述不能超过500个字符")
    .optional()
    .nullable(),
  visibility: modelVisibilitySchema.optional(),
});

/**
 * 推导更新模型的输入类型
 */
export type UpdateModelInput = z.infer<typeof updateModelSchema>;

/**
 * 查询用户模型列表的验证 Schema
 */
export const listUserModelsSchema = z.object({
  source: modelSourceSchema.optional(),
  visibility: modelVisibilitySchema.optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 20))
    .pipe(z.number().int().positive().max(100)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0)),
});

/**
 * 推导查询用户模型列表的输入类型
 */
export type ListUserModelsInput = z.infer<typeof listUserModelsSchema>;

/**
 * 查询公开模型列表的验证 Schema
 */
export const listPublicModelsSchema = z.object({
  sortBy: z.enum(["recent", "popular"]).optional().default("recent"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 20))
    .pipe(z.number().int().positive().max(100)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0)),
});

/**
 * 推导查询公开模型列表的输入类型
 */
export type ListPublicModelsInput = z.infer<typeof listPublicModelsSchema>;

/**
 * 模型 ID 参数验证 Schema
 */
export const modelIdSchema = z.string().cuid("无效的模型 ID 格式");

/**
 * 点赞操作验证 Schema
 */
export const likeActionSchema = z.object({
  action: z.enum(["like", "unlike"]),
});

/**
 * 推导点赞操作的输入类型
 */
export type LikeActionInput = z.infer<typeof likeActionSchema>;
