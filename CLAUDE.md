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
生成4张参考图片 (模拟延迟1.5秒)
    ↓
用户选择一张图片
    ↓
生成3D模型 (模拟延迟3秒,带进度条)
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

### 状态管理

项目使用 React 内置 hooks 管理状态:
- `useState` - 本地组件状态
- `useEffect` - 副作用处理
- `useSearchParams` - URL 参数传递(Hero → Workspace)

**任务状态类型** (`prisma/schema.prisma`):

任务状态采用**阶段式设计**，清晰区分图片生成和模型生成两个阶段：

```typescript
enum TaskStatus {
  // === 图片生成阶段 ===
  IMAGE_PENDING      // 图片生成：等待开始（队列中）
  IMAGE_GENERATING   // 图片生成：生成中
  IMAGE_COMPLETED    // 图片生成：已完成，等待用户选择

  // === 3D模型生成阶段 ===
  MODEL_PENDING      // 模型生成：等待开始（用户已选图片）
  MODEL_GENERATING   // 模型生成：生成中
  MODEL_COMPLETED    // 模型生成：已完成

  // === 终态 ===
  FAILED            // 任务失败
  CANCELLED         // 用户取消
}
```

**完整状态流转**:
```
创建任务 → IMAGE_PENDING → IMAGE_GENERATING → IMAGE_COMPLETED
                                                      ↓
                                               (用户选择图片)
                                                      ↓
         MODEL_PENDING → MODEL_GENERATING → MODEL_COMPLETED
```

**前端组件状态映射** (`types/index.ts`):
- `GenerationStatus`: "idle" | "generating" | "completed" | "failed"
- `GeneratedImage` - 图片数据结构
- `Model3D` - 3D 模型数据结构

### 常量配置 (`lib/constants.ts`)

```typescript
IMAGE_GENERATION.COUNT = 4           // 每次生成4张图片
IMAGE_GENERATION.DELAY = 1500        // 模拟1.5秒延迟
IMAGE_GENERATION.MAX_PROMPT_LENGTH = 500  // 最大输入长度
MODEL_GENERATION.DELAY = 3000        // 3D生成3秒延迟
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
  ├── services/    # 业务逻辑层
  ├── providers/   # 外部API封装 (图片生成、LLM、3D模型等)
  ├── validators/  # Zod验证schemas
  ├── utils/       # 工具函数
  ├── workers/     # 后台任务处理 (图片生成、3D模型生成)
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
  ├── layout.tsx         # 根布局
  └── globals.css        # 全局样式
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

### 三层架构

```
API路由层 (app/api/) → Service层 (lib/services/) → 数据访问层 (Prisma)
```

**目录结构**:
- `lib/services/` - 业务逻辑层
- `lib/providers/` - 外部API封装（采用适配器模式）
  - `image/` - 图片生成服务（统一接口，多渠道适配器）
  - `llm/` - LLM服务（提示词优化）
  - `model3d/` - 3D模型生成服务
- `lib/workers/` - 后台任务处理 (图片生成Worker、3D模型生成Worker)
- `lib/validators/` - Zod验证schemas
- `lib/utils/errors.ts` - 统一错误处理

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

## Worker 架构

项目采用 **事件驱动的异步任务处理架构**,通过 Worker 机制处理耗时的后台任务。

### 核心原则

```
API 层 → 只负责状态变更 (快速响应)
Worker 层 → 监听状态变化并执行业务逻辑 (后台处理)
```

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

### Worker 工作流程

项目包含两个 Worker:

#### 1. **图片生成 Worker** (`lib/workers/image-worker.ts`)

**监听状态**: `IMAGE_PENDING`（任务创建后的初始状态）

```typescript
// API 层创建任务
POST /api/tasks
{ prompt: "用户输入的提示词" }
  ↓
createTask(userId, prompt)  // 默认 status="IMAGE_PENDING"，立即返回

// Worker 自动监听并执行
while (isRunning) {
  // 每 2 秒查询数据库，查找待处理任务
  const tasks = await prisma.task.findMany({
    where: { status: "IMAGE_PENDING" },  // 监听 IMAGE_PENDING
    take: 3  // 最大并发3个任务
  });

  // 发现任务后执行完整流程
  for (const task of tasks) {
    // 1. 更新状态为 IMAGE_GENERATING（标记为处理中）
    await updateTask(task.id, {
      status: "IMAGE_GENERATING",
      imageGenerationStartedAt: new Date()
    });

    // 2. 生成4个风格变体提示词 (LLM Provider)
    const variants = await llmProvider.generatePromptVariants(task.prompt, systemPrompt);

    // 3. 调用图片生成API生成4张图片 (Image Provider)
    const imageUrls = await imageProvider.generateImages(variants[0], 4);

    // 4. 保存图片到存储 (Storage Provider)
    for (let i = 0; i < imageUrls.length; i++) {
      await storageProvider.saveTaskImage({ taskId: task.id, index: i, imageData: imageUrls[i] });
    }

    // 5. 更新数据库记录
    await createTaskImages(task.id, imageUrls);

    // 6. 更新状态为 IMAGE_COMPLETED
    await updateTask(task.id, {
      status: "IMAGE_COMPLETED",
      imageGenerationCompletedAt: new Date()
    });
  }
}
```

**关键设计**:
- ✅ 断点续传：检查已生成的图片数量，仅生成缺失的图片
- ✅ 失败重试：支持最大3次重试，限流错误延迟30秒
- ✅ 并发控制：最多同时处理3个任务，防止资源耗尽
- ✅ 状态追踪：记录开始和完成时间戳

#### 2. **3D 模型生成 Worker** (`lib/workers/model3d-worker.ts`)

**监听状态**: `MODEL_PENDING`（用户选择图片后触发）

```typescript
// API 层只改状态（触发 Worker）
PATCH /api/tasks/{id}
{ selectedImageIndex: 2 }
  ↓
// API 检测到选中图片，自动设置 status="MODEL_PENDING"
await updateTask(taskId, {
  selectedImageIndex: 2,
  status: "MODEL_PENDING"  // 触发 Model3D Worker
});

// Worker 自动监听并执行
while (isRunning) {
  // 每 2 秒查询数据库，查找待处理任务
  const tasks = await prisma.task.findMany({
    where: { status: "MODEL_PENDING" },  // 监听 MODEL_PENDING
    take: 1  // 最大并发1个3D任务（3D生成耗时较长）
  });

  // 发现任务后执行完整流程
  for (const task of tasks) {
    // 1. 更新状态为 MODEL_GENERATING（标记为处理中）
    await updateTask(task.id, {
      status: "MODEL_GENERATING",
      modelGenerationStartedAt: new Date()
    });

    // 2. 获取选中的图片 URL
    const selectedImage = task.images[task.selectedImageIndex!];

    // 3. 提交腾讯云混元 3D 任务 (Model3D Provider)
    const { jobId } = await model3DProvider.submitModelGenerationJob({
      imageUrl: selectedImage.url
    });

    // 4. 创建本地模型记录（初始状态 PENDING）
    await prisma.taskModel.create({
      data: {
        taskId: task.id,
        name: `${task.prompt.substring(0, 20)}.glb`,
        status: "PENDING",
        apiTaskId: jobId,
        format: "GLB"
      }
    });

    // 5. 轮询腾讯云任务状态（每 5 秒，最多 10 分钟）
    let finalStatus: "DONE" | "FAIL" = "FAIL";
    while (elapsed < MAX_POLL_TIME) {
      const statusResponse = await model3DProvider.queryModelTaskStatus(jobId);

      if (statusResponse.status === "DONE") {
        finalStatus = "DONE";
        break;
      } else if (statusResponse.status === "FAIL") {
        finalStatus = "FAIL";
        break;
      }

      // 更新进度
      await prisma.taskModel.update({
        where: { taskId: task.id },
        data: {
          status: statusResponse.status === "RUN" ? "GENERATING" : "PENDING",
          progress: calculateProgress(elapsed)
        }
      });

      await sleep(5000);
    }

    // 6. 下载并保存模型文件（如果成功）
    if (finalStatus === "DONE") {
      const modelBuffer = await downloadModel(statusResponse.modelUrl);
      const localUrl = await storageProvider.saveTaskModel({
        taskId: task.id,
        modelData: modelBuffer,
        format: "glb"
      });

      // 7. 更新模型记录和任务状态为 MODEL_COMPLETED
      await prisma.taskModel.update({
        where: { taskId: task.id },
        data: {
          status: "COMPLETED",
          modelUrl: localUrl,
          completedAt: new Date()
        }
      });

      await updateTask(task.id, {
        status: "MODEL_COMPLETED",
        modelGenerationCompletedAt: new Date(),
        completedAt: new Date()
      });
    } else {
      // 8. 失败处理
      await updateTask(task.id, {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: "3D 模型生成失败"
      });
    }
  }
}
```

**关键设计**:
- ✅ 自动触发：用户选择图片后，API 自动设置 `MODEL_PENDING` 触发 Worker
- ✅ 状态同步：TaskModel 的 status（PENDING/GENERATING/COMPLETED/FAILED）与腾讯云 API 的状态（WAIT/RUN/DONE/FAIL）对应
- ✅ 轮询机制：每 5 秒查询一次任务状态，最多轮询 10 分钟
- ✅ 进度追踪：根据轮询时间计算进度百分比
- ✅ 并发限制：最多同时处理 1 个 3D 任务（3D 生成耗时长、资源消耗大）

### Worker 配置

**图片生成 Worker** (`lib/workers/image-worker.ts`):
```typescript
POLL_INTERVAL: 2000      // Worker 轮询数据库间隔 (2秒)
MAX_CONCURRENT: 3        // 最大并发图片生成任务数
RETRY_CONFIG: {
  maxRetries: 3,         // 最大重试3次
  baseDelay: 2000,       // 普通错误基础延迟2秒
  rateLimitDelay: 30000  // 限流错误延迟30秒
}
```

**3D 模型生成 Worker** (`lib/workers/model3d-worker.ts`):
```typescript
POLL_INTERVAL: 2000           // Worker 轮询数据库间隔 (2秒)
TENCENT_POLL_INTERVAL: 5000   // 轮询腾讯云状态间隔 (5秒)
MAX_TENCENT_POLL_TIME: 600000 // 最大轮询时间 (10分钟)
MAX_CONCURRENT: 1              // 最大并发3D任务数
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

#### 图片生成流程

```
用户输入提示词 → API 创建任务 → Worker 监听执行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 用户输入: "一只可爱的猫咪"
   ↓
2. POST /api/tasks
   → createTask(userId, prompt)
   → status = IMAGE_PENDING (立即返回)
   ↓
3. ImageWorker: 检测到 IMAGE_PENDING 状态
   ↓
4. ImageWorker: status → IMAGE_GENERATING（标记处理中）
   ↓
5. ImageWorker: 生成4个风格变体提示词 (LLM Provider)
   ↓
6. ImageWorker: 调用图片生成API (Image Provider: SiliconFlow 或阿里云)
   ↓
7. ImageWorker: 保存图片到存储 (Storage Provider: COS/OSS/Local)
   ↓
8. ImageWorker: 创建数据库记录 (TaskImage × 4)
   ↓
9. ImageWorker: status → IMAGE_COMPLETED
   ↓
10. 前端轮询: 获取到4张图片，用户选择一张
```

**数据库状态变化**:
```sql
Task:
  status: IMAGE_PENDING → IMAGE_GENERATING → IMAGE_COMPLETED
  imageGenerationStartedAt: null → 2025-01-15 10:00:00
  imageGenerationCompletedAt: null → 2025-01-15 10:00:05

TaskImage: (创建 4 条记录)
  taskId, index, url, prompt
```

#### 3D 模型生成流程

```
用户选择图片 → API 更新状态 → Worker 监听执行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 用户选择第2张图片
   ↓
2. PATCH /api/tasks/{id}
   { selectedImageIndex: 2 }
   → API 自动设置 status = MODEL_PENDING (立即返回)
   ↓
3. Model3DWorker: 检测到 MODEL_PENDING 状态
   ↓
4. Model3DWorker: status → MODEL_GENERATING（标记处理中）
   ↓
5. Model3DWorker: 提交腾讯云混元 3D 任务（获得 jobId）
   ↓
6. Model3DWorker: 创建 TaskModel 记录（status=PENDING, apiTaskId=jobId）
   ↓
7. Model3DWorker: 轮询腾讯云状态（每 5 秒）
   ├─ WAIT → TaskModel.status = PENDING
   ├─ RUN  → TaskModel.status = GENERATING (更新 progress)
   └─ DONE → 继续下一步
   ↓
8. Model3DWorker: 下载模型文件（GLB 格式）
   ↓
9. Model3DWorker: 保存到存储 (Storage Provider)
   ↓
10. Model3DWorker: 更新记录
    ├─ TaskModel.status → COMPLETED, modelUrl 设置
    └─ Task.status → MODEL_COMPLETED
   ↓
11. 前端轮询: 获取到3D模型，显示预览和下载按钮
```

**数据库状态变化**:
```sql
Task:
  selectedImageIndex: null → 2
  status: IMAGE_COMPLETED → MODEL_PENDING → MODEL_GENERATING → MODEL_COMPLETED
  modelGenerationStartedAt: null → 2025-01-15 10:05:00
  modelGenerationCompletedAt: null → 2025-01-15 10:07:30
  completedAt: null → 2025-01-15 10:07:30

TaskModel: (创建 1 条记录)
  status: PENDING → GENERATING → COMPLETED
  progress: 0 → 30 → 60 → 90 → 100
  apiTaskId: "tencent-job-xxx"
  modelUrl: "/generated/models/task-123.glb" (或 COS URL)
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

1. **Worker 只监听状态,不暴露手动触发接口**
2. **使用统一的重试工具** (`lib/utils/retry.ts`)
3. **记录详细日志** (使用 `createLogger`)
4. **防止重复处理** (使用 `Set` 跟踪处理中的任务)
5. **完整的错误处理** (更新数据库状态为 FAILED)

## 重要提示
- 每一行代码必须有注释，解释代码的作用和目的。
- 代码注释必须使用中文。
- 优先使用函数式编程范式。
- 统一使用ESM模块化语法。