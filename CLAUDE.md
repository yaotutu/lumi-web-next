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

**关键状态类型** (`types/index.ts`):
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
- `lib/providers/` - 外部API封装 (图片生成、LLM、3D模型等)
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

```typescript
// API 层创建任务并设置状态
POST /api/tasks
{ prompt: "用户输入的提示词" }
  ↓
createTaskWithStatus(userId, prompt, "GENERATING_IMAGES")  // 立即返回

// Worker 监听并执行
while (isRunning) {
  // 每 2 秒查询数据库
  const tasks = await prisma.task.findMany({
    where: { status: "GENERATING_IMAGES" },
    take: 3  // 最大并发3个任务
  });

  // 发现任务后执行完整流程
  for (const task of tasks) {
    - 生成4个风格变体提示词 (自动选择 SiliconFlow DeepSeek-V3 或 Qwen)
    - 调用图片生成API生成4张图片 (自动选择 SiliconFlow 或阿里云)
    - 断点续传(支持失败重试)
    - 更新状态为 IMAGES_READY
  }
}
```

#### 2. **3D 模型生成 Worker** (`lib/workers/model3d-worker.ts`)

```typescript
// API 层只改状态
PATCH /api/tasks/{id}
{ status: "GENERATING_MODEL" }  // 立即返回,不执行业务逻辑

// Worker 监听状态并执行
while (isRunning) {
  // 每 2 秒查询数据库
  const tasks = await prisma.task.findMany({
    where: { status: "GENERATING_MODEL" }
  });

  // 发现任务后执行完整流程
  for (const task of tasks) {
    - 提交腾讯云 AI3D 任务
    - 创建本地模型记录
    - 轮询腾讯云状态 (每 5 秒)
    - 更新最终状态 (COMPLETED/FAILED)
  }
}
```

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
2. POST /api/tasks → status=GENERATING_IMAGES (立即返回)
   ↓
3. ImageWorker: 检测到 GENERATING_IMAGES 状态
   ↓
4. ImageWorker: 生成4个风格变体提示词
   ↓
5. ImageWorker: 调用阿里云生成4张图片
   ↓
6. ImageWorker: status → IMAGES_READY
   ↓
7. 前端轮询: 获取到4张图片,用户选择一张
```

#### 3D 模型生成流程

```
用户选择图片 → API 更新状态 → Worker 监听执行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 用户选择第2张图片
   ↓
2. PATCH /api/tasks/{id} → status=GENERATING_MODEL (立即返回)
   ↓
3. Model3DWorker: 检测到 GENERATING_MODEL 状态
   ↓
4. Model3DWorker: 提交腾讯云AI3D任务
   ↓
5. Model3DWorker: 轮询腾讯云状态
   ↓
6. Model3DWorker: status → COMPLETED
   ↓
7. 前端轮询: 获取到3D模型,显示预览
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