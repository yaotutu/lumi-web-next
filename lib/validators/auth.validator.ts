/**
 * 认证相关的 Zod Validator Schemas
 * 职责：验证 API 请求的输入数据
 *
 * 使用规则：
 * - API 层使用这些 schemas 验证请求体
 * - Service 层接收已验证的数据
 */

import { z } from "zod";

/**
 * 发送验证码请求 Schema
 *
 * POST /api/auth/send-code
 */
export const SendCodeSchema = z.object({
  email: z
    .string()
    .email("邮箱格式不正确")
    .min(5, "邮箱长度至少5个字符")
    .max(100, "邮箱长度不能超过100个字符"),
});

export type SendCodeInput = z.infer<typeof SendCodeSchema>;

/**
 * 验证码登录请求 Schema
 *
 * POST /api/auth/verify-code
 */
export const VerifyCodeSchema = z.object({
  email: z
    .string()
    .email("邮箱格式不正确")
    .min(5, "邮箱长度至少5个字符")
    .max(100, "邮箱长度不能超过100个字符"),
  code: z
    .string()
    .length(4, "验证码必须是4位数字")
    .regex(/^\d{4}$/, "验证码必须是4位数字"),
});

export type VerifyCodeInput = z.infer<typeof VerifyCodeSchema>;

/**
 * 更新用户信息请求 Schema
 *
 * PATCH /api/auth/me
 */
export const UpdateUserSchema = z.object({
  name: z
    .string()
    .min(1, "用户名不能为空")
    .max(50, "用户名长度不能超过50个字符")
    .optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
