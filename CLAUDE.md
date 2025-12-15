# CLAUDE.md

Lumi Web Next - AI 3D 模型生成平台前端项目开发指南

## 项目概述

AI 3D 模型生成平台前端：用户输入文本 → 生成 4 张图片 → 选择图片 → 生成 3D 模型

**技术栈核心**：
- Next.js 15.5.4 (App Router + Turbopack) + React 19 + TypeScript 5
- Three.js 0.180.0 + @react-three/fiber + @react-three/drei
- Zustand (状态管理)
- TailwindCSS + 自定义设计系统

**后端项目**：lumi-server（独立的 Fastify + Prisma 后端）

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（端口 4100）
npm run dev

# 代码检查和格式化
npm run lint                    # Biome 检查
npm run format                  # Biome 格式化

# 构建生产版本
npm run build
npm start
```

## 环境变量配置

```bash
# .env.local
# 后端 API 基础 URL
NEXT_PUBLIC_API_BASE_URL=http://192.168.88.100:3000

# 可选：Mock 模式用于前端独立开发
NEXT_PUBLIC_MOCK_MODE=false
```

## 📚 前端相关文档

| 文档 | 说明 |
|------|------|
| **[API_MIGRATION.md](docs/API_MIGRATION.md)** | 前后端分离迁移文档 |
| **[API_USAGE.md](docs/API_USAGE.md)** | API 快速上手指南 |
| **[design-tokens.md](docs/design-tokens.md)** | 设计令牌：颜色、圆角、阴影、排版等 |
| **[ui-optimization-suggestions.md](docs/ui-optimization-suggestions.md)** | UI 优化建议 |

**💡 提示**：后端架构和 API 实现细节请查看 `lumi-server` 项目文档。

---

## 项目结构

```
app/
├── (routes)/               # 页面路由
│   ├── page.tsx           # 首页（Hero + 模型画廊）
│   ├── workspace/         # 工作台（图片生成 + 3D 模型生成）
│   ├── history/           # 历史记录
│   ├── gallery/[id]/      # 模型详情页
│   └── login/             # 邮箱验证码登录
├── api/                   # API 路由（代理服务）
│   └── proxy/             # CORS 代理（图片/模型）
└── globals.css            # 全局样式

components/
├── layout/                # 布局组件（Navigation、Footer）
├── ui/                    # 通用 UI 组件
└── workspace/             # 工作台专用组件

lib/
├── api/                   # API 客户端封装
├── stores/                # Zustand 状态管理
├── hooks/                 # 自定义 React Hooks
└── utils/                 # 工具函数

public/
├── demo.glb               # 示例 3D 模型
├── demo.3mf               # 示例 3MF 文件
└── generated/             # 用户生成的图片和模型
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

### API 调用规范

```typescript
import { apiClient } from '@/lib/api/client';

// GET 请求
const response = await apiClient.get('/api/models');
if (response.status === 'success') {
  const models = response.data.items;
}

// POST 请求
const response = await apiClient.post('/api/generation-requests', {
  prompt: '生成一个机器人',
  imageCount: 4,
});

// 错误处理
if (response.status === 'error') {
  console.error(response.message);
}
```

**响应格式**（JSend 规范）：
```typescript
// 成功响应
{
  status: 'success',
  data: { items: [...], total: 100 }
}

// 错误响应
{
  status: 'error',
  message: '错误信息'
}
```

### 状态管理

使用 Zustand 管理全局状态：

```typescript
// stores/workspace-form-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceFormStore {
  prompt: string;
  setPrompt: (prompt: string) => void;
}

export const useWorkspaceFormStore = create<WorkspaceFormStore>()(
  persist(
    (set) => ({
      prompt: '',
      setPrompt: (prompt) => set({ prompt }),
    }),
    { name: 'workspace-form' }
  )
);
```

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

详见 [design-tokens.md](docs/design-tokens.md)

## 常用操作

### 代理服务（解决 CORS）

由于外部资源存在跨域限制，使用 Next.js API 路由作为代理：

```typescript
// 图片代理
const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
<img src={proxyUrl} alt="Image" />

// 模型代理
const modelProxyUrl = `/api/proxy/model?url=${encodeURIComponent(modelUrl)}`;
loader.load(modelProxyUrl, (gltf) => scene.add(gltf.scene));
```

### Mock 模式

开发时启用 `NEXT_PUBLIC_MOCK_MODE=true`，前端可以使用模拟数据进行独立开发，无需启动后端。

## Three.js 3D 渲染

使用 `@react-three/fiber` 和 `@react-three/drei` 进行 3D 模型渲染：

```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

<Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
  <ambientLight intensity={0.5} />
  <directionalLight position={[10, 10, 5]} intensity={1} />
  <Environment preset="sunset" />
  <OrbitControls enableZoom={true} />
  {/* 3D 模型加载 */}
</Canvas>
```

## 认证系统

**邮箱验证码登录**（Cookie 会话）：

```typescript
// API 接口
POST /api/auth/send-code      // 发送验证码
POST /api/auth/verify-code    // 验证验证码（登录/注册）
GET  /api/auth/me             // 获取当前用户
POST /api/auth/logout         // 登出

// 客户端使用
import { getCurrentUser, logout } from '@/lib/auth-client';
const user = await getCurrentUser();
await logout();
```

**特性**：
- ✅ 无密码登录，验证码有效期 5 分钟
- ✅ 开发环境验证码固定为 `0000`
- ✅ Cookie 会话，有效期 7 天
- ✅ 自动 401 处理（弹出登录弹窗）
- ✅ 表单持久化（登录过程不丢失数据）

## 重要提示

1. **所有 API 请求使用 `apiClient`**，自动处理 401 和错误
2. **使用代理服务访问外部资源**，避免 CORS 问题
3. **优先使用全局样式类**，保持设计系统一致性
4. **代码注释必须使用中文**，解释代码作用和目的
5. **优先使用函数式编程**，统一使用 ESM 语法
6. **状态持久化使用 Zustand persist 中间件**
7. **未经允许，不允许提交代码到仓库**
