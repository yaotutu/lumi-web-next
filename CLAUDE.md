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

### 样式规范

- **优先使用全局样式类** - `.btn-primary`、`.glass-panel` 等
- **Tailwind 用于布局** - flex、grid、间距等
- **避免内联样式** - 除非动态计算

### 文件组织

```
components/
  ├── layout/      # 布局组件(导航等)
  ├── hero/        # 首页英雄区
  ├── gallery/     # 模型画廊
  ├── workspace/   # 工作台核心组件
  └── ui/          # 通用UI组件

lib/
  ├── constants.ts # 全局常量
  └── utils.ts     # 工具函数(如有)

types/
  └── index.ts     # TypeScript 类型定义

app/
  ├── page.tsx           # 首页
  ├── workspace/page.tsx # 工作台页面
  ├── layout.tsx         # 根布局
  └── globals.css        # 全局样式
```

## 开发注意事项

### Mock 模式

在开发阶段，为了避免频繁调用真实的阿里云 API，项目支持 Mock 模式。当启用 Mock 模式时，图片生成功能将返回预定义的假图片数据，而不是调用真实的 API。

**启用方式**：
在 `.env.local` 文件中设置 `NEXT_PUBLIC_MOCK_MODE=true` 即可启用 Mock 模式。

**使用场景**：
- 开发阶段节省 API 调用成本
- 网络环境不佳时进行本地开发
- 快速原型验证和 UI 调试

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

**目录结构**: `lib/services/` (业务逻辑) | `lib/providers/` (外部API) | `lib/validators/` (Zod schemas) | `lib/utils/errors.ts` (统一错误处理)

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

## 重要提示
- 每一行代码必须有注释，解释代码的作用和目的。
- 代码注释必须使用中文。
- 优先使用函数式编程范式。