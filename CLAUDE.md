# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Lumi Web Next 是一个 AI 3D 模型生成平台,允许用户通过文本描述生成图片,然后将选中的图片转换为 3D 模型。

## 技术栈

- **Next.js 15.5.4** - 使用 App Router 和 Turbopack
- **React 19.1.0** 和 React DOM 19.1.0
- **TypeScript 5** - 启用严格模式
- **Tailwind CSS 4** - 使用 PostCSS
- **Biome 2.2.0** - 代码检查和格式化工具（替代 ESLint/Prettier）

## 开发命令

```bash
# 启动开发服务器（使用 Turbopack）
npm run dev

# 构建生产版本（使用 Turbopack）
npm run build

# 启动生产服务器
npm start

# 使用 Biome 检查代码
npm run lint

# 使用 Biome 格式化代码
npm run format
```

## 核心架构

### 数据库架构：Image-Centric + Job 执行层分离

项目采用**分层架构**，将业务状态和执行状态分离，支持细粒度的任务控制和重试。

#### 四层架构设计

```
用户层 (User)
   ↓
业务层 (GenerationRequest → GeneratedImage → GeneratedModel)
   ↓
执行层 (ImageGenerationJob, ModelGenerationJob)
   ↓
配置层 (QueueConfig) + 资源层 (UserAsset)
```

#### 核心实体说明

**1. 业务层（Business Layer）**

- **GenerationRequest（容器，无状态）**
  - 作用：管理用户的生成请求元信息
  - 特点：**不包含 status 字段**，状态管理下沉到 Image 和 Job 层面
  - 字段：userId, prompt, createdAt, completedAt

- **GeneratedImage（核心实体，有独立状态）**
  - 作用：每张图片作为独立实体，拥有自己的生命周期
  - 状态：`imageStatus`（PENDING → GENERATING → COMPLETED/FAILED）
  - 字段：requestId, index（0-3）, imageUrl, imagePrompt, imageStatus
  - 关联：1:1 ImageGenerationJob, 1:1 GeneratedModel（可选）

- **GeneratedModel（3D 模型，属于图片）**
  - 作用：由 GeneratedImage 生成的 3D 模型
  - 字段：sourceImageId, modelUrl, previewImageUrl, format, sliceTaskId
  - 关联：1:1 ModelGenerationJob

**2. 执行层（Execution Layer）**

- **ImageGenerationJob（图片生成任务，1:1 with Image）**
  - 作用：每张图片有独立的 Job，支持独立重试和优先级
  - 状态：`status`（PENDING → RUNNING → COMPLETED/FAILED/RETRYING/TIMEOUT）
  - 执行控制：retryCount, maxRetries, nextRetryAt, timeoutAt, priority
  - Provider 信息：providerName, providerJobId, providerRequestId

- **ModelGenerationJob（模型生成任务，1:1 with Model）**
  - 作用：3D 模型生成的执行任务
  - 状态：`status`（PENDING → RUNNING → COMPLETED/FAILED/RETRYING/TIMEOUT）
  - 执行控制：retryCount, maxRetries, nextRetryAt, timeoutAt, priority, **progress**（0-100）
  - Provider 信息：providerName, providerJobId, providerRequestId

**3. 配置层 + 资源层**

- **QueueConfig（队列配置，动态可调整）**
  - 作用：运行时动态配置队列参数
  - 字段：maxConcurrency, jobTimeout, maxRetries, retryDelayBase, retryDelayMax, enablePriority, isActive

- **UserAsset（用户资产管理）**
  - 作用：统一管理 AI 生成和用户上传的 3D 模型
  - 来源：AI_GENERATED（关联 GeneratedModel）、USER_UPLOADED、IMPORTED
  - 可见性：PRIVATE / PUBLIC（模型广场）

#### 状态管理原则

**核心原则**：**业务状态和执行状态分离**

| 实体 | 状态字段 | 职责 |
|------|---------|------|
| GenerationRequest | **无 status** | 容器，管理请求元信息 |
| GeneratedImage | `imageStatus` | 图片业务状态（PENDING/GENERATING/COMPLETED/FAILED） |
| GeneratedModel | **无 status** | 模型实体，状态通过 Job 体现 |
| ImageGenerationJob | `status` | 图片生成执行状态（PENDING/RUNNING/RETRYING/COMPLETED/FAILED/TIMEOUT） |
| ModelGenerationJob | `status` | 模型生成执行状态（PENDING/RUNNING/RETRYING/COMPLETED/FAILED/TIMEOUT） |

**状态流转示例**：

```
用户创建请求
   ↓
GenerationRequest (创建) + 4个 GeneratedImage (imageStatus=PENDING) + 4个 ImageGenerationJob (status=PENDING)
   ↓
ImageWorker 监听 Job.status=PENDING
   ↓
Job (PENDING → RUNNING) + Image (PENDING → GENERATING)
   ↓
生成成功 → Job (COMPLETED) + Image (COMPLETED, imageUrl 设置)
生成失败 → Job (RETRYING/FAILED) + Image (保持 GENERATING 或 FAILED)
   ↓
用户选择图片 → 创建 GeneratedModel + ModelGenerationJob (status=PENDING)
   ↓
Model3DWorker 监听 Job.status=PENDING
   ↓
Job (PENDING → RUNNING) + Model (创建)
   ↓
生成成功 → Job (COMPLETED) + Model (modelUrl 设置)
生成失败 → Job (RETRYING/FAILED) + Model (failedAt 设置)
```

### 页面结构

项目采用 Next.js App Router 架构:

- **`/`** (首页) - 展示 Hero 区域和模型画廊
  - `HeroSection` - 主搜索框和功能卡片展示
  - `ModelGallery` - 3D 模型展示画廊

- **`/workspace`** (工作台) - 图片生成和 3D 模型生成主工作流
  - 左侧:`ImageGrid` - 输入描述 → 生成4张图片 → 选择图片
  - 右侧:`ModelPreview` - 3D 模型生成进度和预览

### 工作流程

```
用户输入文本描述
    ↓
后端创建 GenerationRequest + 4个 GeneratedImage + 4个 ImageGenerationJob
    ↓
ImageWorker 监听并执行（每张图片独立生成）
    ↓
用户选择一张图片
    ↓
后端创建 GeneratedModel + ModelGenerationJob
    ↓
Model3DWorker 监听并执行（轮询腾讯云状态，带进度条）
    ↓
显示模型信息和下载按钮
```

### 核心组件

**工作台组件** (`components/workspace/`)
- `ImageGrid` - 管理文本输入、图片生成、图片选择的完整流程
- `ModelPreview` - 3D模型生成状态、进度显示、模型信息展示
- `GenerationProgress` - 进度条组件

**首页页面** (`app/home/`)
- `page.tsx` - 首页路由页面

**首页组件** (`app/home/`)
- `HeroSection` - 主页面英雄区,包含搜索框和标签云
- `HeroSearchBar` - 主搜索框,支持标签注入,导航到工作台
- `HeroFeatureCard` - 功能特性卡片

**布局组件** (`components/layout/`)
- `Navigation` - 顶部导航栏,响应式设计

**UI 组件** (`components/ui/`)
- `Skeleton` - 加载骨架屏
- `Toast` - 消息提示
- `EmptyState` - 空状态占位

### 常量配置 (`lib/constants.ts`)

```typescript
IMAGE_GENERATION.COUNT = 4           // 每次生成4张图片
IMAGE_GENERATION.MAX_PROMPT_LENGTH = 500  // 最大输入长度
```

## 样式系统

### 设计系统 (`app/globals.css`)

项目使用**专业3D工具级**的深色主题配色:

**颜色层级**:
- `--surface-base`: `#000000` - 页面背景(纯黑)
- `--surface-1`: `#0d0d0d` - 输入框等深色元素
- `--surface-2`: `#1a1a1a` - 卡片背景
- `--surface-3`: `#262626` - 高亮区域

**文字层级**:
- `--text-strong`: `#ffffff` - 主要文字(纯白)
- `--text-muted`: `rgba(255,255,255,0.90)` - 次要文字
- `--text-subtle`: `rgba(255,255,255,0.60)` - 辅助文字

**品牌色**:
- `--accent-yellow`: `#ffd93d` - 主要交互色
- `--accent-yellow-dim`: `#f9cf00` - 黄色暗调

### 通用样式类

**面板系统**:
- `.glass-panel` - 标准卡片容器(纯色背景 `#1a1a1a`,微妙边框)
- `.surface-card` - 备用卡片样式

**按钮系统**:
- `.btn-primary` - 黄色主要按钮(渐变背景)
- `.btn-secondary` - 次要按钮(深色背景+边框)

**动画**:
- `.fade-in-up` - 淡入上移动画
- `@keyframes scale-in` - 缩放进入动画

### 圆角规范

- `--radius-sm`: `0.75rem` (12px)
- `--radius-md`: `1rem` (16px)
- `--radius-lg`: `1.25rem` (20px)
- `--radius-xl`: `2rem` (32px)

## 代码规范

### 组件规范

- 使用 **函数组件** + **TypeScript**
- 所有组件使用 `"use client"` 指令(客户端交互)
- Props 类型定义使用 `interface` 并导出

### 组件目录规范

**组件存放规则**：
- **页面级组件** → `app/[page]/components/` - 仅在特定页面使用的组件
- **全局组件** → `components/` - 跨页面共享的组件（layout、ui等）

**示例**：
```
app/
├── home/
│   └── components/          # 首页专用组件
│       ├── HeroSection.tsx
│       └── ModelGallery.tsx
└── workspace/
    └── components/          # 工作台专用组件
        ├── ImageGrid.tsx
        └── ModelPreview.tsx

components/
├── layout/                  # 全局布局组件
│   └── Navigation.tsx
└── ui/                      # 全局UI组件
    ├── Toast.tsx
    └── Skeleton.tsx
```

### 样式规范

- **优先使用全局样式类** - `.btn-primary`、`.glass-panel` 等
- **Tailwind 用于布局** - flex、grid、间距等
- **避免内联样式** - 除非动态计算

### 文件组织

```
components/
  ├── layout/      # 全局布局组件(导航等)
  └── ui/          # 全局UI组件(Toast、Skeleton等)

lib/
  ├── repositories/  # 数据访问层（Repository 模式）
  │   ├── generation-request.repository.ts  # GenerationRequest CRUD
  │   ├── generated-image.repository.ts     # GeneratedImage CRUD
  │   ├── generated-model.repository.ts     # GeneratedModel CRUD
  │   ├── job.repository.ts                 # Job CRUD
  │   ├── queue-config.repository.ts        # QueueConfig CRUD
  │   └── user-asset.repository.ts          # UserAsset CRUD
  ├── services/      # 业务逻辑层
  │   ├── generation-request-service.ts  # GenerationRequest 业务逻辑
  │   ├── generated-model-service.ts     # GeneratedModel 业务逻辑
  │   └── prompt-optimizer.ts            # 提示词优化服务
  ├── providers/   # 外部API封装（适配器模式）
  │   ├── image/   # 图片生成服务（统一接口，多渠道适配器）
  │   ├── llm/     # LLM服务（提示词优化）
  │   ├── model3d/ # 3D模型生成服务
  │   └── storage/ # 存储服务（本地/OSS/COS）
  ├── validators/  # Zod验证schemas
  ├── utils/       # 工具函数
  │   ├── errors.ts      # 统一错误处理
  │   ├── retry.ts       # 重试工具
  │   └── image-storage.ts  # 图片存储工具
  ├── workers/     # 后台任务处理（Job-Based 架构）
  │   ├── index.ts              # Worker 统一启动入口
  │   ├── image-worker.ts       # 图片生成 Worker
  │   ├── model3d-worker.ts     # 3D 模型生成 Worker
  │   └── worker-config-manager.ts  # Worker 配置管理器
  └── constants.ts # 全局常量

types/
  └── index.ts     # TypeScript 类型定义

app/
  ├── page.tsx           # 首页
  ├── home/
  │   └── components/    # 首页专用组件
  ├── workspace/
  │   ├── page.tsx       # 工作台页面
  │   └── components/    # 工作台专用组件
  ├── api/               # API路由
  │   ├── tasks/         # 任务相关API（已废弃，使用 test/requests）
  │   ├── test/          # 测试 API（新架构）
  │   │   ├── requests/  # GenerationRequest CRUD
  │   │   └── models/    # GeneratedModel CRUD
  │   ├── workers/       # Worker 状态监控
  │   └── admin/         # 管理后台（队列配置等）
  ├── layout.tsx         # 根布局
  └── globals.css        # 全局样式

instrumentation.ts       # Next.js 启动钩子（启动 Workers）
```

## 开发注意事项

### 图片生成渠道配置

项目支持**多渠道图片生成**，可根据环境变量自动选择不同的 API 服务商。

#### 支持的渠道

| 渠道 | 环境变量 | 特点 |
|------|---------|------|
| **SiliconFlow** | `SILICONFLOW_API_KEY` | 🌟 推荐：性价比高、永久URL、多模型支持 |
| **阿里云** | `ALIYUN_IMAGE_API_KEY` | 备选：24小时临时URL |

#### 渠道选择优先级

```typescript
优先级: SILICONFLOW_API_KEY > ALIYUN_IMAGE_API_KEY
```

Worker 会自动检测环境变量并选择合适的渠道：
- 如果配置了 `SILICONFLOW_API_KEY`，优先使用 SiliconFlow
- 否则使用阿里云（需要 `ALIYUN_IMAGE_API_KEY`）
- 如果都未配置，启动时会抛出错误

#### 配置示例

```bash
# .env.local

# 方式1: 使用 SiliconFlow (推荐)
SILICONFLOW_API_KEY=sk-your-api-key-here

# 方式2: 使用阿里云 (备选)
ALIYUN_IMAGE_API_KEY=sk-your-api-key-here
```

### 提示词优化 LLM 渠道配置

项目支持**多渠道 LLM** 来优化用户输入的提示词，使其更适合 3D 打印场景。

#### 支持的渠道

| 渠道 | 环境变量 | 模型 | 特点 |
|------|---------|------|------|
| **SiliconFlow** | `SILICONFLOW_LLM_API_KEY` | `deepseek-ai/DeepSeek-V3` | 🌟 推荐：性价比高、性能强大 |
| **阿里云通义千问** | `QWEN_API_KEY` | `qwen-max` | 备选：OpenAI 兼容模式 |

#### 渠道选择优先级

```typescript
优先级: SILICONFLOW_LLM_API_KEY > QWEN_API_KEY
```

提示词优化服务会自动检测环境变量并选择合适的 LLM 渠道：
- 如果配置了 `SILICONFLOW_LLM_API_KEY`，优先使用 SiliconFlow DeepSeek-V3
- 否则使用阿里云通义千问（需要 `QWEN_API_KEY`）
- 如果都未配置，启动时会抛出错误
- **优雅降级**：如果 LLM 调用失败，自动使用用户原始输入

#### 配置示例

```bash
# .env.local

# 方式1: 使用 SiliconFlow (推荐)
SILICONFLOW_LLM_API_KEY=sk-your-api-key-here
SILICONFLOW_LLM_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_LLM_MODEL=deepseek-ai/DeepSeek-V3

# 方式2: 使用阿里云通义千问 (备选)
QWEN_API_KEY=sk-your-api-key-here
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-max
```

#### LLM Provider 架构

提示词优化服务使用统一的 LLM Provider 接口 (`lib/providers/llm-provider.ts`)：

```typescript
// 自动选择最优渠道
const provider = getLLMProvider(); // "siliconflow" | "qwen"

// 统一的聊天补全接口
const result = await chatCompletion({
  systemPrompt: "系统提示词",
  userPrompt: "用户输入",
  temperature: 0.7,
  responseFormat: "json"  // 或 "text"
});

// 生成提示词变体（用于图片生成）
const variants = await generatePromptVariants(
  userInput,
  systemPrompt
); // 返回4个不同风格的提示词
```

**降级策略**：如果提示词优化失败（API 错误、网络问题等），系统会自动使用用户原始输入，确保业务连续性。

### Mock 模式

在开发阶段，为了避免频繁调用真实 API，项目支持 Mock 模式。当启用 Mock 模式时，图片生成功能将返回预定义的假图片数据。

**启用方式**：
在 `.env.local` 文件中设置 `NEXT_PUBLIC_MOCK_MODE=true` 即可启用 Mock 模式。

**使用场景**：
- 开发阶段节省 API 调用成本
- 网络环境不佳时进行本地开发
- 快速原型验证和 UI 调试

**注意**: Mock 模式对所有渠道生效，无需配置具体的 API Key。

### 路径别名

- 使用 `@/*` 引用根目录文件
- 示例: `import { IMAGE_GENERATION } from "@/lib/constants"`

### 布局技巧

**工作台左侧布局** (ImageGrid):
- 输入区固定高度,图片网格使用 `flex-1` 自动填充
- 使用 `min-h-0` 允许 flex 子元素正确缩小
- 图片卡片使用 `h-full w-full` 填充网格单元格

**避免布局抖动**:
- 选中状态边框变化时,使用内边距补偿(如 `p-px` vs `p-0`)

### 状态管理模式

```typescript
// 图片生成流程
const [status, setStatus] = useState<GenerationStatus>("idle");
const [images, setImages] = useState<string[]>([]);
const [selectedImage, setSelectedImage] = useState<number | null>(null);

// 生成 → 选择 → 传递给3D预览
handleGenerate() → setImages() → handleSelect() → onGenerate3D(index)
```

### 字体配置

- 使用 `next/font` 加载 Geist Sans 和 Geist Mono
- 在 `app/layout.tsx` 中配置
- CSS 变量: `--font-geist-sans`, `--font-geist-mono`

## TypeScript 配置

- **严格模式启用** - `strict: true`
- **路径映射** - `@/*` → 根目录
- **编译目标** - ES2017
- **模块解析** - bundler

## Biome 配置

- **缩进**: 2空格
- **自动整理 imports**
- **启用推荐规则集**
- 提交前运行 `npm run format`


## 后端架构规范

### 四层架构

```
API路由层 (app/api/) → Service层 (lib/services/) → Repository层 (lib/repositories/) → 数据访问层 (Prisma)
                                                      ↓
                                              Worker层 (lib/workers/)
```

**目录结构**:
- `lib/repositories/` - **数据访问层**（Repository 模式，封装 Prisma 操作）
  - `generation-request.repository.ts` - GenerationRequest CRUD
  - `generated-image.repository.ts` - GeneratedImage CRUD
  - `generated-model.repository.ts` - GeneratedModel CRUD
  - `job.repository.ts` - ImageGenerationJob / ModelGenerationJob CRUD
  - `queue-config.repository.ts` - QueueConfig CRUD
  - `user-asset.repository.ts` - UserAsset CRUD
- `lib/services/` - **业务逻辑层**（调用 Repository 和 Provider）
  - `generation-request-service.ts` - GenerationRequest 业务逻辑
  - `generated-model-service.ts` - GeneratedModel 业务逻辑
  - `prompt-optimizer.ts` - 提示词优化服务
- `lib/providers/` - **外部API封装**（采用适配器模式）
  - `image/` - 图片生成服务（统一接口，多渠道适配器）
  - `llm/` - LLM服务（提示词优化）
  - `model3d/` - 3D模型生成服务
  - `storage/` - 存储服务（本地/OSS/COS）
- `lib/workers/` - **后台任务处理**（Job-Based 架构）
  - `image-worker.ts` - 图片生成 Worker（监听 ImageGenerationJob）
  - `model3d-worker.ts` - 3D 模型生成 Worker（监听 ModelGenerationJob）
  - `worker-config-manager.ts` - Worker 配置管理器
- `lib/validators/` - Zod验证schemas
- `lib/utils/errors.ts` - 统一错误处理

### Repository 层规范

**核心原则**：
1. **封装 Prisma 操作**，隔离数据库访问逻辑
2. **不包含业务逻辑**，只提供 CRUD 操作
3. **统一命名规范**：`find*`, `create*`, `update*`, `delete*`
4. **关联查询**：使用 `include` 预加载关联数据

**示例**：
```typescript
// lib/repositories/generation-request.repository.ts

/**
 * 根据 ID 查询 GenerationRequest（包含关联数据）
 */
export async function findRequestById(requestId: string) {
  return prisma.generationRequest.findUnique({
    where: { id: requestId },
    include: {
      images: {
        orderBy: { index: "asc" },
        include: {
          generatedModel: true,
          generationJob: {
            select: { status: true, retryCount: true },
          },
        },
      },
    },
  });
}

/**
 * 创建 GenerationRequest + 4个 GeneratedImage + 4个 ImageGenerationJob（事务）
 */
export async function createRequestWithImagesAndJobs(data: {
  userId: string;
  prompt: string;
}): Promise<{
  request: GenerationRequest;
  imageIds: string[];
  jobIds: string[];
}> {
  const result = await prisma.$transaction(async (tx) => {
    // 1. 创建 GenerationRequest
    const request = await tx.generationRequest.create({
      data: { userId: data.userId, prompt: data.prompt },
    });

    // 2. 创建 4 个 GeneratedImage
    const images = await Promise.all(
      [0, 1, 2, 3].map((index) =>
        tx.generatedImage.create({
          data: {
            requestId: request.id,
            index,
            imageStatus: "PENDING",
            imageUrl: null,
          },
        }),
      ),
    );

    // 3. 为每个 Image 创建 ImageGenerationJob
    const jobs = await Promise.all(
      images.map((image) =>
        tx.imageGenerationJob.create({
          data: {
            imageId: image.id,
            status: "PENDING",
            priority: 0,
          },
        }),
      ),
    );

    return {
      request,
      imageIds: images.map((img) => img.id),
      jobIds: jobs.map((job) => job.id),
    };
  });

  return result;
}
```

### 错误处理规则

**核心原则**: 所有API路由必须使用 `withErrorHandler` 包装,错误会自动转换为标准响应。

**错误优先级** (从高到低):
1. `ZodError` → 400 + 详细验证错误
2. `AppError` → 对应状态码 + 错误代码
3. `AliyunAPIError` → 500 + 外部API错误
4. `Unknown` → 500 + 通用错误

**错误代码** (定义在 `lib/utils/errors.ts`):
- `VALIDATION_ERROR` (400) - 输入验证失败
- `NOT_FOUND` (404) - 资源不存在
- `INVALID_STATE` (409) - 状态不允许操作
- `QUEUE_FULL` (503) - 队列已满
- `EXTERNAL_API_ERROR` (500) - 外部API错误

**使用示例**:
```typescript
// API路由 - 必须使用withErrorHandler包装
export const GET = withErrorHandler(async (request: NextRequest) => {
  const validatedData = schema.parse(body); // Zod错误自动处理
  const result = await Service.method(); // AppError自动转换
  return NextResponse.json({ success: true, data: result });
});

// Service层 - 抛出AppError
if (!resource) {
  throw new AppError("NOT_FOUND", `资源不存在: ${id}`);
}
```

### Zod验证规则

1. **验证schema放在** `lib/validators/`,导出类型供Service层使用
2. **API层负责验证**,Service层接收已验证的数据
3. **查询参数验证需处理null**: `searchParams.get()` 返回 `string|null`

### Service层规则

1. **使用纯函数**,避免类封装
2. **完整的JSDoc注释**: `@param` / `@returns` / `@throws`
3. **抛出AppError**: `throw new AppError("NOT_FOUND", message, details?)`

### Provider 架构（适配器模式）

项目使用**适配器模式**管理外部 API 调用，实现统一接口和多渠道支持。

#### 图片生成 Provider (`lib/providers/image/`)

**目录结构**:
```
lib/providers/image/
├── types.ts              # 统一接口定义
├── base.ts               # 抽象基类（公共逻辑）
├── factory.ts            # 工厂函数（自动选择渠道）
├── adapters/             # 渠道适配器
│   ├── aliyun.ts        # 阿里云适配器
│   ├── siliconflow.ts   # SiliconFlow 适配器
│   └── mock.ts          # Mock 适配器（开发用）
└── index.ts              # 统一导出
```

**使用方式**:
```typescript
import { createImageProvider } from '@/lib/providers/image';

// 自动根据环境变量选择渠道
const imageProvider = createImageProvider();

// 批量生成
const images = await imageProvider.generateImages(prompt, 4);

// 流式生成
const stream = imageProvider.generateImageStream(prompt, 4);
for await (const imageUrl of stream) {
  console.log('生成图片:', imageUrl);
}
```

**核心特性**:
- ✅ 统一接口：所有适配器实现相同的 `ImageGenerationProvider` 接口
- ✅ 自动选择：工厂函数根据环境变量自动选择渠道
- ✅ Mock 模式：开发时自动使用 Mock 数据，无需配置 API Key
- ✅ 类型安全：完整的 TypeScript 类型定义
- ✅ 易于扩展：新增渠道只需添加新适配器

**渠道优先级**:
```
1. Mock 模式 (NEXT_PUBLIC_MOCK_MODE=true)
2. SiliconFlow (SILICONFLOW_API_KEY)
3. 阿里云 (ALIYUN_IMAGE_API_KEY)
```

#### LLM Provider (`lib/providers/llm/`)

**目录结构**:
```
lib/providers/llm/
├── types.ts              # 统一接口定义
├── base.ts               # 抽象基类（公共逻辑、Mock 模式）
├── factory.ts            # 工厂函数（自动选择渠道）
├── adapters/             # 渠道适配器
│   ├── qwen.ts          # 阿里云通义千问适配器
│   ├── siliconflow.ts   # SiliconFlow DeepSeek-V3 适配器
│   └── mock.ts          # Mock 适配器（开发用）
└── index.ts              # 统一导出
```

**使用方式**:
```typescript
import { createLLMProvider } from '@/lib/providers/llm';

// 自动根据环境变量选择渠道
const llmProvider = createLLMProvider();

// 聊天补全
const response = await llmProvider.chatCompletion({
  systemPrompt: "你是一个有帮助的助手",
  userPrompt: "请介绍一下你自己",
  temperature: 0.7,
  responseFormat: "text"
});

// 生成提示词变体（用于图片生成）
const variants = await llmProvider.generatePromptVariants(
  "一只可爱的小猫",
  "生成4个不同风格的提示词变体"
);
```

**核心特性**:
- ✅ 统一接口：所有适配器实现相同的 `LLMProvider` 接口
- ✅ OpenAI 兼容：Qwen 和 SiliconFlow 都使用 OpenAI SDK
- ✅ Mock 模式：开发时自动使用 Mock 数据
- ✅ 优雅降级：LLM 调用失败时自动使用原始输入
- ✅ 类型安全：完整的 TypeScript 类型定义

**渠道优先级**:
```
1. Mock 模式 (NEXT_PUBLIC_MOCK_MODE=true)
2. SiliconFlow (SILICONFLOW_LLM_API_KEY)
3. 阿里云通义千问 (QWEN_API_KEY)
```

#### Model3D Provider (`lib/providers/model3d/`)

**目录结构**:
```
lib/providers/model3d/
├── types.ts              # 统一接口定义
├── base.ts               # 抽象基类（公共逻辑、Mock 模式）
├── factory.ts            # 工厂函数（自动选择渠道）
├── adapters/             # 渠道适配器
│   ├── tencent.ts       # 腾讯云混元 3D 适配器
│   └── mock.ts          # Mock 适配器（开发用）
└── index.ts              # 统一导出
```

**使用方式**:
```typescript
import { createModel3DProvider } from '@/lib/providers/model3d';

// 自动根据环境变量选择渠道
const model3DProvider = createModel3DProvider();

// 提交任务
const { jobId } = await model3DProvider.submitModelGenerationJob({
  imageUrl: "https://example.com/image.jpg",
  prompt: "optional prompt"
});

// 查询状态
const status = await model3DProvider.queryModelTaskStatus(jobId);
console.log('任务状态:', status.status); // WAIT | RUN | DONE | FAIL
```

**核心特性**:
- ✅ 统一接口：所有适配器实现相同的 `Model3DProvider` 接口
- ✅ 任务跟踪：提供完整的任务状态查询
- ✅ Mock 模式：开发时模拟任务从 WAIT → RUN → DONE 的状态变化
- ✅ 错误处理：统一的 `TencentAPIError` 错误类型
- ✅ 易于扩展：支持添加其他 3D 生成服务

**渠道优先级**:
```
1. Mock 模式 (NEXT_PUBLIC_MOCK_MODE=true)
2. 腾讯云混元 3D (TENCENTCLOUD_SECRET_ID + TENCENTCLOUD_SECRET_KEY)
```

#### Storage Provider (`lib/providers/storage/`)

**目录结构**:
```
lib/providers/storage/
├── types.ts              # 统一接口定义
├── base.ts               # 抽象基类（公共逻辑）
├── factory.ts            # 工厂函数（自动选择存储方式）
├── adapters/             # 存储适配器
│   ├── local.ts         # 本地文件系统适配器 ✅ 完整实现
│   ├── aliyun-oss.ts    # 阿里云 OSS 适配器（占位符）
│   └── tencent-cos.ts   # 腾讯云 COS 适配器 ✅ 完整实现
└── index.ts              # 统一导出
```

**使用方式**:
```typescript
import { createStorageProvider } from '@/lib/providers/storage';

// 自动根据环境变量选择存储方式
const storageProvider = createStorageProvider();

// 保存图片（支持 Buffer 或 Base64 字符串）
const imageUrl = await storageProvider.saveTaskImage({
  taskId: "task-123",
  index: 0,
  imageData: buffer  // 或 "data:image/png;base64,..."
});

// 保存模型文件
const modelUrl = await storageProvider.saveTaskModel({
  taskId: "task-123",
  modelData: buffer,
  format: "glb"  // 或 "obj", "fbx", "gltf"
});

// 保存通用文件（MTL、纹理等）
const fileUrl = await storageProvider.saveFile({
  taskId: "task-123",
  fileName: "texture.mtl",
  fileData: buffer,
  contentType: "text/plain"  // 可选
});

// 检查文件是否存在
const exists = await storageProvider.fileExists(imageUrl);

// 获取文件信息（大小、是否存在）
const info = await storageProvider.getFileInfo(imageUrl);
console.log(info.size, info.exists);

// 删除任务的所有资源（图片 + 模型）
await storageProvider.deleteTaskResources("task-123");

// Mock 数据生成（用于开发测试）
const mockImageUrl = await storageProvider.saveMockImage("task-123", 0);
const mockModelUrl = await storageProvider.saveMockModel("task-123");
```

**核心特性**:
- ✅ 统一接口：所有适配器实现相同的 `StorageProvider` 接口
- ✅ 多种存储：支持本地文件系统、阿里云 OSS、腾讯云 COS
- ✅ 自动选择：根据环境变量自动选择最佳存储方式
- ✅ 格式支持：图片（PNG/JPG）、模型（GLB/GLTF/OBJ/FBX）、通用文件
- ✅ Mock 数据：提供 `saveMockImage` 和 `saveMockModel` 方法生成假数据
- ✅ 易于迁移：切换存储方式无需修改业务代码
- ✅ 批量删除：删除任务时自动清理所有关联资源

**存储方式优先级**:
```
1. 腾讯云 COS (TENCENT_COS_SECRET_ID + TENCENT_COS_SECRET_KEY + TENCENT_COS_BUCKET)
2. 阿里云 OSS (ALIYUN_OSS_ACCESS_KEY_ID + ALIYUN_OSS_ACCESS_KEY_SECRET)
3. 本地文件系统 (默认，存储到 public/generated/)
```

**腾讯云 COS 配置示例**:
```bash
# .env.local
TENCENT_COS_SECRET_ID=your-secret-id
TENCENT_COS_SECRET_KEY=your-secret-key
TENCENT_COS_BUCKET=your-bucket-1234567890  # 包含 AppId
TENCENT_COS_REGION=ap-beijing              # 默认北京
```

**本地存储目录结构**:
```
public/generated/
├── images/
│   └── {taskId}/
│       ├── 0.png
│       ├── 1.png
│       ├── 2.png
│       └── 3.png
└── models/
    └── {taskId}.glb  # 或 .obj, .fbx, .gltf
```

**实现状态**:
- ✅ **本地文件系统** - 完整实现，适合开发和小规模部署
- ✅ **腾讯云 COS** - 完整实现，已安装 `cos-nodejs-sdk-v5`，适合生产环境
- ⚠️ **阿里云 OSS** - 占位符实现，需安装 `ali-oss` SDK

## Worker 架构：Job-Based + 三层任务处理

项目采用 **Job-Based 异步任务处理架构**，每个任务（Image/Model）都有独立的 Job 实体，支持细粒度的状态管理、重试和优先级控制。

### 核心原则

```
API 层 → 创建 Job（PENDING 状态）→ 快速响应
   ↓
Worker 层 → 三层任务处理（超时检测 → 重试调度 → 新任务执行）
   ↓
更新 Job 状态（RUNNING → COMPLETED/FAILED）+ 更新业务实体状态
```

**关键设计**：
- ✅ **业务状态和执行状态分离**：Image.imageStatus（业务）+ Job.status（执行）
- ✅ **每个 Image 独立 Job**：4 张图片并发生成，独立重试
- ✅ **三层任务处理**：超时检测 → 重试调度 → 新任务执行
- ✅ **动态配置**：使用 WorkerConfigManager 动态调整并发数、超时时间、重试策略
- ✅ **优先级队列**：支持高优先级任务优先执行

### Worker 启动机制

Worker 通过 **Next.js Instrumentation Hook** 在服务端启动时自动运行:

```typescript
// instrumentation.ts (项目根目录)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAllWorkers } = await import('@/lib/workers');
    startAllWorkers();
  }
}
```

**特性**:
- ✅ 仅在服务端执行,客户端不会加载
- ✅ 在所有路由和中间件加载之前执行
- ✅ 不依赖任何 HTTP 请求
- ✅ 自动启动,无需手动干预

### Worker 工作流程：三层任务处理

项目包含两个 Worker，都采用**三层任务处理机制**：

#### **三层任务处理架构**

每个 Worker 的主循环包含三个独立的处理层，按优先级顺序执行：

```typescript
while (isRunning) {
  // Layer 1: 超时检测（最高优先级）
  await detectTimeoutJobs();

  // Layer 2: 重试调度（中等优先级）
  await scheduleRetryJobs();

  // Layer 3: 新任务执行（最低优先级）
  await executeNewJobs();

  await sleep(POLL_INTERVAL);  // 2秒
}
```

#### 1. **图片生成 Worker** (`lib/workers/image-worker.ts`)

**监听对象**：`ImageGenerationJob`（每张图片一个 Job）

**三层处理流程**：

**Layer 1: 超时检测**
```typescript
// 查询 RUNNING 状态且已超时的任务
const timeoutJobs = await prisma.imageGenerationJob.findMany({
  where: {
    status: "RUNNING",
    timeoutAt: { lte: new Date() }
  }
});

// 判断是否可以重试
if (canRetry(job.retryCount, maxRetries)) {
  // 更新为 RETRYING 状态，设置下次重试时间
  await updateJob({
    status: "RETRYING",
    retryCount: job.retryCount + 1,
    nextRetryAt: new Date(Date.now() + retryDelay)
  });
} else {
  // 超过最大重试次数，标记为 FAILED
  await updateJob({ status: "FAILED" });
  await updateImage({ imageStatus: "FAILED" });
}
```

**Layer 2: 重试调度**
```typescript
// 查询 RETRYING 状态且到达重试时间的任务
const retryJobs = await prisma.imageGenerationJob.findMany({
  where: {
    status: "RETRYING",
    nextRetryAt: { lte: new Date() }
  },
  take: maxConcurrency
});

// 并发处理重试任务
await Promise.all(retryJobs.map(job => processJob(job)));
```

**Layer 3: 新任务执行**
```typescript
// 查询 PENDING 状态的任务
const pendingJobs = await prisma.imageGenerationJob.findMany({
  where: { status: "PENDING" },
  orderBy: enablePriority
    ? [{ priority: "desc" }, { createdAt: "asc" }]
    : { createdAt: "asc" },
  take: maxConcurrency
});

// 并发处理新任务
await Promise.all(pendingJobs.map(job => processJob(job)));
```

**单个 Job 处理流程**：
```typescript
async function processJob(job: ImageGenerationJob) {
  try {
    // 1. 更新 Job 状态为 RUNNING
    await updateJob({
      status: "RUNNING",
      startedAt: new Date(),
      timeoutAt: new Date(Date.now() + jobTimeout)
    });

    // 2. 更新 Image 状态为 GENERATING
    await updateImage({ imageStatus: "GENERATING" });

    // 3. 生成单张图片
    //    - 生成 4 个风格变体提示词（LLM Provider）
    //    - 使用对应索引的提示词生成图片（Image Provider）
    //    - 下载并上传到存储（Storage Provider）
    const imageUrl = await generateSingleImage(prompt, requestId, imageIndex);

    // 4. 更新 Job 状态为 COMPLETED
    await updateJob({
      status: "COMPLETED",
      completedAt: new Date(),
      executionDuration
    });

    // 5. 更新 Image 状态为 COMPLETED
    await updateImage({
      imageStatus: "COMPLETED",
      imageUrl,
      completedAt: new Date()
    });
  } catch (error) {
    // 判断是否可以重试
    if (canRetry(job.retryCount, maxRetries)) {
      // 安排重试
      await updateJob({
        status: "RETRYING",
        retryCount: job.retryCount + 1,
        nextRetryAt: new Date(Date.now() + retryDelay)
      });
    } else {
      // 标记为失败
      await updateJob({ status: "FAILED" });
      await updateImage({ imageStatus: "FAILED" });
    }
  }
}
```

**关键特性**:
- ✅ **每张图片独立生成**：4 张图片并发处理，互不影响
- ✅ **独立重试**：某张图片失败不影响其他图片
- ✅ **超时保护**：超时自动重试或标记失败
- ✅ **优先级支持**：高优先级任务优先执行
- ✅ **动态并发**：根据配置动态调整并发数（默认 3）

#### 2. **3D 模型生成 Worker** (`lib/workers/model3d-worker.ts`)

**监听对象**：`ModelGenerationJob`（每个 Model 一个 Job）

**三层处理流程**（同图片生成 Worker）：

**单个 Job 处理流程**（关键在于轮询腾讯云状态）：
```typescript
async function processJob(job: ModelGenerationJob) {
  try {
    // 1. 更新 Job 状态为 RUNNING
    await updateJob({
      status: "RUNNING",
      startedAt: new Date(),
      timeoutAt: new Date(Date.now() + jobTimeout)  // 默认 10 分钟
    });

    // 2. 验证源图片 URL
    const sourceImageUrl = job.model.sourceImage.imageUrl;
    if (!sourceImageUrl) {
      throw new Error("源图片 URL 缺失");
    }

    // 3. 提交腾讯云混元 3D 任务
    const model3DProvider = createModel3DProvider();
    const { jobId } = await model3DProvider.submitModelGenerationJob({
      imageUrl: sourceImageUrl
    });

    // 4. 保存 Provider 的 jobId
    await updateJob({
      providerJobId: jobId,
      providerName: "tencent"
    });

    // 5. 轮询腾讯云任务状态（每 5 秒，最多 10 分钟）
    await pollModel3DStatus(job.id, job.modelId, jobId);

  } catch (error) {
    // 判断是否可以重试
    if (canRetry(job.retryCount, maxRetries)) {
      // 安排重试
      await updateJob({
        status: "RETRYING",
        retryCount: job.retryCount + 1,
        nextRetryAt: new Date(Date.now() + retryDelay)
      });
      await updateModel({
        errorMessage: "生成失败，正在重试"
      });
    } else {
      // 标记为失败
      await updateJob({ status: "FAILED" });
      await updateModel({ failedAt: new Date(), errorMessage });
    }
  }
}

// 轮询腾讯云状态
async function pollModel3DStatus(jobId, modelId, providerJobId) {
  const startTime = Date.now();

  while (true) {
    const elapsed = Date.now() - startTime;

    // 检查是否超时（10 分钟）
    if (elapsed > MAX_POLL_TIME) {
      throw new Error("轮询超时");
    }

    await sleep(5000);  // 等待 5 秒

    // 查询腾讯云状态
    const status = await model3DProvider.queryModelTaskStatus(providerJobId);

    // 计算进度
    let progress = 0;
    if (status.status === "WAIT") progress = 0;
    else if (status.status === "RUN") progress = 50;
    else if (status.status === "DONE") progress = 100;

    // 更新 Job 进度
    await updateJob({ progress });

    // 处理完成状态
    if (status.status === "DONE") {
      // 提取 OBJ 文件 URL
      const modelFile = status.resultFiles?.find(f => f.type === "OBJ");
      if (!modelFile?.url) {
        throw new Error("返回结果中没有 OBJ 文件");
      }

      // 下载并上传到存储服务
      const storageUrl = await downloadAndUploadModel(
        modelFile.url,
        modelId,
        "obj"
      );

      // 下载预览图（如果有）
      let previewImageUrl;
      if (modelFile.previewImageUrl) {
        previewImageUrl = await downloadAndUploadPreviewImage(
          modelFile.previewImageUrl,
          modelId
        );
      }

      // 更新 Job 状态为 COMPLETED
      await updateJob({
        status: "COMPLETED",
        progress: 100,
        completedAt: new Date(),
        executionDuration
      });

      // 更新 Model 状态
      await updateModel({
        modelUrl: storageUrl,
        previewImageUrl,
        format: "OBJ",
        completedAt: new Date(),
        errorMessage: null  // 清除之前的错误信息
      });

      return;
    }

    // 处理失败状态
    if (status.status === "FAIL") {
      throw new Error(status.errorMessage || "3D 模型生成失败");
    }

    // 继续轮询（WAIT 或 RUN 状态）
  }
}
```

**关键特性**:
- ✅ **腾讯云状态轮询**：WAIT → RUN → DONE/FAIL
- ✅ **进度追踪**：Job.progress（0 → 50 → 100）
- ✅ **超时保护**：轮询超时（10 分钟）+ Job 超时
- ✅ **独立重试**：失败后自动重试或标记失败
- ✅ **动态并发**：根据配置调整并发数（默认 1，3D 生成耗时长）

### Worker 配置（动态可调整）

Worker 使用 **WorkerConfigManager** 管理配置，支持运行时动态调整。

#### QueueConfig 表字段

```typescript
{
  queueName: "image_generation" | "model_generation",

  // 并发控制
  maxConcurrency: number,     // 最大并发数（图片: 3, 模型: 1）

  // 超时控制
  jobTimeout: number,         // 单个 Job 超时时间（图片: 5分钟, 模型: 10分钟）

  // 重试策略
  maxRetries: number,         // 最大重试次数（默认 3）
  retryDelayBase: number,     // 重试基础延迟（默认 5秒）
  retryDelayMax: number,      // 重试最大延迟（默认 60秒）

  // 优先级
  enablePriority: boolean,    // 是否启用优先级（默认 false）

  // 队列状态
  isActive: boolean,          // 队列是否激活（默认 true）
}
```

#### Worker 配置示例

**图片生成 Worker**:
```typescript
{
  queueName: "image_generation",
  maxConcurrency: 3,          // 并发 3 个图片任务
  jobTimeout: 300000,         // 5 分钟超时
  maxRetries: 3,
  retryDelayBase: 5000,
  retryDelayMax: 60000,
  enablePriority: false,
  isActive: true
}
```

**3D 模型生成 Worker**:
```typescript
{
  queueName: "model_generation",
  maxConcurrency: 1,          // 并发 1 个模型任务（耗时长）
  jobTimeout: 600000,         // 10 分钟超时
  maxRetries: 3,
  retryDelayBase: 5000,
  retryDelayMax: 60000,
  enablePriority: false,
  isActive: true
}
```

#### 静态配置

```typescript
// lib/workers/image-worker.ts
POLL_INTERVAL: 2000           // Worker 轮询数据库间隔 (2秒)

// lib/workers/model3d-worker.ts
POLL_INTERVAL: 2000           // Worker 轮询数据库间隔 (2秒)
TENCENT_POLL_INTERVAL: 5000   // 轮询腾讯云状态间隔 (5秒)
MAX_TENCENT_POLL_TIME: 600000 // 最大轮询腾讯云时间 (10分钟)
```

#### 动态调整配置

```bash
# 暂停队列
POST /api/admin/queues/image_generation/pause

# 恢复队列
POST /api/admin/queues/image_generation/resume

# 调整并发数
PATCH /api/admin/queues/image_generation
{ maxConcurrency: 5 }
```

### Worker 监控

访问 `GET /api/workers/status` 查看 Worker 状态:

```json
{
  "success": true,
  "data": {
    "image": {
      "isRunning": true,
      "processingCount": 2,
      "processingTaskIds": ["task-123", "task-456"]
    },
    "model3d": {
      "isRunning": true,
      "processingCount": 1,
      "processingTaskIds": ["task-789"]
    }
  }
}
```

### 完整状态流转示例

#### 图片生成流程（Job-Based 架构）

```
用户输入提示词 → API 创建 Request + Images + Jobs → Worker 监听并执行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 用户输入: "一只可爱的猫咪"
   ↓
2. POST /api/test/requests
   { prompt: "一只可爱的猫咪" }
   ↓
3. API 事务创建:
   - GenerationRequest (无 status 字段)
   - 4 个 GeneratedImage (imageStatus=PENDING, imageUrl=null)
   - 4 个 ImageGenerationJob (status=PENDING)
   ↓ (立即返回)
4. ImageWorker 轮询检测到 4 个 Job.status=PENDING
   ↓
5. ImageWorker 并发处理 3 个 Job（第 4 个等待）
   ↓
   每个 Job 独立执行:
   ├─ Job: PENDING → RUNNING
   ├─ Image: PENDING → GENERATING
   ├─ 生成 4 个风格变体提示词 (LLM Provider)
   ├─ 使用对应索引的提示词生成图片 (Image Provider)
   ├─ 下载并上传到存储 (Storage Provider)
   ├─ Job: RUNNING → COMPLETED
   └─ Image: GENERATING → COMPLETED (imageUrl 设置)
   ↓
6. 前端轮询: 获取到 4 张图片，用户选择一张
```

**数据库状态变化**:
```sql
GenerationRequest:
  prompt: "一只可爱的猫咪"
  createdAt: 2025-01-15 10:00:00
  # 无 status 字段

GeneratedImage[0]: (4 张图片独立状态)
  imageStatus: PENDING → GENERATING → COMPLETED
  imageUrl: null → "https://storage.com/request-123/0.png"
  completedAt: null → 2025-01-15 10:00:05

ImageGenerationJob[0]: (4 个 Job 独立状态)
  status: PENDING → RUNNING → COMPLETED
  startedAt: null → 2025-01-15 10:00:01
  completedAt: null → 2025-01-15 10:00:05
  executionDuration: null → 4000 (毫秒)
  retryCount: 0
```

**失败重试示例**（某张图片生成失败）:
```sql
GeneratedImage[1]:
  imageStatus: PENDING → GENERATING (保持)

ImageGenerationJob[1]:
  status: PENDING → RUNNING → RETRYING → RUNNING → COMPLETED
  retryCount: 0 → 1 → 1 → 1
  nextRetryAt: null → 2025-01-15 10:00:10 → null
  startedAt: 10:00:01 → 10:00:10
  completedAt: null → 10:00:15
```

#### 3D 模型生成流程（Job-Based 架构）

```
用户选择图片 → API 创建 Model + Job → Worker 监听并执行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 用户选择第 2 张图片
   ↓
2. POST /api/test/models/generate
   { imageId: "image-123", name: "我的猫咪模型" }
   ↓
3. API 事务创建:
   - GeneratedModel (sourceImageId, 无 status 字段)
   - ModelGenerationJob (status=PENDING, priority=0)
   ↓ (立即返回)
4. Model3DWorker 检测到 Job.status=PENDING
   ↓
5. Model3DWorker 处理 Job:
   ├─ Job: PENDING → RUNNING
   ├─ 提交腾讯云混元 3D 任务（获得 providerJobId）
   ├─ Job: 保存 providerJobId
   ├─ 轮询腾讯云状态（每 5 秒）:
   │  ├─ WAIT → Job.progress=0
   │  ├─ RUN  → Job.progress=50
   │  └─ DONE → Job.progress=100
   ├─ 下载模型文件（OBJ 格式）
   ├─ 上传到存储服务
   ├─ Job: RUNNING → COMPLETED
   └─ Model: modelUrl 设置, completedAt 设置
   ↓
6. 前端轮询: 获取到 3D 模型，显示预览和下载按钮
```

**数据库状态变化**:
```sql
GeneratedModel:
  sourceImageId: "image-123"
  name: "我的猫咪模型.obj"
  modelUrl: null → "https://storage.com/model-456.obj"
  previewImageUrl: null → "https://storage.com/model-456-preview.png"
  format: "OBJ"
  completedAt: null → 2025-01-15 10:07:30
  # 无 status 字段

ModelGenerationJob:
  status: PENDING → RUNNING → COMPLETED
  progress: 0 → 0 → 50 → 100
  providerJobId: null → "tencent-job-xxx"
  providerName: null → "tencent"
  startedAt: null → 2025-01-15 10:05:00
  completedAt: null → 2025-01-15 10:07:30
  executionDuration: null → 150000 (2.5 分钟)
  retryCount: 0
```

**失败重试示例**（3D 生成失败）:
```sql
ModelGenerationJob:
  status: PENDING → RUNNING → RETRYING → RUNNING → COMPLETED
  retryCount: 0 → 1 → 1 → 1
  nextRetryAt: null → 2025-01-15 10:07:40 → null
  errorMessage: "腾讯云生成失败" → "腾讯云生成失败" → null

GeneratedModel:
  errorMessage: null → "生成失败，正在重试" → null
  completedAt: null → null → 2025-01-15 10:08:00
```

### Worker 目录结构

```
lib/workers/
  ├── index.ts              # Worker 统一启动入口
  ├── image-worker.ts       # 图片生成 Worker
  └── model3d-worker.ts     # 3D 模型生成 Worker

instrumentation.ts          # Next.js 启动钩子
```

### Worker 开发规范

1. **Worker 只监听 Job 状态，不暴露手动触发接口**
   - Worker 通过轮询数据库中的 Job 状态自动触发
   - API 层只负责创建 Job（PENDING 状态），不直接调用 Worker

2. **三层任务处理顺序**
   - Layer 1: 超时检测（最高优先级）
   - Layer 2: 重试调度（中等优先级）
   - Layer 3: 新任务执行（最低优先级）

3. **业务状态和执行状态分离**
   - 业务状态：Image.imageStatus, Model（通过 Job 体现）
   - 执行状态：Job.status（PENDING/RUNNING/RETRYING/COMPLETED/FAILED/TIMEOUT）

4. **使用 WorkerConfigManager 动态配置**
   - 每次轮询时刷新配置
   - 支持运行时调整并发数、超时时间、重试策略

5. **防止重复处理**
   - 使用 `Set` 跟踪 `processingJobs`
   - 查询时排除正在处理的 Job ID

6. **记录详细日志**
   - 使用 `createLogger` 统一日志格式
   - 记录 jobId、imageId/modelId、retryCount、duration 等关键信息

7. **完整的错误处理**
   - 捕获所有异常
   - 判断是否可以重试（根据 retryCount 和 maxRetries）
   - 更新 Job 状态为 RETRYING 或 FAILED
   - 更新业务实体状态（Image/Model）

8. **重试策略**
   - 使用指数退避算法（retryDelayBase * 2^retryCount）
   - 限制最大延迟（retryDelayMax）
   - 记录 nextRetryAt、retryCount、errorMessage、errorCode

9. **超时控制**
   - 设置 Job.timeoutAt（startedAt + jobTimeout）
   - 超时检测：查询 RUNNING 状态且 timeoutAt <= now 的任务
   - 超时后自动重试或标记失败

10. **优先级支持**
    - Job.priority 字段（数字越大优先级越高）
    - enablePriority 控制是否启用优先级排序
    - 高优先级任务优先执行

## 重要提示
- 每一行代码必须有注释，解释代码的作用和目的。
- 代码注释必须使用中文。
- 优先使用函数式编程范式。
- 统一使用ESM模块化语法。