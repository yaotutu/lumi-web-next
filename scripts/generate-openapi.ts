/**
 * OpenAPI 文档生成脚本
 *
 * 功能：从现有的 Zod validators 自动生成 OpenAPI 3.0 规范文档
 *
 * 使用方式：
 * npm run generate:openapi
 *
 * 注意：此脚本只读取现有代码，不会修改任何源文件
 */

import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { writeFileSync } from "fs";
import { join } from "path";

// 扩展 Zod 支持 OpenAPI
extendZodWithOpenApi(z);

// 导入现有的 Zod schemas（不修改它们）
import {
  SendCodeSchema,
  VerifyCodeSchema,
} from "../lib/validators/auth.validator";

// ============================================
// 创建 OpenAPI Registry
// ============================================

const registry = new OpenAPIRegistry();

// ============================================
// 通用 Schema 定义
// ============================================

// 成功响应
const SuccessResponseSchema = registry.register(
  "SuccessResponse",
  z.object({
    success: z.literal(true),
    message: z.string().optional(),
  }),
);

// 错误响应
const ErrorResponseSchema = registry.register(
  "ErrorResponse",
  z.object({
    success: z.literal(false),
    error: z.string(),
    code: z.enum([
      "VALIDATION_ERROR",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "INVALID_STATE",
      "QUEUE_FULL",
      "DATABASE_ERROR",
      "EXTERNAL_API_ERROR",
      "UNKNOWN_ERROR",
    ]),
    details: z.any().optional(),
  }),
);

// 用户 Schema
const UserSchema = registry.register(
  "User",
  z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
    lastLoginAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
);

// 图片状态枚举
const ImageStatusSchema = registry.register(
  "ImageStatus",
  z.enum(["PENDING", "GENERATING", "COMPLETED", "FAILED"]),
);

// Job 状态枚举
const JobStatusSchema = registry.register(
  "JobStatus",
  z.enum([
    "PENDING",
    "RUNNING",
    "RETRYING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "TIMEOUT",
  ]),
);

// GeneratedImage Schema
const GeneratedImageSchema = registry.register(
  "GeneratedImage",
  z.object({
    id: z.string(),
    requestId: z.string(),
    index: z.number().int().min(0).max(3),
    imageUrl: z.string().url().nullable(),
    imagePrompt: z.string().nullable(),
    imageStatus: ImageStatusSchema,
    createdAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    failedAt: z.string().datetime().nullable(),
    errorMessage: z.string().nullable(),
  }),
);

// GenerationRequest Schema
const GenerationRequestSchema = registry.register(
  "GenerationRequest",
  z.object({
    id: z.string(),
    userId: z.string(),
    prompt: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    images: z.array(GeneratedImageSchema),
  }),
);

// ============================================
// Cookie 认证定义
// ============================================

registry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "auth-token",
  description: "JWT Token，通过 /api/auth/verify-code 登录后自动设置",
});

// ============================================
// API 路由注册
// ============================================

// POST /api/auth/send-code
registry.registerPath({
  method: "post",
  path: "/api/auth/send-code",
  tags: ["认证"],
  summary: "发送邮箱验证码",
  description: "发送验证码到指定邮箱。开发环境验证码固定为 0000",
  request: {
    body: {
      content: {
        "application/json": {
          schema: SendCodeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "验证码已发送",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: "输入验证失败",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /api/auth/verify-code
registry.registerPath({
  method: "post",
  path: "/api/auth/verify-code",
  tags: ["认证"],
  summary: "验证码登录",
  description:
    "使用邮箱验证码登录，成功后返回用户信息并设置 Cookie（有效期7天）",
  request: {
    body: {
      content: {
        "application/json": {
          schema: VerifyCodeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "登录成功",
      headers: {
        "Set-Cookie": {
          description: "JWT Token（7天有效）",
          schema: {
            type: "string",
            example: "auth-token=eyJhbGc...; Path=/; HttpOnly; Max-Age=604800",
          },
        },
      },
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              user: UserSchema,
              message: z.string(),
            }),
          }),
        },
      },
    },
    400: {
      description: "输入验证失败",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "验证码错误或已过期",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/auth/me
registry.registerPath({
  method: "get",
  path: "/api/auth/me",
  tags: ["认证"],
  summary: "获取当前用户信息",
  description: "需要登录",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "成功获取用户信息",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              user: UserSchema,
            }),
          }),
        },
      },
    },
    401: {
      description: "未认证或认证失败",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /api/auth/logout
registry.registerPath({
  method: "post",
  path: "/api/auth/logout",
  tags: ["认证"],
  summary: "退出登录",
  description: "清除 Cookie",
  responses: {
    200: {
      description: "已退出登录",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
        },
      },
    },
  },
});

// GET /api/tasks
registry.registerPath({
  method: "get",
  path: "/api/tasks",
  tags: ["任务管理"],
  summary: "获取用户的生成请求列表",
  description: "需要登录，返回用户所有任务",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "成功获取任务列表",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(GenerationRequestSchema),
            count: z.number().int(),
          }),
        },
      },
    },
    401: {
      description: "未认证或认证失败",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /api/tasks
registry.registerPath({
  method: "post",
  path: "/api/tasks",
  tags: ["任务管理"],
  summary: "创建新的生成请求",
  description: "创建任务并启动图片生成，自动创建 4 个图片生成任务",
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            prompt: z.string().describe("用户输入的提示词"),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "任务已创建",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: GenerationRequestSchema,
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: "输入验证失败",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "未认证或认证失败",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/tasks/{id}
registry.registerPath({
  method: "get",
  path: "/api/tasks/{id}",
  tags: ["任务管理"],
  summary: "获取单个任务详情",
  description: "需要登录",
  security: [{ cookieAuth: [] }],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "任务 ID（GenerationRequest.id）",
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: "成功获取任务详情",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: GenerationRequestSchema,
          }),
        },
      },
    },
    401: {
      description: "未认证或认证失败",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "任务不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// PATCH /api/tasks/{id}
registry.registerPath({
  method: "patch",
  path: "/api/tasks/{id}",
  tags: ["任务管理"],
  summary: "选择图片并触发 3D 模型生成",
  description:
    "选择一张已完成的图片，创建 3D 模型生成任务。图片必须已完成（imageStatus=COMPLETED）",
  security: [{ cookieAuth: [] }],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: z.string(),
    },
  ],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            selectedImageIndex: z
              .number()
              .int()
              .min(0)
              .max(3)
              .describe("选择的图片索引（0-3）"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "3D 模型生成已启动",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            model: z.object({
              id: z.string(),
              name: z.string(),
              sourceImageId: z.string(),
            }),
            selectedImageIndex: z.number().int(),
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: "输入验证失败",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "状态冲突（图片未完成）",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/tasks/{id}/events (SSE)
registry.registerPath({
  method: "get",
  path: "/api/tasks/{id}/events",
  tags: ["任务管理"],
  summary: "实时任务状态推送（SSE）",
  description: `Server-Sent Events（服务器推送事件）

事件类型：
- task:init - 任务初始状态
- image:generating - 图片生成中
- image:completed - 图片完成
- image:failed - 图片失败
- model:generating - 模型生成中
- model:progress - 模型进度更新
- model:completed - 模型完成
- model:failed - 模型失败
- heartbeat - 心跳（30秒）`,
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: "SSE 连接已建立",
      content: {
        "text/event-stream": {
          schema: z.string(),
        },
      },
    },
  },
});

// ============================================
// 画廊 API
// ============================================

// GET /api/gallery/models
registry.registerPath({
  method: "get",
  path: "/api/gallery/models",
  tags: ["画廊"],
  summary: "获取公开模型列表",
  description: "无需登录，支持排序和分页",
  parameters: [
    {
      name: "sortBy",
      in: "query",
      required: false,
      schema: z.enum(["latest", "popular"]).default("latest"),
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: z.number().int().min(1).max(100).default(20),
    },
    {
      name: "offset",
      in: "query",
      required: false,
      schema: z.number().int().min(0).default(0),
    },
  ],
  responses: {
    200: {
      description: "成功获取模型列表",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              models: z.array(z.any()),
              total: z.number().int(),
              hasMore: z.boolean(),
            }),
          }),
        },
      },
    },
  },
});

// GET /api/gallery/models/{id}
registry.registerPath({
  method: "get",
  path: "/api/gallery/models/{id}",
  tags: ["画廊"],
  summary: "获取模型详情",
  description: "无需登录，自动增加浏览次数",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "模型 ID",
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: "成功获取模型详情",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.any(),
          }),
        },
      },
    },
    404: {
      description: "模型不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /api/gallery/models/{id}/download
registry.registerPath({
  method: "post",
  path: "/api/gallery/models/{id}/download",
  tags: ["画廊"],
  summary: "增加模型下载计数",
  description: "无需登录，客户端在下载模型前调用",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: "下载计数已更新",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
        },
      },
    },
    404: {
      description: "模型不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================
// 代理服务 API
// ============================================

// GET /api/proxy/image
registry.registerPath({
  method: "get",
  path: "/api/proxy/image",
  tags: ["代理服务"],
  summary: "图片代理（解决 CORS）",
  description:
    "代理腾讯云 COS、阿里云 OSS、SiliconFlow 的图片请求。支持域名：.myqcloud.com, .aliyuncs.com, .siliconflow.cn",
  parameters: [
    {
      name: "url",
      in: "query",
      required: true,
      description: "图片 URL",
      schema: z.string().url(),
    },
  ],
  responses: {
    200: {
      description: "返回图片文件流",
      content: {
        "image/*": {
          schema: z.string().describe("图片二进制数据"),
        },
      },
    },
    400: {
      description: "URL 参数缺失或域名不受信任",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /api/proxy/model
registry.registerPath({
  method: "get",
  path: "/api/proxy/model",
  tags: ["代理服务"],
  summary: "3D 模型代理（解决 CORS）",
  description:
    "代理腾讯云 COS 的模型文件请求。支持格式：GLB, GLTF, OBJ, MTL, FBX, PNG/JPG",
  parameters: [
    {
      name: "url",
      in: "query",
      required: true,
      description: "模型文件 URL",
      schema: z.string().url(),
    },
  ],
  responses: {
    200: {
      description: "返回模型文件流",
      content: {
        "model/gltf-binary": {
          schema: z.string(),
        },
        "application/octet-stream": {
          schema: z.string(),
        },
      },
    },
    400: {
      description: "URL 参数缺失或域名不受信任",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================
// 管理接口 API
// ============================================

const QueueConfigSchema = registry.register(
  "QueueConfig",
  z.object({
    id: z.string(),
    queueName: z.enum(["image-generation", "model3d-generation"]),
    maxConcurrency: z.number().int().default(1),
    jobTimeout: z.number().int().default(300000),
    maxRetries: z.number().int().default(3),
    retryDelayBase: z.number().int().default(5000),
    retryDelayMax: z.number().int().default(60000),
    enablePriority: z.boolean().default(false),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    updatedBy: z.string().nullable(),
  }),
);

// GET /api/admin/queues/{name}
registry.registerPath({
  method: "get",
  path: "/api/admin/queues/{name}",
  tags: ["管理接口"],
  summary: "获取队列配置",
  parameters: [
    {
      name: "name",
      in: "path",
      required: true,
      schema: z.enum(["image-generation", "model3d-generation"]),
    },
  ],
  responses: {
    200: {
      description: "成功获取队列配置",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: QueueConfigSchema,
          }),
        },
      },
    },
    404: {
      description: "队列不存在",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// PATCH /api/admin/queues/{name}
registry.registerPath({
  method: "patch",
  path: "/api/admin/queues/{name}",
  tags: ["管理接口"],
  summary: "更新队列配置",
  description: "动态更新队列配置，Worker 下一轮轮询生效",
  parameters: [
    {
      name: "name",
      in: "path",
      required: true,
      schema: z.enum(["image-generation", "model3d-generation"]),
    },
  ],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            maxConcurrency: z.number().int().optional(),
            jobTimeout: z.number().int().optional(),
            maxRetries: z.number().int().optional(),
            isActive: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "配置已更新",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: QueueConfigSchema,
          }),
        },
      },
    },
  },
});

// POST /api/admin/queues/{name}/pause
registry.registerPath({
  method: "post",
  path: "/api/admin/queues/{name}/pause",
  tags: ["管理接口"],
  summary: "暂停队列",
  description: "Worker 下一轮轮询时停止处理任务",
  parameters: [
    {
      name: "name",
      in: "path",
      required: true,
      schema: z.enum(["image-generation", "model3d-generation"]),
    },
  ],
  responses: {
    200: {
      description: "队列已暂停",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: QueueConfigSchema,
            message: z.string(),
          }),
        },
      },
    },
  },
});

// DELETE /api/admin/queues/{name}/pause
registry.registerPath({
  method: "delete",
  path: "/api/admin/queues/{name}/pause",
  tags: ["管理接口"],
  summary: "恢复队列",
  description: "Worker 下一轮轮询时开始处理任务",
  parameters: [
    {
      name: "name",
      in: "path",
      required: true,
      schema: z.enum(["image-generation", "model3d-generation"]),
    },
  ],
  responses: {
    200: {
      description: "队列已恢复",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: QueueConfigSchema,
            message: z.string(),
          }),
        },
      },
    },
  },
});

// ============================================
// 测试接口 API
// ============================================

// GET /api/test/requests
registry.registerPath({
  method: "get",
  path: "/api/test/requests",
  tags: ["测试接口"],
  summary: "获取生成请求列表（测试用）",
  description: "无需认证，需要提供 userId",
  parameters: [
    {
      name: "userId",
      in: "query",
      required: true,
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: "成功获取请求列表",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(GenerationRequestSchema),
          }),
        },
      },
    },
  },
});

// POST /api/test/requests
registry.registerPath({
  method: "post",
  path: "/api/test/requests",
  tags: ["测试接口"],
  summary: "创建生成请求（测试用）",
  description: "无需认证，需要提供 userId",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            userId: z.string(),
            prompt: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "请求已创建",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: GenerationRequestSchema,
          }),
        },
      },
    },
  },
});

// GET /api/test/requests/{id}
registry.registerPath({
  method: "get",
  path: "/api/test/requests/{id}",
  tags: ["测试接口"],
  summary: "获取生成请求详情（测试用）",
  description: "无需认证",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: "成功获取请求详情",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: GenerationRequestSchema,
          }),
        },
      },
    },
  },
});

// POST /api/test/models/generate
registry.registerPath({
  method: "post",
  path: "/api/test/models/generate",
  tags: ["测试接口"],
  summary: "创建 3D 模型生成任务（测试用）",
  description: "无需认证",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            requestId: z.string(),
            sourceImageId: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "模型生成任务已创建",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.any(),
          }),
        },
      },
    },
  },
});

// ============================================
// Worker 状态 API
// ============================================

// GET /api/workers/status
registry.registerPath({
  method: "get",
  path: "/api/workers/status",
  tags: ["Worker 状态"],
  summary: "获取所有 Worker 运行状态",
  description: "无需认证，用于监控 Worker 健康状态",
  responses: {
    200: {
      description: "成功获取 Worker 状态",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              image: z.object({
                isRunning: z.boolean(),
                config: QueueConfigSchema.optional(),
              }),
              model3d: z.object({
                isRunning: z.boolean(),
                config: QueueConfigSchema.optional(),
              }),
            }),
          }),
        },
      },
    },
  },
});

// ============================================
// 生成 OpenAPI 文档
// ============================================

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
  openapi: "3.0.3",
  info: {
    title: "Lumi Web Next API",
    version: "0.1.0",
    description: `
AI 3D 模型生成平台 API 文档

## 功能概述
- 用户输入文本 → 生成 4 张图片
- 选择图片 → 生成 3D 模型
- 实时任务状态推送（SSE）
- 模型画廊管理

## 认证方式
使用 JWT Token，存储在 HTTP-only Cookie 中（名称：\`auth-token\`）

## 错误处理
所有错误响应遵循统一格式，详见 ErrorResponse Schema

**注意**：此文档由 \`scripts/generate-openapi.ts\` 自动生成，基于 Zod validators。
如需更新文档，请运行 \`npm run generate:openapi\`
    `.trim(),
    contact: {
      name: "Lumi Web Team",
    },
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "开发环境",
    },
    {
      url: "https://api.lumi-web.com",
      description: "生产环境（示例）",
    },
  ],
});

// ============================================
// 保存到文件
// ============================================

const outputPath = join(process.cwd(), "docs", "openapi.yaml");

// 先将 document 序列化为 JSON，再转换为 YAML
// 这样可以去除任何不可序列化的对象（如函数）
const jsonString = JSON.stringify(document, null, 2);
const jsonDocument = JSON.parse(jsonString);

// 将 JSON 转换为 YAML 格式
const yaml = require("js-yaml");
const yamlString = yaml.dump(jsonDocument, {
  indent: 2,
  lineWidth: -1,
  noRefs: true,
});

writeFileSync(outputPath, yamlString, "utf-8");

console.log("✅ OpenAPI 文档生成成功！");
console.log(`📄 文件位置: ${outputPath}`);
console.log("");
console.log("💡 提示：");
console.log("  1. 查看文档: http://localhost:4000/api-docs");
console.log("  2. 或访问: https://editor.swagger.io 导入 openapi.yaml");
console.log("");
console.log("📝 已注册的 API（共 24 个）：");
console.log("");
console.log("认证 (4 个):");
console.log("  - POST /api/auth/send-code");
console.log("  - POST /api/auth/verify-code");
console.log("  - GET  /api/auth/me");
console.log("  - POST /api/auth/logout");
console.log("");
console.log("任务管理 (6 个):");
console.log("  - GET    /api/tasks");
console.log("  - POST   /api/tasks");
console.log("  - GET    /api/tasks/{id}");
console.log("  - PATCH  /api/tasks/{id}");
console.log("  - GET    /api/tasks/{id}/events (SSE)");
console.log("");
console.log("画廊 (3 个):");
console.log("  - GET  /api/gallery/models");
console.log("  - GET  /api/gallery/models/{id}");
console.log("  - POST /api/gallery/models/{id}/download");
console.log("");
console.log("代理服务 (2 个):");
console.log("  - GET  /api/proxy/image");
console.log("  - GET  /api/proxy/model");
console.log("");
console.log("管理接口 (4 个):");
console.log("  - GET    /api/admin/queues/{name}");
console.log("  - PATCH  /api/admin/queues/{name}");
console.log("  - POST   /api/admin/queues/{name}/pause");
console.log("  - DELETE /api/admin/queues/{name}/pause");
console.log("");
console.log("测试接口 (4 个):");
console.log("  - GET  /api/test/requests");
console.log("  - POST /api/test/requests");
console.log("  - GET  /api/test/requests/{id}");
console.log("  - POST /api/test/models/generate");
console.log("");
console.log("Worker 状态 (1 个):");
console.log("  - GET  /api/workers/status");
console.log("");
console.log("🎉 所有 API 已完成注册！");
