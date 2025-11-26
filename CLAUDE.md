# CLAUDE.md

Lumi Web Next - AI 3D 模型生成平台的 Claude Code 开发指南

> **🚨 重要技术决策记录**
>
> 本项目**永久选择纯Cookie认证方案**，严禁后续引入JWT。这是基于项目规模、维护成本、性能优化等多方面考虑的最终决策。所有维护工作必须保持当前的Cookie实现，不得随意更改认证方案。

## 项目概述

AI 3D 模型生成平台：用户输入文本 → 生成 4 张图片 → 选择图片 → 生成 3D 模型

**技术栈核心**：
- Next.js 15.5.4 (App Router + Turbopack) + React 19 + TypeScript 5
- Prisma 6.16.3 + SQLite (开发) / PostgreSQL (生产)
- Three.js 0.180.0 + @react-three/fiber + @react-three/drei
- Zod 4.1.11 + Pino 10.0.0 (日志)
- 外部服务：OpenAI SDK (LLM)、腾讯云 SDK (3D 生成 + COS 存储)

## 快速开始

```bash
# 启动开发（端口 4000，自动美化日志）
npm run dev

# 数据库操作
npx prisma migrate dev          # 应用迁移
npx prisma generate             # 生成 Prisma Client
npx prisma studio               # 可视化管理

# 代码检查和格式化
npm run lint                    # Biome 检查
npm run format                  # Biome 格式化

# 构建生产
npm run build
npm start
```

## 📚 相关文档

详细的架构设计和工作流程说明，请参考以下文档：

### 核心架构文档

| 文档 | 说明 | 何时查看 |
|------|------|---------|
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | 系统架构详解：四层架构、Status vs Phase、Worker 协作机制、完整数据流图 | 理解整体架构设计时 |
| **[COMPLETE_WORKFLOW.md](docs/COMPLETE_WORKFLOW.md)** | 完整工作流：图片生成流程、3D 模型生成流程、状态机、API 接口、Worker 配置、错误处理 | 理解任务执行流程时 |

### 功能文档

| 文档 | 说明 |
|------|------|
| **[PROMPT_OPTIMIZATION.md](docs/PROMPT_OPTIMIZATION.md)** | Prompt 优化功能详解：工作流程、配置步骤、优化规则、技术架构、故障处理 |
| **[快速开始.md](docs/快速开始.md)** | Prompt 优化快速入门：配置步骤、验证效果、故障排查 |
| **[日志输出示例.md](docs/日志输出示例.md)** | 日志输出示例：优化成功、功能关闭、优化失败场景 |

### 集成指南

| 文档 | 说明 |
|------|------|
| **[OSS_INTEGRATION_GUIDE.md](docs/OSS_INTEGRATION_GUIDE.md)** | OSS 对接指南：本地文件系统、云 OSS（阿里云/腾讯云/AWS）、混合方案 |

### API 文档

| 文档 | 说明 | 查看方式 |
|------|------|---------|
| **[openapi.yaml](docs/openapi.yaml)** | OpenAPI 3.0 规范：完整的 REST API 文档，包含所有端点、请求/响应格式、认证方式<br>**⚠️ 自动生成，请勿手动编辑** | 在线查看：http://localhost:4000/api-docs（启动服务后访问）<br>或：https://editor.swagger.io 导入 openapi.yaml<br>更新文档：`npm run generate:openapi` |
| **[API_USAGE.md](docs/API_USAGE.md)** | API 快速上手指南：常用接口示例、认证流程、错误处理 | 快速参考常用 API |
| **[OPENAPI_GENERATION.md](docs/OPENAPI_GENERATION.md)** | OpenAPI 文档自动生成指南：如何添加新 API、如何维护文档、工作流程 | 需要添加或修改 API 文档时阅读 |

### UI/UX 设计

| 文档 | 说明 |
|------|------|
| **[design-tokens.md](docs/design-tokens.md)** | 设计令牌：颜色、圆角、阴影、排版等设计系统 |
| **[ui-optimization-suggestions.md](docs/ui-optimization-suggestions.md)** | UI 优化建议：首页、Workspace、通用优化建议 |

**💡 提示**：开发过程中遇到问题时，优先查阅 **ARCHITECTURE.md** 和 **COMPLETE_WORKFLOW.md**。

**📦 归档文档**：已完成或过时的文档保存在 `docs/archive/` 目录中，仅供历史参考。

---

## API 响应规范（JSend）

**所有 API 必须使用 JSend 规范**：后端用 `success(data)` 返回，前端用 `isSuccess(data)` 判断，列表数据嵌套为 `data: { items, total }`。

```typescript
// 后端：必须使用 success() 返回
import { success } from "@/lib/utils/api-response";
return success({ items: [...], total: 100 });

// 前端：必须使用 isSuccess() 判断
import { isSuccess, getErrorMessage } from "@/lib/utils/api-helpers";
if (isSuccess(data)) {
  const items = data.data.items;  // 列表数据访问 items
} else {
  alert(getErrorMessage(data));
}
```

---

## 核心架构

### 1. 数据库架构：五层设计

```
用户层 (User, EmailVerificationCode)
   ↓
业务层 (GenerationRequest → GeneratedImage → GeneratedModel)
   ↓
执行层 (ImageGenerationJob, ModelGenerationJob)
   ↓
配置层 (QueueConfig) + 资源层 (UserAsset)
```

**核心原则**：业务状态和执行状态分离

| 实体 | 状态字段 | 职责 |
|------|---------|------|
| GenerationRequest | **无** | 容器，管理请求元信息 |
| GeneratedImage | `imageStatus` | 图片业务状态 (PENDING/GENERATING/COMPLETED/FAILED) |
| GeneratedModel | **无** | 模型实体，状态通过 Job 体现 |
| ImageGenerationJob | `status` | 图片生成执行状态 (PENDING/RUNNING/RETRYING/COMPLETED/FAILED/TIMEOUT) |
| ModelGenerationJob | `status` + `progress` | 模型生成执行状态 (0-100) |

**关键设计**：
- ✅ 每张图片有独立的 Job，支持独立重试和优先级
- ✅ GeneratedModel 1:1 绑定 GeneratedImage (通过 sourceImageId)
- ✅ Job 层提供细粒度的执行控制（重试、超时、优先级）

### 2. 后端架构：四层分离

```
API 路由层 → Service 层 → Repository 层 → Prisma
                  ↓
              Worker 层 (监听 Job)
```

**目录结构**：
```
lib/
├── repositories/      # 数据访问层（封装 Prisma CRUD）
│   ├── generation-request.repository.ts
│   ├── generated-image.repository.ts
│   ├── generated-model.repository.ts
│   ├── job.repository.ts
│   ├── user.repository.ts
│   └── email-verification.repository.ts
├── services/          # 业务逻辑层（调用 Repository + Provider）
│   ├── generation-request-service.ts
│   ├── generated-model-service.ts
│   ├── auth-service.ts
│   └── prompt-optimizer.ts
├── providers/         # 外部 API 封装（适配器模式）
│   ├── image/        # 图片生成（SiliconFlow/阿里云/Mock）
│   ├── llm/          # LLM 优化（SiliconFlow/Qwen/Mock）
│   ├── model3d/      # 3D 生成（腾讯云/Mock）
│   └── storage/      # 存储服务（本地/腾讯云 COS/阿里云 OSS）
├── workers/           # 后台任务处理（Job-Based）
│   ├── image-worker.ts      # 图片生成 Worker
│   └── model3d-worker.ts    # 3D 模型生成 Worker
├── validators/        # Zod 验证 schemas
├── utils/             # 工具函数（errors.ts, retry.ts, auth.ts 等）
└── logger/            # 日志系统（pino）
```

### 3. Provider 架构：适配器模式

所有 Provider 采用统一接口 + 工厂函数 + 多渠道适配器：

```typescript
// 自动根据环境变量选择渠道
const imageProvider = createImageProvider();    // SiliconFlow/阿里云/Mock
const llmProvider = createLLMProvider();        // SiliconFlow/Qwen/Mock
const model3DProvider = createModel3DProvider(); // 腾讯云/Mock
const storageProvider = createStorageProvider(); // 腾讯云 COS/本地/阿里云 OSS
```

**渠道优先级**：
- **图片生成**: Mock → SiliconFlow → 阿里云
- **LLM 优化**: Mock → SiliconFlow → 阿里云 Qwen
- **3D 生成**: Mock → 腾讯云
- **存储**: 腾讯云 COS → 本地文件系统

### 4. Worker 架构：Job-Based + 三层任务处理

Worker 通过 `instrumentation.ts` 在服务端启动时自动运行，采用三层任务处理机制：

```typescript
while (isRunning) {
  // Layer 1: 超时检测（最高优先级）
  await detectTimeoutJobs();

  // Layer 2: 重试调度（中等优先级）
  await scheduleRetryJobs();

  // Layer 3: 新任务执行（最低优先级）
  await executeNewJobs();

  await sleep(2000); // 轮询间隔
}
```

**核心特性**：
- ✅ 每个 Image/Model 有独立 Job，支持细粒度控制
- ✅ 超时自动重试（指数退避）
- ✅ 优先级队列支持
- ✅ 动态配置（通过 QueueConfig 表）

**图片生成流程**：
```
用户输入 → API 创建 Request + 4 个 Image + 4 个 Job (PENDING)
  ↓
ImageWorker 监听 → 并发处理（默认 3 个）
  ↓
Job: PENDING → RUNNING → COMPLETED/FAILED
Image: PENDING → GENERATING → COMPLETED/FAILED
  ↓
前端轮询获取图片
```

**3D 模型生成流程**：
```
用户选择图片 → API 创建 Model + Job (PENDING)
  ↓
Model3DWorker 监听 → 提交腾讯云任务
  ↓
轮询腾讯云状态（WAIT → RUN → DONE）+ 更新 progress (0 → 50 → 100)
  ↓
下载模型 → 上传存储 → 更新 Model.modelUrl
```

## 页面结构

- **`/`** - 首页（Hero + 模型画廊）
- **`/workspace`** - 工作台（图片生成 + 3D 模型生成）
- **`/history`** - 历史记录
- **`/gallery/[id]`** - 模型详情页
- **`/login`** - 邮箱验证码登录

**关键组件位置**：
- 页面专用组件：`app/[page]/components/`
- 全局组件：`components/layout/` 和 `components/ui/`

## 开发规范

### 代码规范

1. **组件**：函数组件 + TypeScript + `"use client"`，Props 使用 `interface`
2. **样式**：优先使用全局样式类（`.btn-primary`、`.glass-panel`），Tailwind 用于布局
3. **路径别名**：使用 `@/*` 引用根目录（如 `@/lib/constants`）
4. **注释**：每一行代码必须有中文注释
5. **模块化**：统一使用 ESM 语法，优先函数式编程

### 后端规范

1. **Repository 层**：
   - 封装 Prisma 操作，不包含业务逻辑
   - 命名规范：`find*`, `create*`, `update*`, `delete*`
   - 使用事务确保数据一致性

2. **Service 层**：
   - 使用纯函数，避免类封装
   - 完整的 JSDoc 注释（`@param`/`@returns`/`@throws`）
   - 抛出 `AppError` 而非普通 Error

3. **API 层**：
   - **必须使用 `withErrorHandler` 包装**所有路由
   - Zod 验证错误自动转换为 400 响应
   - 查询参数验证需处理 `null`（`searchParams.get()` 返回 `string|null`）

4. **Worker 层**：
   - 只监听 Job 状态，不暴露手动触发接口
   - 使用 `createLogger` 记录详细日志
   - 防止重复处理（使用 `Set` 跟踪 `processingJobs`）

### 错误处理

**错误优先级**（从高到低）：
1. `ZodError` → 400 + 详细验证错误
2. `AppError` → 对应状态码 + 错误代码
3. `TencentAPIError` / `AliyunAPIError` → 500 + 外部 API 错误
4. `Unknown` → 500 + 通用错误

**错误代码**（定义在 `lib/utils/errors.ts`）：
- `VALIDATION_ERROR` (400) - 输入验证失败
- `NOT_FOUND` (404) - 资源不存在
- `INVALID_STATE` (409) - 状态不允许操作
- `EXTERNAL_API_ERROR` (500) - 外部 API 错误

## 环境变量配置

### 开发环境（最简配置）

```bash
# .env.local
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_MOCK_MODE=true  # 启用 Mock 模式，无需真实 API Key

# 认证（无需JWT配置）
EMAIL_CODE_EXPIRES_IN=300   # 验证码有效期 5 分钟
```

### 生产环境（完整配置）

```bash
# 数据库
DATABASE_URL="postgresql://user:pass@host:5432/db"

# 图片生成（选择一个）
SILICONFLOW_API_KEY=sk-xxx                    # 推荐：SiliconFlow
ALIYUN_IMAGE_API_KEY=sk-xxx                   # 备选：阿里云

# LLM 优化（选择一个）
SILICONFLOW_LLM_API_KEY=sk-xxx                # 推荐：DeepSeek-V3
SILICONFLOW_LLM_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_LLM_MODEL=deepseek-ai/DeepSeek-V3
# 或
QWEN_API_KEY=sk-xxx                           # 备选：通义千问
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-max

# 3D 生成
TENCENTCLOUD_SECRET_ID=xxx
TENCENTCLOUD_SECRET_KEY=xxx

# 存储（推荐腾讯云 COS，默认本地）
TENCENT_COS_SECRET_ID=xxx
TENCENT_COS_SECRET_KEY=xxx
TENCENT_COS_BUCKET=your-bucket-1234567890
TENCENT_COS_REGION=ap-beijing

# 认证（无需JWT配置）
EMAIL_CODE_EXPIRES_IN=300   # 验证码有效期 5 分钟
```

## 认证系统

**⚠️ 重要决策：纯Cookie认证方案**

本项目经过技术选型，**明确选择纯Cookie认证而非JWT**，原因如下：
- **项目规模**：小规模团队，用户量有限，无需JWT的分布式优势
- **维护成本**：Cookie方案简单可靠，减少加密/解密开销
- **性能优化**：直接JSON解析，比JWT验证更快
- **调试友好**：Cookie内容可读，便于问题排查

**邮箱验证码登录**（无密码 + 纯Cookie）：

```typescript
// 流程：用户输入邮箱 → 发送验证码 → 验证验证码 → 设置Cookie会话

// API 接口
POST /api/auth/send-code      // 发送验证码
POST /api/auth/verify-code    // 验证验证码（登录/注册）
GET  /api/auth/me             // 获取当前用户
POST /api/auth/logout         // 登出（三重Cookie清除）

// 客户端使用
import { getCurrentUser, logout } from '@/lib/auth-client';
const user = await getCurrentUser();
await logout();
```

**技术实现**：
- ✅ **存储格式**：HTTP-only Cookie 存储 JSON 字符串 `{userId, email}`
- ✅ **Cookie名称**：`auth-session`（非`auth-token`）
- ✅ **有效期**：7天
- ✅ **安全设置**：HttpOnly + SameSite=lax + 生产环境Secure
- ✅ **退出机制**：三重保障确保Cookie完全清除

**特性**：
- ✅ 开发环境验证码固定为 `0000`
- ✅ 无JWT依赖，性能更优
- ✅ 简单JSON会话，易于维护
- ✅ 验证码有效期 5 分钟

**🚫 注意事项**：
- **不要引入JWT**：严禁重新引入jose或其他JWT库
- **保持Cookie方案**：后续维护必须保持当前的纯Cookie实现
- **性能优先**：选择简单直接的方案，避免过度工程化

## 日志系统

```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('ServiceName');

log.info('action', '操作成功', { requestId: '123' });
log.error('action', '操作失败', error);
log.warn('action', '警告信息');
log.debug('action', '调试信息');
```

**输出**：开发环境使用 `pino-pretty` 美化，生产环境输出 JSON。

## 样式系统

**设计系统**（专业 3D 工具级深色主题）：

```css
/* 颜色层级 */
--surface-base: #000000    /* 页面背景 */
--surface-1: #0d0d0d       /* 输入框 */
--surface-2: #1a1a1a       /* 卡片背景 */
--surface-3: #262626       /* 高亮区域 */

/* 文字层级 */
--text-strong: #ffffff     /* 主要文字 */
--text-muted: rgba(255,255,255,0.90)   /* 次要文字 */
--text-subtle: rgba(255,255,255,0.60)  /* 辅助文字 */

/* 品牌色 */
--accent-yellow: #ffd93d   /* 主要交互色 */
```

**通用样式类**：
- `.glass-panel` - 标准卡片容器
- `.btn-primary` - 黄色主要按钮
- `.btn-secondary` - 次要按钮
- `.fade-in-up` - 淡入上移动画

## 常用操作

### 数据库操作

```bash
# 创建迁移
npx prisma migrate dev --name your_migration_name

# 重置数据库（危险！清空所有数据）
npx prisma migrate reset

# 可视化管理
npx prisma studio  # 访问 http://localhost:5555
```

### 代理服务（解决 CORS）

```typescript
// 图片代理
const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
<img src={proxyUrl} alt="Image" />

// 模型代理
const modelProxyUrl = `/api/proxy/model?url=${encodeURIComponent(modelUrl)}`;
loader.load(modelProxyUrl, (gltf) => scene.add(gltf.scene));
```

### Mock 模式

开发时启用 `NEXT_PUBLIC_MOCK_MODE=true`，所有 Provider 自动使用 Mock 数据，无需配置真实 API Key。

## 重要提示

1. **所有 API 路由必须使用 `withErrorHandler` 包装**
2. **Worker 通过 `instrumentation.ts` 自动启动，不要手动触发**
3. **Provider 使用工厂函数自动选择渠道，不要硬编码**
4. **业务状态和执行状态严格分离**（Image.imageStatus vs Job.status）
5. **每个 Image 有独立 Job，支持独立重试**
6. **Repository 层只负责数据访问，Service 层包含业务逻辑**
7. **代码注释必须使用中文，解释代码作用和目的**
8. **优先使用函数式编程，统一使用 ESM 语法**
