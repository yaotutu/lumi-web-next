# 认证与鉴权架构

## 概述

本项目采用**纯 Cookie 认证 + 统一 Middleware 鉴权**的架构，实现了：
- ✅ 页面路由全部公开访问（无拦截）
- ✅ API 路由统一在 Middleware 层拦截
- ✅ 前端 401 自动触发登录弹窗
- ✅ 表单数据持久化，登录后自动重试

---

## 架构设计

### 核心原则

1. **Cookie 只解析一次**：Middleware 解析 Cookie 后，通过请求头传递给 API
2. **统一路由配置**：所有路由权限规则集中在 `lib/config/api-routes.ts`
3. **方法级保护**：同一路径的不同 HTTP 方法可以有不同的权限规则
4. **用户体验优先**：所有页面公开访问，只在需要时弹窗登录

### 信息流

```
用户请求 → Middleware 验证 Cookie
                ↓
          isProtectedRoute(pathname, method)?
                ↓
          是：验证身份 → 通过请求头传递 userId/email → API 直接读取
          否：直接放行
```

---

## 后端实现

### 1. 统一路由配置 (`lib/config/api-routes.ts`)

使用简单的配置对象管理所有路由权限：

```typescript
export const API_ROUTES = {
  // 完全受保护（所有方法都需要登录）
  protected: [
    "/api/tasks",
    "/api/admin",
  ],

  // 方法级保护（特定方法需要登录）
  protectedByMethod: [
    {
      path: "/api/gallery/models/:id/interactions",  // 路径模板
      methods: ["POST", "PUT", "DELETE"],            // 只保护这些方法
    },
    {
      path: "/api/gallery/models/:id/download",
      methods: ["GET", "POST"],
    },
  ],

  // 公开 API（不需要登录）
  public: [
    "/api/auth/",      // 前缀匹配（以 / 结尾）
    "/api/proxy/",
    "/api/gallery/",   // GET 方法公开
    "/api/workers/status",
  ],
};

// 路径模板匹配函数
function matchPathTemplate(pathname: string, template: string): boolean {
  const pathSegments = pathname.split("/").filter(Boolean);
  const templateSegments = template.split("/").filter(Boolean);

  if (pathSegments.length !== templateSegments.length) return false;

  for (let i = 0; i < templateSegments.length; i++) {
    if (templateSegments[i].startsWith(":")) continue;  // :id 匹配任意值
    if (templateSegments[i] !== pathSegments[i]) return false;
  }

  return true;
}

// 判断路由是否受保护
export function isProtectedRoute(pathname: string, method: string): boolean {
  // 1. 优先检查公开 API（白名单优先）
  for (const pattern of API_ROUTES.public) {
    if (matchesPattern(pathname, pattern)) {
      // 检查是否有特定方法需要保护
      for (const rule of API_ROUTES.protectedByMethod) {
        if (matchPathTemplate(pathname, rule.path) && rule.methods.includes(method)) {
          return true;  // 该方法需要保护
        }
      }
      return false;  // 公开访问
    }
  }

  // 2. 检查完全受保护的 API
  for (const pattern of API_ROUTES.protected) {
    if (matchesPattern(pathname, pattern)) {
      return true;
    }
  }

  return false;  // 默认不保护
}
```

**路径模板语法**：
- `/api/models/:id` - `:id` 匹配任意值（代替复杂正则）
- `/api/auth/` - 以 `/` 结尾表示前缀匹配
- 可读性高，易于维护

---

### 2. 请求认证工具 (`lib/utils/request-auth.ts`)

提供便捷的函数从请求头获取用户信息：

```typescript
import type { NextRequest } from "next/server";

/**
 * 从请求头获取用户 ID
 * Middleware 已验证身份并设置了 x-user-id
 */
export function getUserIdFromRequest(request: NextRequest): string {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    throw new Error(
      "x-user-id header not found. This API must be protected by middleware.",
    );
  }

  return userId;
}

/**
 * 从请求头获取用户邮箱
 */
export function getUserEmailFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-email");
}

/**
 * 从请求头获取完整用户信息
 */
export function getUserFromRequest(request: NextRequest): {
  userId: string;
  email: string | null;
} {
  return {
    userId: getUserIdFromRequest(request),
    email: getUserEmailFromRequest(request),
  };
}
```

---

### 3. Middleware 实现 (`middleware.ts`)

简化的 Middleware，使用统一配置：

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProtectedRoute } from "@/lib/config/api-routes";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 只拦截 API 路由
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 使用统一配置判断
  if (!isProtectedRoute(pathname, method)) {
    return NextResponse.next();
  }

  // 验证身份
  const authResult = checkAuth(request);

  if (!authResult.isAuthenticated) {
    return NextResponse.json(
      {
        status: "fail",
        data: {
          message: "请先登录",
          code: "UNAUTHORIZED",
        },
      },
      { status: 401 },
    );
  }

  // 通过请求头传递用户信息
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", authResult.userId!);
  requestHeaders.set("x-user-email", authResult.email!);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
```

---

### 4. API 路由使用示例

**受保护的 API**（所有方法）：

```typescript
// app/api/tasks/route.ts
import { getUserIdFromRequest } from "@/lib/utils/request-auth";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // 直接从请求头获取，无需验证（Middleware 已验证）
  const userId = getUserIdFromRequest(request);

  const tasks = await TaskService.getUserTasks(userId);
  return success({ items: tasks, total: tasks.length });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const userId = getUserIdFromRequest(request);
  const body = await request.json();

  const task = await TaskService.createTask(userId, body);
  return success(task);
});
```

**方法级保护的 API**：

```typescript
// app/api/gallery/models/[id]/interactions/route.ts

// POST - 受保护（需要登录）
export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: modelId } = await params;
    const userId = getUserIdFromRequest(request);  // Middleware 已验证

    const body = await request.json();
    const { type } = interactionSchema.parse(body);

    const result = await InteractionService.toggleInteraction({
      userId,
      modelId,
      type,
    });

    return success({
      isInteracted: result.isInteracted,
      likeCount: result.model.likeCount,
    });
  },
);

// GET - 公开（无需登录）
export const GET = withErrorHandler(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: modelId } = await params;

    // 内部检查认证状态（不依赖 Middleware）
    const authResult = await checkAuthStatus();

    if (!authResult.isAuthenticated || !authResult.userSession) {
      return success({
        isAuthenticated: false,
        interactions: [],
      });
    }

    const interactions = await InteractionService.getUserModelInteractions(
      authResult.userSession.userId,
      modelId,
    );

    return success({
      isAuthenticated: true,
      interactions,
      isLiked: interactions.includes(InteractionType.LIKE),
    });
  },
);
```

---

## 前端实现

### 1. 全局登录弹窗 (`components/auth/LoginModal.tsx`)

统一的登录弹窗组件，支持邮箱验证码登录。

**特性**：
- ✅ 全局单例，通过 Zustand 状态管理
- ✅ 支持登录成功回调
- ✅ 支持上下文标识（workspace/history 等）
- ✅ 自动关闭和重置状态

---

### 2. 登录弹窗状态管理 (`stores/login-modal-store.ts`)

```typescript
import { create } from "zustand";

interface LoginModalStore {
  isOpen: boolean;
  context: string | null;
  onSuccess: (() => void) | null;

  open: (context: string, onSuccess?: () => void) => void;
  close: () => void;
}

export const useLoginModal = create<LoginModalStore>((set) => ({
  isOpen: false,
  context: null,
  onSuccess: null,

  open: (context, onSuccess) => set({
    isOpen: true,
    context,
    onSuccess: onSuccess || null,
  }),

  close: () => set({
    isOpen: false,
    context: null,
    onSuccess: null,
  }),
}));
```

**使用示例**：

```typescript
import { useLoginModal } from "@/stores/login-modal-store";

function SomeComponent() {
  const { open } = useLoginModal();

  const handleProtectedAction = () => {
    open("workspace", () => {
      console.log("登录成功，继续操作");
    });
  };

  return <button onClick={handleProtectedAction}>需要登录的操作</button>;
}
```

---

### 3. API 客户端 (`lib/api-client.ts`)

自动处理 401 响应并触发登录弹窗：

```typescript
import { useLoginModal } from "@/stores/login-modal-store";

interface ApiClientOptions extends RequestInit {
  context?: string;  // 登录弹窗上下文
}

/**
 * 封装的 fetch 客户端，自动处理 401
 */
export async function apiClient<T = any>(
  url: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { context = "default", ...fetchOptions } = options;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  const data = await response.json();

  // 检查 401 响应
  if (response.status === 401) {
    return new Promise((resolve, reject) => {
      // 打开登录弹窗
      const { open } = useLoginModal.getState();

      open(context, async () => {
        // 登录成功后，自动重试请求
        try {
          const retryResponse = await fetch(url, fetchOptions);
          const retryData = await retryResponse.json();
          resolve(retryData);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  return data;
}
```

**使用示例**：

```typescript
// 自动处理 401
const response = await apiClient("/api/tasks", {
  method: "GET",
  context: "workspace",
});

if (isSuccess(response)) {
  console.log(response.data.items);
}
```

---

### 4. 表单持久化 (`stores/workspace-form-store.ts`)

使用 Zustand + localStorage 持久化表单数据：

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceFormStore {
  prompt: string;
  selectedImageId: string | null;

  setPrompt: (prompt: string) => void;
  setSelectedImageId: (id: string | null) => void;
  reset: () => void;
}

export const useWorkspaceFormStore = create<WorkspaceFormStore>()(
  persist(
    (set) => ({
      prompt: "",
      selectedImageId: null,

      setPrompt: (prompt) => set({ prompt }),
      setSelectedImageId: (id) => set({ selectedImageId: id }),
      reset: () => set({ prompt: "", selectedImageId: null }),
    }),
    {
      name: "workspace-form-storage",  // localStorage key
    },
  ),
);
```

**使用示例**：

```typescript
function WorkspaceForm() {
  const { prompt, setPrompt } = useWorkspaceFormStore();

  return (
    <input
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      placeholder="输入提示词"
    />
  );
}
```

**特性**：
- ✅ 自动持久化到 localStorage
- ✅ 刷新页面不丢失
- ✅ 登录流程中保持数据
- ✅ 支持手动重置

---

## 完整工作流程

### 用户未登录访问受保护资源

```
1. 用户访问 /workspace → ✅ 正常显示（页面公开）
2. 用户填写表单 → ✅ 数据持久化到 localStorage
3. 用户点击"生成" → 前端调用 POST /api/tasks
4. Middleware 检测到未登录 → 返回 401
5. apiClient 拦截 401 → 打开登录弹窗
6. 用户完成登录 → Cookie 设置成功
7. 登录成功回调 → apiClient 自动重试请求
8. Middleware 验证通过 → API 正常执行
9. 前端收到响应 → 业务流程继续
```

### 方法级保护示例

```
GET /api/gallery/models/123/interactions
→ 公开访问，返回点赞数（不包含用户状态）

POST /api/gallery/models/123/interactions
→ Middleware 拦截，验证身份
→ 已登录：执行点赞操作
→ 未登录：返回 401 → 前端弹窗登录
```

---

## 架构优势

### 1. 性能优化
- ✅ Cookie 只解析一次（Middleware 层）
- ✅ API 直接读取请求头，无需重复解析
- ✅ 减少数据库查询（用户信息已在请求头）

### 2. 可维护性
- ✅ 路由权限集中管理（`api-routes.ts`）
- ✅ 路径模板代替正则，可读性高
- ✅ 单一职责：Middleware 验证，API 处理业务

### 3. 用户体验
- ✅ 所有页面公开访问，降低流失率
- ✅ 表单数据持久化，登录不丢失
- ✅ 自动重试机制，无需手动重新提交
- ✅ 统一登录弹窗，体验一致

### 4. 安全性
- ✅ HTTP-only Cookie，防止 XSS
- ✅ 统一拦截，不会遗漏
- ✅ 方法级保护，精细化控制

---

## 添加新的受保护 API

### 步骤 1: 更新路由配置

编辑 `lib/config/api-routes.ts`：

```typescript
export const API_ROUTES = {
  protected: [
    "/api/tasks",
    "/api/new-protected-api",  // 添加新路由
  ],
  // ...
};
```

### 步骤 2: 实现 API 路由

```typescript
// app/api/new-protected-api/route.ts
import { getUserIdFromRequest } from "@/lib/utils/request-auth";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const userId = getUserIdFromRequest(request);
  // 业务逻辑
  return success({ userId });
});
```

### 步骤 3: 前端调用

```typescript
const response = await apiClient("/api/new-protected-api", {
  method: "GET",
  context: "workspace",  // 登录弹窗上下文
});
```

**就这么简单！无需修改 Middleware 或其他地方。**

---

## 常见问题

### Q: 为什么不在每个 API 中验证身份？

A:
1. **性能**：Cookie 只解析一次，而不是每个 API 都解析
2. **一致性**：统一在 Middleware 验证，不会遗漏
3. **简洁**：API 代码更简洁，专注业务逻辑

### Q: 为什么用路径模板而不是正则？

A:
1. **可读性**：`/api/models/:id` 比 `/^\/api\/models\/[^/]+$/` 清晰
2. **维护性**：不需要理解复杂的正则语法
3. **足够用**：大部分路由都是简单的 `:id` 匹配

### Q: 如果需要角色权限怎么办？

A: 可以在 `API_ROUTES` 中添加 `roles` 字段：

```typescript
protectedByRole: [
  {
    path: "/api/admin",
    roles: ["admin"],
  },
],
```

然后在 Middleware 中检查用户角色。

### Q: 为什么前端也需要认证检查？

A: 前端认证检查是为了**用户体验**（显示/隐藏按钮），后端认证才是**真正的安全保障**。

---

## 测试

### 完整测试脚本

参考 `/tmp/final-test.sh`，包含：
- ✅ 公开 API 访问测试
- ✅ 受保护 API 拦截测试
- ✅ 登录流程测试
- ✅ Cookie 设置验证
- ✅ 登录后访问测试
- ✅ 方法级保护测试

运行测试：

```bash
chmod +x /tmp/final-test.sh
/tmp/final-test.sh
```

预期输出：全部测试通过 ✅

---

## 总结

本架构通过**统一配置 + Middleware 拦截 + 请求头传递**的方式，实现了：

1. ✅ **高性能**：Cookie 只解析一次
2. ✅ **易维护**：路由权限集中管理
3. ✅ **好体验**：页面公开 + 弹窗登录 + 表单持久化
4. ✅ **高安全**：统一拦截 + 方法级控制

核心文件：
- `lib/config/api-routes.ts` - 路由配置
- `lib/utils/request-auth.ts` - 认证工具
- `middleware.ts` - 统一拦截
- `components/auth/LoginModal.tsx` - 登录弹窗
- `lib/api-client.ts` - 401 自动处理
- `stores/workspace-form-store.ts` - 表单持久化
