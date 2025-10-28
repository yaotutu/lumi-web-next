# OpenAPI 文档自动生成指南

本项目使用 **zod-to-openapi** 从 Zod validators 自动生成 OpenAPI 文档，确保文档与代码 100% 同步。

---

## 🎯 核心原理

```
Zod Validators (单一数据源)
    ↓
scripts/generate-openapi.ts (读取 + 注册)
    ↓
docs/openapi.yaml (自动生成)
    ↓
Swagger UI (可视化展示)
```

**关键优势**：
- ✅ 文档与代码强制同步（基于同一个 Zod Schema）
- ✅ 类型安全（TypeScript + Zod）
- ✅ 无需手动维护 YAML 文件
- ✅ 代码即文档

---

## 🚀 快速使用

### 1. 生成文档

```bash
npm run generate:openapi
```

执行后会：
- 读取所有 Zod validators
- 生成 `docs/openapi.yaml`
- 覆盖旧文档

### 2. 查看文档

```bash
# 启动开发服务器
npm run dev

# 访问
http://localhost:4000/api-docs
```

### 3. 验证文档

访问 Swagger UI，测试所有 API 是否与实际行为一致。

---

## 📝 添加新 API 的流程

### 步骤 1：编写 Zod Validator（已有）

在 `lib/validators/` 中定义验证规则：

```typescript
// lib/validators/task.validator.ts
export const CreateTaskSchema = z.object({
  prompt: z.string().min(1).max(500),
});
```

### 步骤 2：在 API 路由中使用（已有）

```typescript
// app/api/tasks/route.ts
import { CreateTaskSchema } from '@/lib/validators/task.validator';

export const POST = withErrorHandler(async (req) => {
  const body = await req.json();
  const { prompt } = CreateTaskSchema.parse(body); // ✅ 使用 Zod 验证
  // ... 业务逻辑
});
```

### 步骤 3：在生成脚本中注册 API（新增）

打开 `scripts/generate-openapi.ts`，添加路由注册：

```typescript
// 导入 Zod Schema
import { CreateTaskSchema } from "../lib/validators/task.validator";

// 注册 API 路由
registry.registerPath({
  method: "post",
  path: "/api/tasks",
  tags: ["任务管理"],
  summary: "创建新的生成请求",
  description: "创建任务并启动图片生成",
  security: [{ cookieAuth: [] }], // 需要登录
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateTaskSchema, // ✅ 直接使用 Zod Schema
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
    // ... 其他响应
  },
});
```

### 步骤 4：重新生成文档

```bash
npm run generate:openapi
```

### 步骤 5：刷新浏览器查看

访问 http://localhost:4000/api-docs，新 API 会自动显示。

---

## 📖 完整示例

### 示例 1：添加 PATCH /api/tasks/{id} API

```typescript
// 步骤 1：定义 Zod Schema (lib/validators/task.validator.ts)
export const UpdateTaskSchema = z.object({
  selectedImageIndex: z.number().int().min(0).max(3),
});

// 步骤 2：在 API 中使用 (app/api/tasks/[id]/route.ts)
export const PATCH = withErrorHandler(async (req, { params }) => {
  const body = await req.json();
  const { selectedImageIndex } = UpdateTaskSchema.parse(body);
  // ...
});

// 步骤 3：在生成脚本中注册 (scripts/generate-openapi.ts)
registry.registerPath({
  method: "patch",
  path: "/api/tasks/{id}",
  tags: ["任务管理"],
  summary: "选择图片并生成 3D 模型",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: z.string().cuid(),
    },
  ],
  request: {
    body: {
      content: {
        "application/json": {
          schema: UpdateTaskSchema,
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
            model: GeneratedModelSchema,
            message: z.string(),
          }),
        },
      },
    },
  },
});

// 步骤 4：重新生成
// npm run generate:openapi
```

---

## 🔧 高级功能

### 1. 添加 Schema 复用

如果多个 API 使用相同的响应格式，可以注册为公共 Schema：

```typescript
const GenerationRequestSchema = registry.register(
  "GenerationRequest",
  z.object({
    id: z.string(),
    userId: z.string(),
    prompt: z.string(),
    // ...
  })
);

// 在多个 API 中复用
registry.registerPath({
  path: "/api/tasks",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: GenerationRequestSchema, // ✅ 复用
          }),
        },
      },
    },
  },
});
```

### 2. 添加示例数据

```typescript
registry.registerPath({
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateTaskSchema,
          example: {
            prompt: "一只可爱的小猫",
          },
        },
      },
    },
  },
});
```

### 3. 添加路径参数

```typescript
registry.registerPath({
  method: "get",
  path: "/api/tasks/{id}",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "任务 ID",
      schema: z.string().cuid(),
    },
  ],
});
```

### 4. 添加查询参数

```typescript
registry.registerPath({
  method: "get",
  path: "/api/gallery/models",
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
  ],
});
```

---

## 🛠️ 维护建议

### 什么时候更新文档？

1. **新增 API 时**：在 `generate-openapi.ts` 中注册新路由
2. **修改 API 参数时**：Zod Schema 修改后，重新运行生成脚本
3. **修改响应格式时**：更新对应的响应 Schema
4. **部署前**：运行生成脚本，确保文档最新

### 推荐工作流

```bash
# 1. 修改代码（Zod validators / API 路由）
# 2. 更新生成脚本（如果新增 API）
vim scripts/generate-openapi.ts

# 3. 生成文档
npm run generate:openapi

# 4. 验证文档
npm run dev
# 访问 http://localhost:4000/api-docs

# 5. 提交代码
git add .
git commit -m "feat: 添加新 API + 更新 OpenAPI 文档"
```

### Git Pre-commit Hook（可选）

自动在提交前生成文档：

```bash
# .husky/pre-commit
npm run generate:openapi
git add docs/openapi.yaml
```

---

## ❌ 常见问题

### Q1: 为什么不直接手写 openapi.yaml？

**答**：手写文档容易过时。使用代码生成：
- ✅ 保证文档与代码同步
- ✅ 减少维护成本
- ✅ 类型安全

### Q2: 如果 Zod Schema 不适合文档怎么办？

**答**：可以在生成脚本中扩展 Schema：

```typescript
// 原始 Schema（用于验证）
const CreateTaskSchema = z.object({
  prompt: z.string(),
});

// 文档专用 Schema（添加更多元数据）
const CreateTaskSchemaForDocs = CreateTaskSchema.extend({}).openapi({
  example: { prompt: "一只小猫" },
  description: "创建任务的请求体",
});
```

### Q3: 是否需要手动维护 Zod validators？

**答**：是的。Zod validators 是**单一数据源**，需要手动维护。但这比维护两份文档（代码 + YAML）要简单得多。

### Q4: 生成的文档是否包含所有 API？

**答**：目前只注册了核心 API（认证 + 任务管理）。其他 API 需要手动在 `scripts/generate-openapi.ts` 中注册。

---

## 📚 参考资料

- **zod-to-openapi 文档**: https://github.com/asteasolutions/zod-to-openapi
- **OpenAPI 3.0 规范**: https://swagger.io/specification/
- **Zod 文档**: https://zod.dev

---

## 🎉 总结

使用 zod-to-openapi 后：

| 方面 | 手动维护 | 自动生成 |
|------|---------|---------|
| **准确性** | ❌ 容易过时 | ✅ 100% 准确 |
| **维护成本** | ❌ 高（两份代码） | ✅ 低（单一数据源） |
| **类型安全** | ❌ 无保证 | ✅ TypeScript + Zod |
| **开发体验** | ❌ 手动同步 | ✅ 自动同步 |

**最佳实践**：
1. Zod Schema 作为单一数据源
2. API 路由使用 Zod 验证
3. 定期运行生成脚本
4. 提交代码前验证文档

---

**最后更新：2025-01-21**
