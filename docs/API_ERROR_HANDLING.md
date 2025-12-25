# API 错误处理指南

统一的 API 错误处理架构,实现网络层与业务层的分离

## 概述

本项目的 API 错误处理采用分层架构:

1. **网络层**(apiClient): 自动处理所有 HTTP 错误,统一转换为 `ApiError`
2. **业务层**(页面/组件): 只处理成功数据和特定的业务逻辑
3. **展示层**(Toast): 自动显示用户友好的错误提示

**核心优势**:
- ✅ 统一的错误处理,避免重复代码
- ✅ 自动显示 Toast,提升用户体验
- ✅ 业务代码简洁,只关注成功逻辑
- ✅ 类型安全的错误判断

## 架构设计

### 三层错误处理架构

```
┌─────────────────────────────────────────────────────────────┐
│                        业务层代码                              │
│  (只处理成功数据和特定业务逻辑,不关心 HTTP 错误)                │
└──────────────────────┬──────────────────────────────────────┘
                       │ apiRequest()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      网络层 (apiClient)                       │
│  - 自动处理 401(弹出登录弹窗)                                  │
│  - 自动处理 4xx/5xx(转换为 ApiError)                          │
│  - 自动显示错误 Toast                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ fetch()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        后端 API                               │
│  (返回 JSend 格式响应)                                         │
└─────────────────────────────────────────────────────────────┘
```

### 错误处理流程

```
HTTP 401 → 自动弹出登录弹窗 → 登录成功 → 自动重试请求
HTTP 403 → 自动显示 Toast "Forbidden" → 返回 { success: false, error }
HTTP 404 → 自动显示 Toast "资源不存在" → 返回 { success: false, error }
HTTP 500 → 自动显示 Toast "服务器错误" → 返回 { success: false, error }
网络错误 → 自动显示 Toast "网络连接失败" → 返回 { success: false, error }
```

## ApiError 类

### ApiError 结构

```typescript
export class ApiError extends Error {
  public readonly status: number;      // HTTP 状态码
  public readonly code?: string;       // 错误代码(来自后端)
  public readonly data?: any;          // 原始响应数据

  constructor(status: number, message: string, code?: string, data?: any);

  // 判断方法
  isClientError(): boolean;            // 是否为客户端错误 (4xx)
  isServerError(): boolean;            // 是否为服务端错误 (5xx)
  hasStatus(status: number): boolean;  // 是否为特定状态码
  hasCode(code: string): boolean;      // 是否为特定错误代码
}
```

### 错误判断方法

```typescript
const error = result.error;

// 判断错误类型
error.isClientError();  // 400-499
error.isServerError();  // 500-599
error.hasStatus(404);   // 是否为 404
error.hasCode("NOT_FOUND");  // 是否为特定错误代码

// 访问错误信息
error.status;   // HTTP 状态码
error.message;  // 错误消息
error.code;     // 错误代码(可选)
error.data;     // 原始响应数据(可选)
```

## API 调用方式

### 方式 1: 高级 API(推荐)

**适用场景**: 大多数业务场景,自动处理错误和 Toast

```typescript
import { apiRequestGet, apiRequestPost, ApiError } from "@/lib/api-client";

// GET 请求
const result = await apiRequestGet<Task>("/api/tasks/123");

if (result.success) {
  // ✅ 成功,直接使用数据
  console.log(result.data.prompt);
} else {
  // ❌ 失败,已自动显示 Toast,可选处理特定错误
  if (result.error.hasStatus(404)) {
    // 特殊处理 404
  }
}

// POST 请求
const result = await apiRequestPost<Task>("/api/tasks", {
  prompt: "一只可爱的猫咪",
});

if (result.success) {
  console.log("任务创建成功:", result.data.id);
} else {
  if (result.error.hasCode("INSUFFICIENT_CREDITS")) {
    // 积分不足,特殊处理
  }
}
```

**优点**:
- ✅ 自动显示错误 Toast
- ✅ 自动解析 JSON
- ✅ 类型安全
- ✅ 业务代码简洁

### 方式 2: 高级 API + 自定义 Toast

**适用场景**: 需要自定义错误消息或成功提示

```typescript
import { apiRequestPost } from "@/lib/api-client";
import { toast } from "@/lib/toast";

// 禁用自动 Toast,手动处理
const result = await apiRequestPost("/api/tasks", data, {
  autoToast: false,
});

if (result.success) {
  toast.success("任务创建成功!");
} else {
  // 根据错误类型显示不同的提示
  if (result.error.hasCode("INSUFFICIENT_CREDITS")) {
    toast.error("积分不足,请充值");
  } else if (result.error.hasStatus(403)) {
    toast.error("权限不足");
  } else {
    toast.error("创建失败,请重试");
  }
}

// 添加 Toast 前缀
const result = await apiRequestPost("/api/tasks", data, {
  toastContext: "创建任务",
});
// 错误时显示: "创建任务: 请求失败 (HTTP 400)"
// 成功时显示(需要 toastType: "success"): "创建任务: 操作成功"
```

### 方式 3: 高级 API + 成功 Toast

**适用场景**: 需要在成功时也显示 Toast

```typescript
import { apiRequestPost } from "@/lib/api-client";

// 同时显示成功和错误 Toast
const result = await apiRequestPost("/api/users", {
  name: "张三",
}, {
  toastType: "success",  // 成功时显示 Toast
  toastContext: "保存用户",  // Toast 前缀
});

// 成功时显示: "保存用户: 操作成功"
// 失败时显示: "保存用户: 请求失败 (HTTP 400)"
```

### 方式 4: 底层 API(特殊情况)

**适用场景**: 需要访问原始 Response 对象

```typescript
import { apiGet, ApiError } from "@/lib/api-client";

try {
  const response = await apiGet("/api/tasks/123");

  // 可以访问响应头、状态码等
  console.log(response.status);
  console.log(response.headers.get("X-Custom-Header"));

  // 手动解析 JSON
  const json = await response.json();
  console.log(json.data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status, error.message);
  }
}
```

**⚠️ 注意**: 底层 API 需要 try-catch,不如高级 API 简洁。

## ApiClientOptions 配置

### 完整选项列表

```typescript
export interface ApiClientOptions extends RequestInit {
  // === 认证相关 ===
  context?: LoginModalContext;  // 登录弹窗上下文("general" | "workspace" | ...)

  // === 错误处理 ===
  disableRetry?: boolean;       // 禁用自动重试(默认 false)
  disableErrorHandling?: boolean;  // 禁用自动错误处理,不抛出 ApiError(默认 false)

  // === Toast 配置 ===
  autoToast?: boolean;          // 自动显示错误 Toast(默认 true)
  toastContext?: string;        // Toast 消息前缀
  toastType?: "success" | "error" | "warning" | "info";  // 成功时显示的 Toast 类型

  // === 标准 RequestInit 选项 ===
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit;
  signal?: AbortSignal;
  // ... 其他 fetch 选项
}
```

### 常用配置组合

#### 1. 默认配置(推荐)

```typescript
// 自动显示错误 Toast,不显示成功 Toast
const result = await apiRequestPost("/api/tasks", data);
```

#### 2. 显示成功 Toast

```typescript
// 同时显示成功和错误 Toast
const result = await apiRequestPost("/api/tasks", data, {
  toastType: "success",
  toastContext: "创建任务",
});
```

#### 3. 禁用自动 Toast

```typescript
// 手动处理所有 Toast
const result = await apiRequestPost("/api/tasks", data, {
  autoToast: false,
});

if (!result.success) {
  toast.error("自定义错误消息");
}
```

#### 4. 自定义错误消息前缀

```typescript
// 所有 Toast 都会添加前缀
const result = await apiRequestPost("/api/tasks", data, {
  toastContext: "创建任务",
});
// 错误时: "创建任务: 请求失败 (HTTP 400)"
```

#### 5. 禁用 401 重试

```typescript
// 401 时弹出登录弹窗但不重试请求
const result = await apiRequestGet("/api/tasks", {
  disableRetry: true,
});
```

## HTTP 状态码处理

### 4xx 客户端错误

| 状态码 | 含义 | 自动处理 | 业务层处理 |
|--------|------|---------|-----------|
| 400 | 请求参数错误 | ✅ 显示 Toast | 可选:显示表单验证错误 |
| 401 | 未认证 | ✅ 弹出登录弹窗 + 重试 | 无需处理 |
| 403 | 无权限 | ✅ 显示 Toast | 可选:跳转到权限页 |
| 404 | 资源不存在 | ✅ 显示 Toast | 可选:返回上一页 |
| 409 | 资源冲突 | ✅ 显示 Toast | 可选:提示用户修改 |
| 422 | 验证失败 | ✅ 显示 Toast | 可选:显示具体字段错误 |
| 429 | 请求过于频繁 | ✅ 显示 Toast | 可选:显示倒计时 |

**示例**:

```typescript
const result = await apiRequestDelete("/api/tasks/123");

if (!result.success) {
  if (result.error.hasStatus(403)) {
    // 特殊处理 403
    toast.error("您没有权限删除此任务");
  } else if (result.error.hasStatus(409)) {
    // 特殊处理 409
    toast.error("任务正在执行中,无法删除");
  }
  // 其他错误已自动显示 Toast
}
```

### 5xx 服务端错误

| 状态码 | 含义 | 自动处理 | 业务层处理 |
|--------|------|---------|-----------|
| 500 | 服务器内部错误 | ✅ 显示 Toast | 可选:提供反馈入口 |
| 502 | 网关错误 | ✅ 显示 Toast | 可选:提示稍后重试 |
| 503 | 服务不可用 | ✅ 显示 Toast | 可选:显示维护公告 |
| 504 | 网关超时 | ✅ 显示 Toast | 可选:提供重试按钮 |

**示例**:

```typescript
const result = await apiRequestGet("/api/tasks");

if (!result.success && result.error.isServerError()) {
  // 服务端错误,提供重试按钮
  toast.error("服务器繁忙,请稍后重试");
}
```

### 网络错误

| 错误类型 | status | 自动处理 | 业务层处理 |
|---------|--------|---------|-----------|
| 网络超时 | 0 | ✅ 显示 Toast "网络连接失败" | 可选:提供离线模式 |
| 网络断开 | 0 | ✅ 显示 Toast "网络连接失败" | 可选:检测网络状态 |
| CORS 错误 | 0 | ✅ 显示 Toast "网络连接失败" | 可选:检查配置 |

**示例**:

```typescript
const result = await apiRequestPost("/api/tasks", data);

if (!result.success && result.error.status === 0) {
  // 网络错误,提供重试
  toast.error("网络连接失败,请检查网络设置");
}
```

## 常见错误代码

项目中的常见错误代码(由后端定义):

| 错误代码 | HTTP 状态码 | 说明 | 建议处理 |
|---------|------------|------|---------|
| `UNAUTHORIZED` | 401 | 未登录 | ✅ 自动弹出登录弹窗 |
| `FORBIDDEN` | 403 | 无权限 | 自动 Toast,可选跳转 |
| `NOT_FOUND` | 404 | 资源不存在 | 自动 Toast,可选返回 |
| `INSUFFICIENT_CREDITS` | 400 | 积分不足 | 自定义 Toast + 跳转充值 |
| `VALIDATION_ERROR` | 400 | 验证失败 | 显示字段级错误 |
| `DUPLICATE_RESOURCE` | 409 | 资源重复 | 提示用户修改 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求过于频繁 | 提示稍后重试 |

**示例:根据错误代码处理**

```typescript
const result = await apiRequestPost("/api/tasks", data);

if (!result.success) {
  // 根据错误代码显示不同的提示
  if (result.error.hasCode("INSUFFICIENT_CREDITS")) {
    toast.error("积分不足,请充值");
    setTimeout(() => {
      window.location.href = "/pricing";
    }, 2000);
  } else if (result.error.hasCode("VALIDATION_ERROR")) {
    // 显示具体字段错误
    const fields = result.error.data?.fields || {};
    Object.entries(fields).forEach(([field, message]) => {
      toast.error(`${field}: ${message}`);
    });
  }
  // 其他错误已自动显示 Toast
}
```

## 最佳实践

### 1. 优先使用高级 API

```typescript
// ✅ 推荐:简洁明了
const result = await apiRequestGet<Task>("/api/tasks/123");
if (result.success) {
  console.log(result.data);
}

// ❌ 不推荐:需要手动解析
try {
  const response = await apiGet("/api/tasks/123");
  const json = await response.json();
  console.log(json.data);
} catch (error) {
  // ...
}
```

### 2. 利用自动 Toast

```typescript
// ✅ 推荐:自动显示错误 Toast
const result = await apiRequestPost("/api/tasks", data);

if (!result.success) {
  // 已自动显示 Toast,这里处理特定错误
  if (result.error.hasCode("INSUFFICIENT_CREDITS")) {
    // 特殊处理:积分不足
  }
}

// ❌ 不推荐:重复显示错误
const result = await apiRequestPost("/api/tasks", data);

if (!result.success) {
  toast.error(result.error.message);  // 重复!已自动显示过
}
```

### 3. 使用泛型提供类型提示

```typescript
// ✅ 推荐:有类型提示
const result = await apiRequestGet<Task>("/api/tasks/123");
if (result.success) {
  console.log(result.data.prompt);  // TypeScript 知道 data 的类型
}

// ❌ 不推荐:无类型提示
const result = await apiRequestGet("/api/tasks/123");
if (result.success) {
  console.log(result.data.prompt);  // data 类型为 any
}
```

### 4. 只处理需要特殊处理的错误

```typescript
// ✅ 推荐:只处理特定错误
const result = await apiRequestPost("/api/tasks", data);

if (!result.success) {
  if (result.error.hasCode("INSUFFICIENT_CREDITS")) {
    toast.error("积分不足,请充值");
  }
  // 其他错误已自动显示 Toast,无需处理
}

// ❌ 不推荐:处理所有错误
const result = await apiRequestPost("/api/tasks", data);

if (!result.success) {
  if (result.error.hasStatus(400)) {
    toast.error("请求失败");
  } else if (result.error.hasStatus(403)) {
    toast.error("权限不足");
  } else if (result.error.hasStatus(404)) {
    toast.error("资源不存在");
  }
  // ...
}
```

### 5. 成功时显示 Toast 的场景

```typescript
// ✅ 推荐:用户主动操作的成功反馈
const result = await apiRequestPost("/api/tasks", data, {
  toastType: "success",
  toastContext: "创建任务",
});

// ✅ 推荐:重要操作的成功反馈
const result = await apiRequestDelete("/api/tasks/123", {}, {
  toastType: "success",
  toastContext: "删除任务",
});

// ❌ 不推荐:数据加载成功不需要 Toast
const result = await apiRequestGet("/api/tasks", {
  toastType: "success",  // 不需要!
});
```

### 6. 合理使用 toastContext

```typescript
// ✅ 推荐:明确操作上下文
const result = await apiRequestPost("/api/tasks", data, {
  toastContext: "创建任务",
});
// 错误时: "创建任务: 请求失败 (HTTP 400)"

// ✅ 推荐:多个 API 调用时区分上下文
const result1 = await apiRequestPost("/api/tasks", data, {
  toastContext: "创建任务",
});
const result2 = await apiRequestPost("/api/models", data, {
  toastContext: "生成模型",
});

// ❌ 不推荐:toastContext 过于冗长
const result = await apiRequestPost("/api/tasks", data, {
  toastContext: "在任务创建页面创建新任务时",  // 太长了!
});
```

## 完整示例

### 示例 1: 简单的数据加载

```typescript
"use client";

import { useEffect, useState } from "react";
import { apiRequestGet } from "@/lib/api-client";
import type { Task } from "@/types";

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    // ✅ 自动显示错误 Toast
    const result = await apiRequestGet<Task[]>("/api/tasks");

    if (result.success) {
      setTasks(result.data);
    }
    // 失败时已自动显示 Toast,无需额外处理
    setIsLoading(false);
  };

  if (isLoading) return <div>加载中...</div>;

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>{task.prompt}</li>
      ))}
    </ul>
  );
}
```

### 示例 2: 表单提交 + 自定义错误处理

```typescript
"use client";

import { useState } from "react";
import { apiRequestPost } from "@/lib/api-client";
import { toast } from "@/lib/toast";

export default function CreateTaskForm() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      toast.error("请输入提示词");
      return;
    }

    setIsLoading(true);

    // ✅ 禁用自动 Toast,自定义错误消息
    const result = await apiRequestPost("/api/tasks", { prompt }, {
      autoToast: false,
    });

    if (result.success) {
      toast.success("任务创建成功!");
      setPrompt("");
    } else {
      // 根据错误代码显示不同的提示
      if (result.error.hasCode("INSUFFICIENT_CREDITS")) {
        toast.error("积分不足,请充值");
      } else if (result.error.hasCode("VALIDATION_ERROR")) {
        toast.error(result.error.data?.message || "输入验证失败");
      } else {
        toast.error("创建失败,请重试");
      }
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="输入提示词..."
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "创建中..." : "创建任务"}
      </button>
    </form>
  );
}
```

### 示例 3: 删除操作 + 成功 Toast

```typescript
"use client";

import { apiRequestDelete } from "@/lib/api-client";

export default function DeleteTaskButton({ taskId }: { taskId: string }) {
  const handleDelete = async () => {
    const confirmed = window.confirm("确定要删除此任务吗?此操作不可恢复。");
    if (!confirmed) return;

    // ✅ 显示成功和错误 Toast
    const result = await apiRequestDelete(`/api/tasks/${taskId}`, {}, {
      toastType: "success",
      toastContext: "删除任务",
    });

    if (result.success) {
      // 成功,已自动显示 Toast "删除任务: 操作成功"
      // 刷新列表
      window.location.reload();
    }
    // 失败已自动显示 Toast "删除任务: 请求失败 (HTTP 400)"
  };

  return <button onClick={handleDelete}>删除</button>;
}
```

### 示例 4: 批量操作 + 进度提示

```typescript
"use client";

import { apiRequestPost } from "@/lib/api-client";
import { toast } from "@/lib/toast";

export default function BatchDeleteButton({ taskIds }: { taskIds: string[] }) {
  const handleBatchDelete = async () => {
    if (taskIds.length === 0) {
      toast.warning("请先选择要删除的任务");
      return;
    }

    const confirmed = window.confirm(
      `确定要删除 ${taskIds.length} 个任务吗?`
    );
    if (!confirmed) return;

    // ✅ 显示操作进度
    toast.info(`正在删除 ${taskIds.length} 个任务...`);

    const result = await apiRequestPost("/api/tasks/batch-delete", {
      ids: taskIds,
    }, {
      autoToast: false,  // 手动处理 Toast
    });

    if (result.success) {
      toast.success(`成功删除 ${taskIds.length} 个任务`);
      // 刷新列表
    } else {
      if (result.error.hasCode("INSUFFICIENT_CREDITS")) {
        toast.error("积分不足");
      } else {
        toast.error(`删除失败: ${result.error.message}`);
      }
    }
  };

  return <button onClick={handleBatchDelete}>批量删除</button>;
}
```

## 迁移指南

### 从旧 API 迁移到新 API

如果你之前使用的 API 封装不支持自动错误处理,请按以下方式迁移:

#### 迁移前

```typescript
// ❌ 旧代码:手动处理所有错误
try {
  const response = await fetch("/api/tasks/123");
  if (!response.ok) {
    if (response.status === 404) {
      alert("任务不存在");
    } else if (response.status === 403) {
      alert("权限不足");
    } else {
      alert("请求失败");
    }
    return;
  }
  const json = await response.json();
  console.log(json.data);
} catch (error) {
  alert("网络错误");
}
```

#### 迁移后

```typescript
// ✅ 新代码:自动处理错误
const result = await apiRequestGet<Task>("/api/tasks/123");

if (result.success) {
  console.log(result.data);
}
// 所有错误已自动处理,无需手动判断

// 如果需要特殊处理某个错误:
if (!result.success && result.error.hasStatus(404)) {
  // 自定义 404 处理逻辑
}
```

### 从 alert() 迁移到 Toast

旧的代码使用 `alert()` 显示错误:

```typescript
// ❌ 迁移前
try {
  const response = await fetch("/api/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    alert("创建失败");
    return;
  }
  alert("创建成功");
} catch (error) {
  alert("网络错误");
}

// ✅ 迁移后
const result = await apiRequestPost("/api/tasks", data, {
  toastType: "success",
  toastContext: "创建任务",
});
// 成功时显示: "创建任务: 操作成功"
// 失败时自动显示: "创建任务: 请求失败 (HTTP 400)"
```

## 总结

统一的 API 错误处理架构:

- ✅ **网络层统一处理**: apiClient 自动处理所有 HTTP 错误
- ✅ **自动 Toast 提示**: 默认显示错误 Toast,提升用户体验
- ✅ **业务代码简洁**: 使用 `apiRequest` 系列,只需关注成功逻辑
- ✅ **类型安全**: ApiError 提供丰富的判断方法
- ✅ **灵活配置**: 支持禁用自动 Toast、自定义错误消息等

**推荐做法**:
1. 优先使用 `apiRequest` 系列函数
2. 利用自动 Toast,减少重复代码
3. 只对需要特殊处理的错误进行自定义
4. 使用泛型提供类型提示
5. 用户主动操作时显示成功 Toast

通过这套统一的错误处理架构,可以显著提升代码的可维护性和用户体验! 🎉
