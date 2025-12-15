# Lumi Web Next

AI 3D 模型生成平台 - 前端项目

## 项目简介

Lumi Web Next 是一个基于 Next.js 的 AI 3D 模型生成平台前端应用。用户可以通过输入文本提示词，生成 4 张 AI 图片，然后选择其中一张图片生成 3D 模型。

**工作流程**：
1. 📝 用户输入文本提示词（如"一个机器人"）
2. 🎨 AI 生成 4 张图片供用户选择
3. 🎯 用户选择最喜欢的图片
4. 🎲 AI 将选中的图片转换为 3D 模型（GLB/3MF 格式）

## 技术栈

- **框架**: Next.js 15.5.4 (App Router + Turbopack)
- **UI**: React 19 + TypeScript 5
- **3D 渲染**: Three.js 0.180.0 + @react-three/fiber + @react-three/drei
- **状态管理**: Zustand 5.0.8
- **样式**: TailwindCSS 4 + 自定义设计系统
- **工具链**: Biome (代码检查和格式化)

## 架构说明

本项目采用**前后端分离架构**：

- **前端（本项目）**: lumi-web-next - Next.js 应用，负责 UI 展示和用户交互
- **后端**: [lumi-server](../lumi-server) - Fastify + Prisma 后端，负责 API、数据库、AI 服务调用

前端通过 `NEXT_PUBLIC_API_BASE_URL` 环境变量连接后端 API。

## 快速开始

### 前置要求

- Node.js 20+
- npm 或 pnpm
- **后端服务**: 需要先启动 [lumi-server](../lumi-server) 后端项目

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件（或复制 `.env.example`）：

```bash
# 后端 API 地址（确保后端已启动）
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# 可选：Mock 模式（用于前端独立开发）
NEXT_PUBLIC_MOCK_MODE=false
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:4100](http://localhost:4100) 查看应用。

### 生产构建

```bash
# 构建
npm run build

# 启动生产服务器（端口 4000）
npm start
```

## 项目结构

```
lumi-web-next/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 首页（Hero + 模型画廊）
│   ├── workspace/         # 工作台（图片/模型生成）
│   ├── history/           # 历史记录
│   ├── gallery/[id]/      # 模型详情页
│   ├── login/             # 邮箱登录页
│   └── api/               # API 路由（CORS 代理）
├── components/            # React 组件
│   ├── layout/           # 布局组件
│   ├── ui/               # 通用 UI 组件
│   └── workspace/        # 工作台专用组件
├── lib/                   # 工具库
│   ├── api/              # API 客户端
│   ├── stores/           # Zustand 状态管理
│   ├── hooks/            # 自定义 Hooks
│   └── utils/            # 工具函数
├── public/                # 静态资源
│   ├── demo.glb          # 示例 3D 模型
│   └── generated/        # 用户生成的资源
└── docs/                  # 文档
```

## 开发指南

### 代码规范

```bash
# 代码检查
npm run lint

# 代码格式化
npm run format

# TypeScript 类型检查
npm run type-check
```

### 样式系统

本项目使用自定义设计系统（深色 3D 工具主题）：

- **颜色变量**: `--surface-base`, `--surface-1`, `--text-strong` 等
- **通用样式类**: `.glass-panel`, `.btn-primary`, `.fade-in-up` 等
- **详细文档**: [docs/design-tokens.md](docs/design-tokens.md)

### API 调用

使用统一的 API 客户端：

```typescript
import { apiClient } from '@/lib/api/client';

// GET 请求
const response = await apiClient.get('/api/models');

// POST 请求
const response = await apiClient.post('/api/generation-requests', {
  prompt: '生成一个机器人',
});
```

### 3D 模型渲染

使用 Three.js React 组件：

```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

<Canvas camera={{ position: [0, 0, 5] }}>
  <ambientLight intensity={0.5} />
  <Environment preset="sunset" />
  <OrbitControls />
</Canvas>
```

## 相关文档

| 文档 | 说明 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | Claude Code 开发指南 |
| [docs/API_MIGRATION.md](docs/API_MIGRATION.md) | 前后端分离迁移文档 |
| [docs/design-tokens.md](docs/design-tokens.md) | 设计系统令牌 |
| [docs/ui-optimization-suggestions.md](docs/ui-optimization-suggestions.md) | UI 优化建议 |

## 常见问题

### 1. API 请求失败（Network Error）

确保后端服务已启动：
```bash
cd ../lumi-server
npm run dev
```

### 2. CORS 错误

前端使用 `/api/proxy/*` 路由处理跨域请求，无需额外配置。

### 3. 3D 模型加载失败

使用模型代理：
```typescript
const proxyUrl = `/api/proxy/model?url=${encodeURIComponent(modelUrl)}`;
```

## 开发团队

- **前端**: lumi-web-next（本项目）
- **后端**: [lumi-server](../lumi-server)

## 许可证

私有项目
