# API 迁移说明文档

## 📋 概述

本文档说明 Lumi Web Next 项目的 API 架构迁移情况。所有后端 API 已从 Next.js API Routes 迁移到独立的 **Lumi Server** 后端项目。

**迁移日期**: 2025-12-12
**迁移状态**: ✅ 已完成
**影响范围**: 所有 API 端点

---

## 🏗️ 架构变更

### 迁移前：一体化架构
```
Next.js 项目
├── app/                    # 前端页面
├── app/api/                # 后端 API Routes
├── middleware.ts           # 认证中间件
└── lib/                    # 工具函数和配置
```

### 迁移后：前后端分离架构
```
Lumi Web Next (前端)        Lumi Server (后端)
├── app/                    ├── src/
│   ├── home/               │   ├── routes/        # API 路由
│   ├── workspace/          │   ├── middleware/    # 认证中间件
│   └── gallery/            │   ├── services/      # 业务逻辑
└── lib/                    │   └── repositories/  # 数据访问
    └── api/                └── src/config/
```

---

## 📦 迁移详情

### 已删除的 Next.js 文件

#### 1. API Routes（23个文件）
- **认证相关**（4个）
  - `/app/api/auth/logout/route.ts`
  - `/app/api/auth/send-code/route.ts`
  - `/app/api/auth/verify-code/route.ts`
  - `/app/api/auth/me/route.ts`

- **任务相关**（5个）
  - `/app/api/tasks/route.ts`
  - `/app/api/tasks/[id]/route.ts`
  - `/app/api/tasks/[id]/print/route.ts`
  - `/app/api/tasks/[id]/print-status/route.ts`
  - `/app/api/tasks/[id]/events/route.ts`

- **画廊相关**（5个）
  - `/app/api/gallery/models/route.ts`
  - `/app/api/gallery/models/[id]/route.ts`
  - `/app/api/gallery/models/batch-interactions/route.ts`
  - `/app/api/gallery/models/[id]/interactions/route.ts`
  - `/app/api/gallery/models/[id]/download/route.ts`

- **管理和系统相关**（4个）
  - `/app/api/admin/queues/[name]/route.ts`
  - `/app/api/admin/queues/[name]/pause/route.ts`
  - `/app/api/openapi/route.ts`
  - `/app/api/workers/status/route.ts`

- **代理相关**（2个）
  - `/app/api/proxy/image/route.ts`
  - `/app/api/proxy/model/route.ts`

- **测试相关**（3个）
  - `/app/api/test/models/generate/route.ts`
  - `/app/api/test/requests/route.ts`
  - `/app/api/test/requests/[id]/route.ts`

#### 2. 认证中间件
- `/middleware.ts` - Next.js 认证拦截器

### Lumi Server 对应实现

所有功能已在 Lumi Server 中完整实现：

| 功能模块 | Lumi Server 实现 | 验证状态 |
|---------|------------------|---------|
| **认证中间件** | `src/middleware/auth.middleware.ts` | ✅ 逻辑一致 |
| **API 路由配置** | `src/config/api-routes.ts` | ✅ 规则一致 |
| **认证路由** | `src/routes/auth.route.ts` | ✅ 功能一致 |
| **任务路由** | `src/routes/tasks.route.ts` | ✅ 功能一致 |
| **画廊路由** | `src/routes/gallery-models.route.ts` | ✅ 功能一致 |
| **交互路由** | `src/routes/interactions.route.ts` | ✅ 功能一致 |
| **代理路由** | `src/routes/proxy.route.ts` | ✅ 功能增强 |
| **Worker 路由** | `src/routes/workers.route.ts` | ✅ 功能一致 |

**新增功能**（Lumi Server 增强）：
- ✨ 模型代理支持 ZIP 自动解压
- ✨ MTL 文件纹理路径自动替换为代理 URL
- ✨ 结构化日志（Pino）
- ✨ 更好的错误处理和类型安全

---

## ⚙️ 环境配置

### 前端配置（lumi-web-next）

#### 1. 环境变量

在 `.env.local` 文件中配置后端 API 地址：

```bash
# 后端 API 基础 URL
NEXT_PUBLIC_API_BASE_URL=http://192.168.88.100:3000

# 其他环境变量...
```

**不同环境的配置**：

| 环境 | API_BASE_URL | 说明 |
|------|--------------|------|
| **本地开发** | `http://localhost:3000` | 本机开发环境 |
| **局域网开发** | `http://192.168.88.100:3000` | 局域网内其他设备访问 |
| **生产环境** | `https://api.yourdomain.com` | 生产环境 API 地址 |

#### 2. API 客户端配置

前端使用统一的 API 客户端 (`lib/api/client.ts`)，通过环境变量动态路由：

```typescript
// lib/config/api.ts
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
};

// lib/api/client.ts
import { API_CONFIG } from '@/lib/config/api';

export const apiClient = {
  auth: {
    sendCode: (email: string) =>
      apiPost('/api/auth/send-code', { email }),
    // ... 其他认证方法
  },
  // ... 其他模块
};
```

#### 3. Next.js 配置

`next.config.ts` 中保留代理配置（用于 Next.js Image 组件）：

```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Lumi Server 代理服务（前后端分离架构）
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/proxy/**",
      },
      {
        protocol: "http",
        hostname: "192.168.88.100",
        port: "3000",
        pathname: "/api/proxy/**",
      },
      // ... 其他域名
    ],
  },
};
```

### 后端配置（lumi-server）

Lumi Server 需要配置 CORS 允许前端域名：

```bash
# src/config/index.ts 或 .env
FRONTEND_URLS=http://localhost:4100,http://192.168.88.100:4100
COOKIE_DOMAIN=192.168.88.100
PORT=3000
```

---

## 🚀 启动和部署

### 开发环境

#### 1. 启动后端（Lumi Server）

```bash
cd /path/to/lumi-server

# 配置环境变量
export FRONTEND_URLS="http://localhost:4100,http://192.168.88.100:4100"
export COOKIE_DOMAIN="192.168.88.100"
export PORT=3000

# 启动服务
npm run dev
```

#### 2. 启动前端（Lumi Web Next）

```bash
cd /path/to/lumi-web-next

# 确保 .env.local 已配置 NEXT_PUBLIC_API_BASE_URL
echo "NEXT_PUBLIC_API_BASE_URL=http://192.168.88.100:3000" > .env.local

# 启动服务
npm run dev
```

### 生产环境

#### 1. 构建前端

```bash
cd /path/to/lumi-web-next

# 设置生产环境 API 地址
export NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com

# 构建
npm run build
```

#### 2. 部署后端

```bash
cd /path/to/lumi-server

# 构建
npm run build

# 启动
npm start
```

---

## 🔐 认证机制

### Cookie 认证流程

1. **用户登录**：
   - 前端调用 `/api/auth/verify-code`
   - 后端验证成功后设置 `auth-session` Cookie
   - Cookie 配置：`httpOnly=true`, `secure=true` (生产环境), `sameSite=lax`

2. **API 请求认证**：
   - 前端发起请求时自动携带 Cookie (`credentials: 'include'`)
   - 后端认证中间件验证 Cookie
   - 验证成功后，通过请求头传递用户信息：
     - `x-user-id`: 用户 ID
     - `x-user-email`: 用户邮箱

3. **路由保护规则**：
   - **受保护的路由**：`/api/tasks/*`, `/api/admin/*`, 部分画廊和交互 API
   - **公开路由**：`/api/auth/*`, `/api/proxy/*`, `/api/gallery/models (GET)`
   - 详见：`lumi-server/src/config/api-routes.ts`

---

## 🧪 测试验证

### 测试清单

迁移后建议测试以下功能：

- [ ] **认证流程**
  - [ ] 发送验证码
  - [ ] 登录验证
  - [ ] 登出
  - [ ] 受保护 API 访问（需登录）
  - [ ] 公开 API 访问（无需登录）

- [ ] **任务管理**
  - [ ] 创建任务
  - [ ] 查看任务列表
  - [ ] 查看任务详情
  - [ ] 任务状态更新（SSE 实时推送）

- [ ] **画廊功能**
  - [ ] 浏览公开模型
  - [ ] 查看模型详情
  - [ ] 3D 模型预览（OBJ、GLB 格式）
  - [ ] 点赞/收藏模型（需登录）
  - [ ] 下载模型（需登录）

- [ ] **代理功能**
  - [ ] 图片代理（`/api/proxy/image`）
  - [ ] 模型代理（`/api/proxy/model`）
  - [ ] MTL 文件纹理路径替换

### 测试脚本

```bash
# 测试未登录访问受保护 API（应返回 401）
curl -X GET http://localhost:3000/api/tasks

# 测试图片代理
curl "http://localhost:3000/api/proxy/image?url=https://xxx.aliyuncs.com/test.png"

# 测试模型代理
curl "http://localhost:3000/api/proxy/model?url=https://xxx.myqcloud.com/model.obj"
```

---

## 🐛 常见问题

### 问题 1: 401 Unauthorized 错误

**症状**：所有 API 请求返回 401

**原因**：Cookie 未正确配置或 CORS 配置错误

**解决方案**：
1. 检查前端 API 客户端是否设置 `credentials: 'include'`
2. 检查后端 CORS 配置是否允许前端域名
3. 检查 Cookie `sameSite` 和 `domain` 配置

### 问题 2: 图片或模型无法加载

**症状**：3D 模型或图片显示加载失败

**原因**：代理配置错误或 CORS 问题

**解决方案**：
1. 检查 `next.config.ts` 中的 `remotePatterns` 配置
2. 确认 Lumi Server 的代理路由正常运行
3. 检查控制台是否有 CORS 错误

### 问题 3: SSE 连接失败

**症状**：任务状态不实时更新

**原因**：SSE 端点配置错误

**解决方案**：
1. 检查 `/api/tasks/[id]/events` 端点是否正常
2. 确认 Lumi Server 实现了 SSE 响应
3. 检查浏览器是否支持 EventSource

---

## 📝 保留文件说明

以下文件保留在前端项目中，供开发参考：

| 文件 | 用途 | 说明 |
|------|------|------|
| `lib/config/api-routes.ts` | API 路由保护规则 | 供后端开发参考，前端已不使用 |
| `lib/utils/request-auth.ts` | 请求认证工具函数 | 如前端组件仍在使用则保留 |

---

## 🔄 回滚方案

如需回滚到 Next.js API Routes，可从 Git 历史恢复：

```bash
# 查看删除记录
git log --all --full-history --oneline -- app/api

# 恢复到迁移前的提交
git checkout <commit-hash> -- app/api middleware.ts

# 恢复 next.config.ts 配置
git checkout <commit-hash> -- next.config.ts
```

---

## 📚 相关资源

- **Lumi Server 项目**: `/Users/yaotutu/Desktop/code/lumi-server`
- **Lumi Server README**: `lumi-server/README.md`
- **Lumi Server CLAUDE.md**: `lumi-server/CLAUDE.md`
- **Next.js API Routes 文档**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Fastify 文档**: https://fastify.dev/

---

## 👥 维护者

如有问题，请联系项目维护者或查看 Lumi Server 项目文档。

**最后更新**: 2025-12-12
