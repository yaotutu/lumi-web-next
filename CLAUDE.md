# CLAUDE.md

Lumi Web Next - AI 3D 模型生成平台前端项目开发指南

## 项目概述

AI 3D 模型生成平台前端：用户输入文本 → 生成 4 张图片 → 选择图片 → 生成 3D 模型

**技术栈核心**：
- Next.js 15.5.4 (App Router + Turbopack) + React 19.1.0 + TypeScript 5
- Three.js 0.180.0 + @react-three/fiber 9.3.0 + @react-three/drei 10.7.6
- Zustand (状态管理，无 Context API)
- TailwindCSS + 自定义设计系统

**后端项目**：lumi-server（独立的 Fastify + Drizzle ORM 后端）

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
| **[TOAST_USAGE.md](docs/TOAST_USAGE.md)** | Toast 通知系统使用指南 |
| **[API_ERROR_HANDLING.md](docs/API_ERROR_HANDLING.md)** | API 错误处理完整指南 |

**💡 提示**：后端架构和 API 实现细节请查看 `lumi-server` 项目文档。

---

## 项目结构

```
app/
├── page.tsx              # 首页（Hero + 模型画廊）
├── workspace/            # 工作台（图片生成 + 3D 模型生成）
├── history/              # 历史记录
├── login/                # 邮箱验证码登录
├── profile/              # 用户资料（创作历史、收藏）
├── my-models/            # 我的模型
├── printers/             # 3D 打印服务
├── api-docs/             # API 文档
├── api/                  # API 路由（代理服务）
│   └── proxy/            # CORS 代理（图片/模型）
└── globals.css           # 全局样式

components/
├── layout/               # 布局组件（Navigation、LoginModal）
├── ui/                   # 通用 UI 组件（Toast、Tooltip 等）
└── workspace/            # 工作台专用组件

lib/
├── api-client.ts         # ✅ 统一 API 客户端（强制使用）
├── stores/               # Zustand 状态管理（无 Context API）
│   ├── auth-store.ts     # 认证状态
│   ├── login-modal-store.ts  # 登录弹窗状态
│   └── token-store.ts    # Token 管理
├── hooks/                # 自定义 React Hooks
├── utils/                # 工具函数
│   └── task-adapter-client.ts  # 后端数据适配器
└── config/               # 配置文件

public/
└── demo.glb              # 示例 3D 模型
```

## 页面结构

- **`/`** - 首页（Hero + 模型画廊）
- **`/workspace`** - 工作台（图片生成 + 3D 模型生成）
- **`/history`** - 历史记录（已废弃，移至 profile）
- **`/login`** - 邮箱验证码登录
- **`/profile`** - 用户资料（创作历史、收藏）
- **`/my-models`** - 我的模型
- **`/printers`** - 3D 打印服务
- **`/api-docs`** - API 文档

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

**🔥 核心规则：全局统一使用 `apiRequest` 系列函数，禁止使用原生 `fetch` 或其他网络请求方式。**

**🚀 推荐使用高级 API**（`apiRequest` 系列）：

```typescript
import { apiRequestGet, apiRequestPost, apiRequestPatch, ApiError } from '@/lib/api-client';
import type { Task } from '@/types';

// ✅ GET 请求（推荐）
const result = await apiRequestGet<Task>('/api/tasks/123');

if (result.success) {
  // 成功：直接使用 data
  console.log(result.data.prompt);
  setTask(result.data);
} else {
  // 失败：使用 error
  console.error(result.error.message);

  // 判断特定错误
  if (result.error.hasStatus(404)) {
    alert('任务不存在');
  } else if (result.error.hasCode('INSUFFICIENT_CREDITS')) {
    alert('积分不足');
  } else if (result.error.isServerError()) {
    alert('服务器错误，请稍后重试');
  }
}

// ✅ POST 请求（推荐）
const result = await apiRequestPost<Task>('/api/tasks', {
  prompt: '一只可爱的猫咪',
  imageCount: 4,
});

// ✅ PATCH 请求（推荐）
const result = await apiRequestPatch(`/api/tasks/${taskId}`, {
  selectedImageIndex: 2,
});
```

**🎯 API 架构**：

本项目采用 **统一的 API 架构**，只对外暴露 6 个高级 API 函数：

| 函数 | 用途 |
|------|------|
| `apiRequest<T>(url, options)` | 通用请求（自定义 method） |
| `apiRequestGet<T>(url, options)` | GET 请求 |
| `apiRequestPost<T>(url, body, options)` | POST 请求 |
| `apiRequestPatch<T>(url, body, options)` | PATCH 请求 |
| `apiRequestPut<T>(url, body, options)` | PUT 请求 |
| `apiRequestDelete<T>(url, options)` | DELETE 请求 |

**所有 API 函数**：
- ✅ 返回统一格式：`{ success, data, error }`
- ✅ 自动处理错误，无需 try-catch
- ✅ 自动显示 Toast（可配置）
- ✅ 类型安全（支持泛型）
- ✅ 自动解析 JSON
- ✅ 自动添加 Bearer Token
- ✅ 自动处理 401（弹出登录弹窗 + 重试）
- ✅ 自动转换相对路径 URL 为完整 URL
- ✅ 支持 304 Not Modified（轮询优化）

**📚 完整文档**：

| 状态码 | 含义 | 处理方式 |
|--------|------|---------|
| 200 | 成功（GET/PATCH/DELETE） | `result.success = true` |
| 201 | 资源已创建（POST） | `result.success = true` |
| 304 | 未修改（轮询优化） | 自动返回，不抛错 |
| 400 | 请求参数错误 | `result.success = false` |
| 401 | 未认证 | 自动弹出登录弹窗 + 重试 |
| 403 | 无权限 | `result.success = false` |
| 404 | 资源不存在 | `result.success = false` |
| 500 | 服务器错误 | `result.success = false` |

**后端响应格式**（JSend 规范）：

```typescript
// 成功响应（HTTP 200/201）
{
  status: "success",
  data: { id: "123", prompt: "猫" }
}

// 客户端错误（HTTP 400/404）
{
  status: "fail",
  data: { message: "任务不存在", code: "NOT_FOUND" }
}

// 服务端错误（HTTP 500）
{
  status: "error",
  message: "内部错误",
  code: "INTERNAL_ERROR"
}
```

**📚 详细文档**：
- [lib/API_CLIENT_GUIDE.md](lib/API_CLIENT_GUIDE.md) - 完整使用指南
- [lib/API_CLIENT_MIGRATION.md](lib/API_CLIENT_MIGRATION.md) - 从旧 API 迁移指南
- [docs/TOAST_USAGE.md](docs/TOAST_USAGE.md) - Toast 使用指南
- [docs/API_ERROR_HANDLING.md](docs/API_ERROR_HANDLING.md) - API 错误处理指南

### Toast 通知系统

全局 Toast 通知用于显示用户反馈,替代传统的 `alert()`:

```typescript
import { toast } from "@/lib/toast";

// 成功提示
toast.success("操作成功");

// 错误提示
toast.error("操作失败");

// 警告提示
toast.warning("请注意...");

// 信息提示
toast.info("功能开发中...");

// 自定义显示时长(毫秒)
toast.success("保存成功", 5000);
```

**与 API 集成**:

```typescript
import { apiRequestPost } from "@/lib/api-client";

// ✅ 自动显示错误 Toast(默认启用)
const result = await apiRequestPost("/api/tasks", data);

// ✅ 显示成功 Toast
const result = await apiRequestPost("/api/tasks", data, {
  toastType: "success",
  toastContext: "创建任务",
});

// ✅ 禁用自动 Toast
const result = await apiRequestPost("/api/tasks", data, {
  autoToast: false,
});
```

详见 [Toast 使用指南](docs/TOAST_USAGE.md)

### 状态管理

**✅ 使用 Zustand（无 Context API）**

本项目完全使用 Zustand 进行状态管理，不使用 React Context API：

```typescript
// stores/auth-store.ts（认证状态）
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuth: (user) => set({ user, isAuthenticated: true }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);
```

**现有 Zustand Stores**：
- `auth-store.ts` - 认证状态
- `login-modal-store.ts` - 登录弹窗状态
- `token-store.ts` - Token 管理

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

// 客户端状态管理（Zustand）
import { useAuthStore } from '@/stores/auth-store';
const { user, isAuthenticated } = useAuthStore();
```

**特性**：
- ✅ 无密码登录，验证码有效期 5 分钟
- ✅ 开发环境验证码固定为 `0000`
- ✅ Cookie 会话，有效期 7 天
- ✅ 自动 401 处理（弹出登录弹窗）
- ✅ Zustand 持久化（刷新页面不丢失登录状态）
- ✅ 登录弹窗组件（全局单例）

## 数据适配器

**后端数据格式转换**（`lib/utils/task-adapter-client.ts`）：

由于后端采用 Worker 架构，需要使用数据适配器转换数据格式：

```typescript
import { adaptTaskResponse, adaptTasksResponse } from '@/lib/utils/task-adapter-client';

// 单个任务适配
const rawData = { data: result.data, status: "success" };
const data = adaptTaskResponse(rawData);
const task = data.data; // TaskWithDetails

// 任务列表适配
const rawData = { data: result.data, status: "success" };
const data = adaptTasksResponse(rawData);
const tasks = data.data; // TaskWithDetails[]
```

**适配器作用**：
- 转换后端 `GenerationRequest` → 前端 `TaskWithDetails`
- 添加 `url` 兼容字段（imageUrl → url）
- 推导模型状态（generationStatus、progress）
- 统一 status 和 phase 字段



## 重要提示

1. **🔥 强制规则：全局统一使用 `apiRequest` 系列函数**
   - ✅ 正确：`apiRequestGet<Task>('/api/tasks/123')`
   - ❌ 错误：`fetch('/api/tasks/123')`（禁止使用原生 fetch）

2. **使用泛型提供类型提示**
   - ✅ 推荐：`apiRequestGet<Task>('/api/tasks/123')`
   - ❌ 不推荐：`apiRequestGet('/api/tasks/123')`

3. **后端数据必须经过适配器**
   - ✅ 正确：`adaptTaskResponse(rawData)`
   - ❌ 错误：直接使用 `result.data`

4. **使用代理服务访问外部资源**，避免 CORS 问题
   - 图片代理：`/api/proxy/image?url=...`
   - 模型代理：`/api/proxy/model?url=...`

5. **优先使用全局样式类**，保持设计系统一致性
   - `.glass-panel`、`.btn-primary`、`.btn-secondary`

6. **状态管理使用 Zustand**，不使用 Context API
   - ✅ 正确：`useAuthStore`（Zustand）
   - ❌ 错误：`createContext()`（Context API）

7. **代码注释必须使用中文**，解释代码作用和目的

8. **未经允许，不允许提交代码到仓库**


<!-- 以下规则为用户手动填写，任何时候都不应该被更改 -->
# 最重要的规则，优先级最高的规则
- 优先使用函数式编程
- 代码注释需详尽，尤其是复杂逻辑部分
- 每一行代码都要有详细的中文注释说明
- 避免使用+=，-=等复合赋值运算符，可读性放在首位
- 前后端交互遵循jsend标准
- 遇到解决不了的问题，应该去查阅官方文档或者去网上搜索解决方案