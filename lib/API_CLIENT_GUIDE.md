# API Client 使用指南

## 概述

`api-client.ts` 提供了两层 API 封装：

1. **底层 API** (`apiClient`, `apiGet`, `apiPost` 等)
   - 返回原生 `Response` 对象
   - 自动处理 401 认证
   - 自动抛出 `ApiError`（4xx/5xx）
   - 适合需要访问原始响应的场景

2. **高级 API** (`apiRequest`, `apiRequestGet`, `apiRequestPost` 等) **【推荐使用】**
   - 返回 `{ success, data, error }` 结构
   - 自动解析 JSON
   - 自动提取 JSend 的 `data` 字段
   - 无需 try-catch，业务代码更简洁
   - 类型安全（支持泛型）

---

## 🚀 推荐用法（高级 API）

### 1. 基础 GET 请求

```typescript
import { apiRequestGet, ApiError } from '@/lib/api-client';
import type { Task } from '@/types';

// 获取任务详情
const result = await apiRequestGet<Task>('/api/tasks/123');

if (result.success) {
  // ✅ 成功：TypeScript 自动推导 data 类型为 Task
  console.log(result.data.prompt);
  console.log(result.data.status);
} else {
  // ❌ 失败：result.error 是 ApiError 实例
  console.error(result.error.message);

  // 判断特定错误
  if (result.error.hasStatus(404)) {
    alert('任务不存在');
  } else if (result.error.isServerError()) {
    alert('服务器错误，请稍后重试');
  }
}
```

### 2. POST 请求（创建资源）

```typescript
import { apiRequestPost } from '@/lib/api-client';
import type { Task } from '@/types';

// 创建生成任务
const result = await apiRequestPost<Task>('/api/tasks', {
  prompt: '一只可爱的猫咪',
  imageCount: 4,
});

if (result.success) {
  console.log('任务创建成功:', result.data.id);
  // 跳转到任务详情页
  router.push(`/workspace?taskId=${result.data.id}`);
} else {
  // 处理错误
  if (result.error.hasCode('VALIDATION_ERROR')) {
    alert('提示词格式不正确');
  } else {
    alert(`创建失败: ${result.error.message}`);
  }
}
```

### 3. PATCH 请求（更新资源）

```typescript
import { apiRequestPatch } from '@/lib/api-client';

// 选择图片
const result = await apiRequestPatch(`/api/tasks/${taskId}`, {
  selectedImageIndex: 2,
});

if (result.success) {
  console.log('图片已选择，3D 模型生成中');
} else {
  alert(`选择失败: ${result.error.message}`);
}
```

### 4. DELETE 请求

```typescript
import { apiRequestDelete } from '@/lib/api-client';

// 删除任务
const result = await apiRequestDelete(`/api/tasks/${taskId}`);

if (result.success) {
  console.log('任务已删除');
} else {
  if (result.error.hasStatus(403)) {
    alert('无权删除此任务');
  } else {
    alert(`删除失败: ${result.error.message}`);
  }
}
```

### 5. 解构赋值用法

```typescript
// 直接解构 success, data, error
const { success, data, error } = await apiRequestGet('/api/tasks/123');

if (!success) {
  // 提前返回处理错误
  console.error(error.message);
  return;
}

// 成功后使用 data
console.log(data.prompt);
```

### 6. 在 React 组件中使用

```typescript
'use client';

import { useState } from 'react';
import { apiRequestPost, ApiError } from '@/lib/api-client';
import type { Task } from '@/types';

export default function CreateTaskPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (prompt: string) => {
    setLoading(true);
    setError(null);

    // 调用 API
    const result = await apiRequestPost<Task>('/api/tasks', { prompt });

    setLoading(false);

    if (result.success) {
      // 成功：跳转到任务详情页
      router.push(`/workspace?taskId=${result.data.id}`);
    } else {
      // 失败：显示错误消息
      setError(result.error.message);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button onClick={() => handleSubmit('test')} disabled={loading}>
        {loading ? '创建中...' : '创建任务'}
      </button>
    </div>
  );
}
```

---

## ⚙️ 底层 API 用法

如果需要访问原始 `Response` 对象（例如处理流式响应、读取特殊 Header），可以使用底层 API：

### 1. 需要 try-catch

```typescript
import { apiGet, ApiError } from '@/lib/api-client';

try {
  const response = await apiGet('/api/tasks/123');
  const json = await response.json();
  console.log(json.data); // JSend 格式：{ status: 'success', data: {...} }
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.message);
    if (error.hasStatus(404)) {
      alert('任务不存在');
    }
  }
}
```

### 2. 禁用自动错误处理

如果需要手动处理所有状态码（例如特殊的 304 逻辑）：

```typescript
import { apiClient } from '@/lib/api-client';

const response = await apiClient('/api/tasks/123', {
  disableErrorHandling: true, // 禁用自动错误处理
});

// 手动判断状态码
if (response.status === 304) {
  console.log('数据未变化，使用缓存');
} else if (response.status === 404) {
  console.log('任务不存在');
} else if (response.ok) {
  const json = await response.json();
  console.log(json.data);
}
```

---

## 📋 API 参考

### ApiError 类

所有 API 错误都封装为 `ApiError` 实例：

```typescript
class ApiError extends Error {
  status: number;         // HTTP 状态码
  code?: string;          // 错误代码（来自 JSend）
  data?: any;             // 原始响应数据

  // 方法
  isClientError(): boolean;       // 是否为 4xx 错误
  isServerError(): boolean;       // 是否为 5xx 错误
  hasStatus(status: number): boolean;  // 判断特定状态码
  hasCode(code: string): boolean;      // 判断特定错误代码
}
```

### ApiResult 类型

高级 API 的返回类型：

```typescript
type ApiResult<T> =
  | { success: true; data: T }              // 成功
  | { success: false; error: ApiError };    // 失败
```

### 请求选项

所有 API 方法都支持以下选项：

```typescript
interface ApiClientOptions extends RequestInit {
  context?: 'workspace' | 'gallery' | 'general';  // 登录弹窗上下文
  disableRetry?: boolean;                         // 禁用 401 自动重试
  disableErrorHandling?: boolean;                 // 禁用自动错误处理（仅底层 API）
}
```

---

## 🎯 最佳实践

### 1. 优先使用高级 API

```typescript
// ✅ 推荐：高级 API（简洁、类型安全）
const result = await apiRequestGet<Task>('/api/tasks/123');
if (result.success) {
  console.log(result.data);
}

// ❌ 不推荐：底层 API（需要 try-catch，代码冗长）
try {
  const response = await apiGet('/api/tasks/123');
  const json = await response.json();
  console.log(json.data);
} catch (error) {
  // ...
}
```

### 2. 使用泛型提供类型提示

```typescript
// ✅ 推荐：提供泛型参数
const result = await apiRequestGet<Task>('/api/tasks/123');
if (result.success) {
  result.data.prompt;  // TypeScript 自动提示
}

// ❌ 不推荐：不提供泛型（data 类型为 any）
const result = await apiRequestGet('/api/tasks/123');
```

### 3. 优雅处理错误

```typescript
// ✅ 推荐：使用 ApiError 的辅助方法
if (!result.success) {
  if (result.error.hasStatus(404)) {
    return <NotFoundPage />;
  } else if (result.error.hasCode('INSUFFICIENT_CREDITS')) {
    return <UpgradePlanPrompt />;
  } else {
    return <ErrorPage message={result.error.message} />;
  }
}

// ❌ 不推荐：硬编码字符串比较
if (!result.success) {
  if (result.error.message.includes('not found')) {
    // ...
  }
}
```

### 4. 组件中统一错误处理

创建自定义 Hook：

```typescript
// hooks/use-api.ts
import { useState } from 'react';
import { apiRequest, ApiError } from '@/lib/api-client';

export function useApi<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = async (
    url: string,
    options?: any
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    const result = await apiRequest<T>(url, options);

    setLoading(false);

    if (result.success) {
      return result.data;
    } else {
      setError(result.error);
      return null;
    }
  };

  return { execute, loading, error };
}
```

使用：

```typescript
const { execute, loading, error } = useApi<Task>();

const handleCreate = async () => {
  const task = await execute('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'test' }),
  });

  if (task) {
    console.log('创建成功:', task.id);
  }
};
```

---

## 🔍 常见状态码处理

| 状态码 | 含义 | 处理方式 |
|--------|------|---------|
| 200 | 成功（GET/PATCH/DELETE） | 正常处理 `data` |
| 201 | 资源已创建（POST） | 正常处理 `data` |
| 304 | 未修改（轮询优化） | 自动返回，不抛错 |
| 400 | 请求参数错误 | 显示错误提示 |
| 401 | 未认证 | 自动弹出登录弹窗 |
| 403 | 无权限 | 显示权限不足提示 |
| 404 | 资源不存在 | 显示 404 页面 |
| 500 | 服务器错误 | 显示错误提示 + 联系支持 |

---

## 📚 相关文档

- `types/index.ts` - 所有类型定义
- `lib/config/api.ts` - API 地址配置
- `stores/token-store.ts` - Token 管理
- `stores/login-modal-store.ts` - 登录弹窗管理
