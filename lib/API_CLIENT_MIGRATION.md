# API Client 迁移示例

本文档展示如何将现有代码从旧的 API 调用方式迁移到新的高级 API。

---

## 示例 1: workspace/page.tsx - 获取任务状态

### 迁移前（使用 apiGet）

```typescript
// ❌ 旧代码：需要手动判断 response.ok，需要 try-catch
try {
  const response = await apiGet(`/api/tasks/${taskId}/status`, {
    context: "workspace",
  });

  if (!response.ok) {
    console.error("获取任务状态失败");
    return;
  }

  const json = await response.json();
  const updatedTask = json.data;
  setCurrentTask(updatedTask);
} catch (error) {
  console.error("请求失败:", error);
}
```

### 迁移后（使用 apiRequestGet）

```typescript
// ✅ 新代码：简洁、类型安全、无需 try-catch
const result = await apiRequestGet<Task>(
  `/api/tasks/${taskId}/status`,
  { context: "workspace" }
);

if (result.success) {
  setCurrentTask(result.data);
} else {
  console.error("获取任务状态失败:", result.error.message);
}
```

---

## 示例 2: workspace/page.tsx - 创建生成任务

### 迁移前

```typescript
// ❌ 旧代码
const handleSubmit = async (prompt: string) => {
  setLoading(true);

  try {
    const response = await apiPost(
      "/api/tasks",
      { prompt },
      { context: "workspace" }
    );

    if (!response.ok) {
      const json = await response.json();
      alert(`创建失败: ${json.data?.message || "未知错误"}`);
      setLoading(false);
      return;
    }

    const json = await response.json();
    const newTask = json.data;
    setCurrentTask(newTask);
    setLoading(false);
  } catch (error) {
    alert(`创建失败: ${error instanceof Error ? error.message : "未知错误"}`);
    setLoading(false);
  }
};
```

### 迁移后

```typescript
// ✅ 新代码：更简洁、更易读
const handleSubmit = async (prompt: string) => {
  setLoading(true);

  const result = await apiRequestPost<Task>(
    "/api/tasks",
    { prompt },
    { context: "workspace" }
  );

  setLoading(false);

  if (result.success) {
    setCurrentTask(result.data);
  } else {
    alert(`创建失败: ${result.error.message}`);
  }
};
```

---

## 示例 3: workspace/page.tsx - 选择图片

### 迁移前

```typescript
// ❌ 旧代码
const handleSelectImage = async (imageIndex: number) => {
  try {
    const response = await apiPatch(
      `/api/tasks/${taskId}`,
      { selectedImageIndex: imageIndex },
      { context: "workspace" }
    );

    if (!response.ok) {
      const json = await response.json();
      alert(`选择失败: ${json.data?.message || "未知错误"}`);
      return;
    }

    const json = await response.json();
    const { task, model } = json.data;
    setCurrentTask(task);
    setGeneratedModel(model);
  } catch (error) {
    alert(`选择失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
};
```

### 迁移后

```typescript
// ✅ 新代码
const handleSelectImage = async (imageIndex: number) => {
  const result = await apiRequestPatch<{ task: Task; model: Model }>(
    `/api/tasks/${taskId}`,
    { selectedImageIndex: imageIndex },
    { context: "workspace" }
  );

  if (result.success) {
    setCurrentTask(result.data.task);
    setGeneratedModel(result.data.model);
  } else {
    alert(`选择失败: ${result.error.message}`);
  }
};
```

---

## 示例 4: history/page.tsx - 获取历史记录列表

### 迁移前

```typescript
// ❌ 旧代码
useEffect(() => {
  const fetchHistory = async () => {
    setLoading(true);

    try {
      const response = await apiGet("/api/tasks", {
        context: "history",
      });

      if (!response.ok) {
        console.error("获取历史记录失败");
        setLoading(false);
        return;
      }

      const json = await response.json();
      setTasks(json.data);
    } catch (error) {
      console.error("请求失败:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchHistory();
}, []);
```

### 迁移后

```typescript
// ✅ 新代码
useEffect(() => {
  const fetchHistory = async () => {
    setLoading(true);

    const result = await apiRequestGet<Task[]>("/api/tasks", {
      context: "history",
    });

    setLoading(false);

    if (result.success) {
      setTasks(result.data);
    } else {
      console.error("获取历史记录失败:", result.error.message);
    }
  };

  fetchHistory();
}, []);
```

---

## 示例 5: gallery/page.tsx - 获取画廊模型

### 迁移前

```typescript
// ❌ 旧代码
const fetchModels = async () => {
  try {
    const response = await apiGet(
      `/api/gallery/models?page=${page}&pageSize=20`,
      { context: "gallery" }
    );

    if (!response.ok) {
      console.error("获取模型失败");
      return;
    }

    const json = await response.json();
    const { items, total } = json.data;
    setModels(items);
    setTotalCount(total);
  } catch (error) {
    console.error("请求失败:", error);
  }
};
```

### 迁移后

```typescript
// ✅ 新代码
const fetchModels = async () => {
  const result = await apiRequestGet<{ items: Model[]; total: number }>(
    `/api/gallery/models?page=${page}&pageSize=20`,
    { context: "gallery" }
  );

  if (result.success) {
    setModels(result.data.items);
    setTotalCount(result.data.total);
  } else {
    console.error("获取模型失败:", result.error.message);
  }
};
```

---

## 示例 6: 处理特定错误码

### 迁移前

```typescript
// ❌ 旧代码：需要手动解析 JSON 和判断状态码
try {
  const response = await apiPost("/api/tasks", { prompt });

  if (response.status === 400) {
    const json = await response.json();
    if (json.data?.code === "VALIDATION_ERROR") {
      alert("提示词格式不正确");
    }
  } else if (response.status === 403) {
    const json = await response.json();
    if (json.data?.code === "INSUFFICIENT_CREDITS") {
      alert("积分不足，请充值");
    }
  } else if (!response.ok) {
    alert("创建失败");
  } else {
    const json = await response.json();
    setTask(json.data);
  }
} catch (error) {
  alert("网络错误");
}
```

### 迁移后

```typescript
// ✅ 新代码：使用 ApiError 的辅助方法
const result = await apiRequestPost<Task>("/api/tasks", { prompt });

if (result.success) {
  setTask(result.data);
} else {
  // 使用 hasStatus 和 hasCode 方法判断错误
  if (result.error.hasCode("VALIDATION_ERROR")) {
    alert("提示词格式不正确");
  } else if (result.error.hasCode("INSUFFICIENT_CREDITS")) {
    alert("积分不足，请充值");
  } else if (result.error.hasStatus(403)) {
    alert("无权访问");
  } else if (result.error.isServerError()) {
    alert("服务器错误，请稍后重试");
  } else {
    alert(`创建失败: ${result.error.message}`);
  }
}
```

---

## 示例 7: 自定义 Hook 封装

### 创建通用的 API Hook

```typescript
// hooks/use-api-request.ts
import { useState, useCallback } from "react";
import { apiRequest, type ApiClientOptions, ApiError } from "@/lib/api-client";

export function useApiRequest<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (url: string, options?: ApiClientOptions): Promise<T | null> => {
      setLoading(true);
      setError(null);

      const result = await apiRequest<T>(url, options);

      setLoading(false);

      if (result.success) {
        setData(result.data);
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, loading, error, data, reset };
}
```

### 在组件中使用

```typescript
// ✅ 使用自定义 Hook
import { useApiRequest } from "@/hooks/use-api-request";
import type { Task } from "@/types";

function TaskDetailPage({ taskId }: { taskId: string }) {
  const { execute, loading, error, data } = useApiRequest<Task>();

  useEffect(() => {
    execute(`/api/tasks/${taskId}`);
  }, [taskId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;

  return <TaskDetail task={data} />;
}
```

---

## 迁移检查清单

迁移时请确保：

- [ ] 将 `apiGet/apiPost/apiPatch` 替换为 `apiRequestGet/apiRequestPost/apiRequestPatch`
- [ ] 移除 `try-catch` 包裹（除非需要处理网络错误）
- [ ] 移除 `if (!response.ok)` 判断
- [ ] 移除 `await response.json()`（高级 API 自动解析）
- [ ] 移除 `json.data` 提取（高级 API 自动提取）
- [ ] 使用 `result.success` 判断成功/失败
- [ ] 使用 `result.data` 访问数据（成功时）
- [ ] 使用 `result.error` 访问错误（失败时）
- [ ] 使用 `ApiError` 的辅助方法判断错误类型
- [ ] 添加泛型参数以获得类型提示

---

## 常见问题

### Q1: 什么时候使用底层 API（`apiClient`）？

**A:** 只有在以下场景才需要使用底层 API：
- 需要访问原始 `Response` 对象（例如读取特殊 Header）
- 需要处理流式响应（例如 SSE）
- 需要禁用自动错误处理（`disableErrorHandling: true`）

其他所有场景都应该使用高级 API（`apiRequest`）。

### Q2: 如何处理 304 Not Modified？

**A:** 高级 API 会自动处理 304，返回之前的缓存数据（前端轮询场景）：

```typescript
const result = await apiRequestGet(`/api/tasks/${taskId}/status?since=${lastUpdate}`);

if (result.success) {
  // 304 会返回 success: true，但 data 可能为空
  // 你需要在前端维护缓存
  if (result.data) {
    updateCache(result.data);
  }
}
```

### Q3: 如何迁移现有的错误处理逻辑？

**A:** 使用 `ApiError` 的辅助方法：

```typescript
// 迁移前
if (response.status === 404) { ... }

// 迁移后
if (result.error.hasStatus(404)) { ... }

// 迁移前
if (json.data?.code === "VALIDATION_ERROR") { ... }

// 迁移后
if (result.error.hasCode("VALIDATION_ERROR")) { ... }

// 迁移前
if (response.status >= 500) { ... }

// 迁移后
if (result.error.isServerError()) { ... }
```

---

## 下一步

1. 优先迁移高频调用的 API（例如 `workspace/page.tsx`）
2. 创建自定义 Hook 封装常见模式（例如分页、轮询）
3. 统一错误提示组件（例如 Toast、Alert）
4. 添加单元测试（使用 Mock 模拟 API 响应）
