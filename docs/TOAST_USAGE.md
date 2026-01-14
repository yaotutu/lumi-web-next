# Toast 使用指南

全局 Toast 通知系统 - 提供统一、优雅的用户反馈机制

## 概述

Toast 通知系统用于向用户显示短暂的消息提示,不会打断用户操作流程。相比传统的 `alert()`,Toast 提供了更好的用户体验。

**核心优势**:
- ✅ 非阻塞式提示,不打断用户操作
- ✅ 4 种语义化类型(success/error/warning/info)
- ✅ 自动消失,可自定义显示时长
- ✅ 全局统一管理,支持多个提示并发显示
- ✅ 美观的深色主题 UI

## 快速开始

### 1. 基础用法

```typescript
import { toast } from "@/lib/toast";

// 成功提示
toast.success("操作成功");

// 错误提示
toast.error("操作失败,请重试");

// 警告提示
toast.warning("请注意检查输入");

// 信息提示
toast.info("功能开发中...");

// 自定义显示时长(毫秒)
toast.success("保存成功", 5000); // 显示 5 秒
```

### 2. 在组件中使用

```typescript
"use client";

import { toast } from "@/lib/toast";

export default function MyComponent() {
  const handleSave = async () => {
    try {
      await saveData();
      toast.success("保存成功");
    } catch (error) {
      toast.error("保存失败,请重试");
    }
  };

  return <button onClick={handleSave}>保存</button>;
}
```

### 3. 使用 Hook(高级用法)

```typescript
"use client";

import { useToast } from "@/lib/toast";

export default function MyComponent() {
  const { toasts, addToast, removeToast, clearAll } = useToast();

  return (
    <div>
      <button onClick={() => addToast({ type: "success", message: "成功" })}>
        添加 Toast
      </button>
      <button onClick={() => clearAll()}>
        清空所有
      </button>

      <div>
        当前 Toast 数量: {toasts.length}
      </div>
    </div>
  );
}
```

## API 详细说明

### toast.success()

显示成功提示(绿色)

```typescript
toast.success(message: string, duration?: number): void
```

**使用场景**:
- 操作成功完成(保存、删除、更新等)
- 任务执行成功
- 用户操作确认

**示例**:
```typescript
toast.success("保存成功");
toast.success("删除成功", 2000);
toast.success("用户名修改成功");
```

### toast.error()

显示错误提示(红色)

```typescript
toast.error(message: string, duration?: number): void
```

**使用场景**:
- 操作失败
- 网络错误
- 验证失败
- 权限不足

**示例**:
```typescript
toast.error("保存失败,请重试");
toast.error("网络连接失败");
toast.error("用户名不能为空");
```

### toast.warning()

显示警告提示(黄色)

```typescript
toast.warning(message: string, duration?: number): void
```

**使用场景**:
- 需要用户注意的问题
- 潜在风险提示
- 非致命错误

**示例**:
```typescript
toast.warning("请注意检查输入");
toast.warning("积分不足,即将耗尽");
toast.warning("未保存的修改将会丢失");
```

### toast.info()

显示信息提示(蓝色)

```typescript
toast.info(message: string, duration?: number): void
```

**使用场景**:
- 功能开发中提示
- 操作说明
- 一般性信息

**示例**:
```typescript
toast.info("功能开发中...");
toast.info("正在加载数据...");
toast.info("已自动保存");
```

### useToast Hook

访问 Toast 状态和方法

```typescript
const {
  toasts,        // ToastItem[] - 当前所有 Toast
  addToast,      // (toast) => void - 添加 Toast
  removeToast,   // (id: string) => void - 移除指定 Toast
  clearAll,      // () => void - 清空所有 Toast
} = useToast();
```

**返回值说明**:

```typescript
interface ToastItem {
  id: string;           // 唯一标识
  type: ToastType;      // 类型: "success" | "error" | "warning" | "info"
  message: string;      // 消息内容
  duration?: number;    // 显示时长(毫秒),0 表示不自动关闭
}
```

## 与 API 集成

### 自动错误处理

`apiRequest` 系列函数已经集成了自动 Toast 功能:

```typescript
import { apiRequestPost } from "@/lib/api-client";

// ✅ 自动显示错误 Toast(默认启用)
const result = await apiRequestPost("/api/tasks", { prompt: "test" });

if (result.success) {
  // 成功,不显示 Toast(除非指定 toastType: "success")
  console.log(result.data);
} else {
  // 失败,自动显示错误 Toast
  // Toast 内容: "请求失败 (HTTP 400)" 或后端返回的具体错误信息
}

// ✅ 禁用自动 Toast
const result = await apiRequestPost("/api/tasks", { prompt: "test" }, {
  autoToast: false,  // 不自动显示错误 Toast
});

// ✅ 显示成功 Toast
const result = await apiRequestPost("/api/tasks", { prompt: "test" }, {
  toastType: "success",  // 成功时显示 Toast
  toastContext: "保存任务",  // Toast 前缀:"保存任务: 操作成功"
});
```

**ApiClientOptions 配置**:

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `autoToast` | `boolean` | `true` | 是否自动显示错误 Toast |
| `toastContext` | `string` | `undefined` | Toast 消息前缀(如 "保存任务") |
| `toastType` | `"success" \| "error" \| "warning" \| "info"` | `undefined` | 成功时显示的 Toast 类型 |

**使用示例**:

```typescript
// 1. 默认行为(自动显示错误,不显示成功)
const result = await apiRequestPost("/api/users", { name: "test" });
// 失败时自动显示: "请求失败 (HTTP 400)"

// 2. 禁用自动 Toast(手动处理)
const result = await apiRequestPost("/api/users", { name: "test" }, {
  autoToast: false,
});

if (!result.success) {
  toast.error(`保存失败: ${result.error.message}`);
}

// 3. 同时显示成功和错误 Toast
const result = await apiRequestPost("/api/users", { name: "test" }, {
  toastType: "success",
  toastContext: "保存用户",
});
// 成功时显示: "保存用户: 操作成功"
// 失败时显示: "保存用户: 请求失败 (HTTP 400)"

// 4. 自定义错误 Toast
const result = await apiRequestPost("/api/users", { name: "test" }, {
  toastType: "success",
});

if (!result.success) {
  // 根据错误代码显示不同的提示
  if (result.error.hasCode("INSUFFICIENT_CREDITS")) {
    toast.error("积分不足,请充值");
  } else if (result.error.hasStatus(403)) {
    toast.error("权限不足");
  } else {
    toast.error("操作失败,请重试");
  }
}
```

## 最佳实践

### 1. 选择合适的 Toast 类型

| 场景 | 推荐类型 | 示例 |
|------|---------|------|
| 操作成功 | `toast.success()` | "保存成功"、"删除成功" |
| 操作失败 | `toast.error()` | "保存失败"、"网络错误" |
| 验证错误 | `toast.error()` | "用户名不能为空"、"密码格式错误" |
| 权限问题 | `toast.error()` | "权限不足"、"请先登录" |
| 风险提示 | `toast.warning()` | "未保存的修改将会丢失" |
| 功能未完成 | `toast.info()` | "功能开发中..." |
| 一般信息 | `toast.info()` | "已自动保存"、"正在加载" |

### 2. 消息内容要简洁明了

```typescript
// ✅ 好的消息
toast.success("保存成功");
toast.error("网络连接失败");

// ❌ 不好的消息(太长)
toast.success("您的个人信息已经成功保存到数据库中");
toast.error("由于网络连接问题导致无法连接到服务器,请检查您的网络设置");
```

### 3. 错误消息要包含有用的信息

```typescript
// ✅ 好的错误消息
toast.error("用户名不能为空");
toast.error("密码长度至少为 6 位");
toast.error(`保存失败: ${error.message}`);

// ❌ 不好的错误消息(太笼统)
toast.error("操作失败");
toast.error("出错了");
```

### 4. 合理使用自定义时长

```typescript
// 默认 3 秒(适用于大多数情况)
toast.success("保存成功");

// 重要错误,显示更长时间
toast.error("网络连接失败", 5000);

// 需要用户仔细阅读的信息
toast.info("请阅读使用说明", 8000);

// 短暂的确认提示
toast.success("已复制", 1500);
```

### 5. 避免滥用 Toast

```typescript
// ✅ 好的用法
toast.success("保存成功");
toast.error("删除失败");

// ❌ 滥用(不应该用于调试日志)
toast.info(`调试: state = ${JSON.stringify(state)}`);

// ❌ 滥用(不应该用于频繁的事件)
useEffect(() => {
  toast.info("每秒都显示这个提示很烦人"); // 不要这样做!
}, []);
```

## 从 alert() 迁移到 Toast

### 迁移规则

| 原代码 | 迁移后 |
|--------|--------|
| `alert("保存成功")` | `toast.success("保存成功")` |
| `alert("保存失败")` | `toast.error("保存失败")` |
| `alert("功能开发中...")` | `toast.info("功能开发中...")` |
| `alert("请注意...")` | `toast.warning("请注意...")` |
| `window.confirm()` | 保持不变(需要用户确认) |

### 迁移示例

```typescript
// ❌ 迁移前
const handleSave = async () => {
  try {
    await saveData();
    alert("保存成功");
  } catch (error) {
    alert("保存失败");
  }
};

// ✅ 迁移后
const handleSave = async () => {
  try {
    await saveData();
    toast.success("保存成功");
  } catch (error) {
    toast.error("保存失败");
  }
};

// ❌ 迁移前(需要确认的操作)
const handleDelete = async () => {
  if (confirm("确定要删除吗?")) {
    await deleteData();
    alert("删除成功");
  }
};

// ✅ 迁移后(confirm 保持不变)
const handleDelete = async () => {
  if (window.confirm("确定要删除吗?")) {
    try {
      await deleteData();
      toast.success("删除成功");
    } catch (error) {
      toast.error("删除失败");
    }
  }
};
```

## 常见问题

### Q: Toast 和 alert 的区别是什么?

**A**: 主要区别:

| 特性 | Toast | alert() |
|------|-------|---------|
| 阻塞性 | ❌ 非阻塞 | ✅ 阻塞(必须点击确定) |
| 用户体验 | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐ 较差 |
| 自定义样式 | ✅ 支持深色主题 | ❌ 浏览器默认样式 |
| 显示时长 | ⏱️ 可自定义 | ♾️ 必须手动关闭 |
| 并发显示 | ✅ 支持多个 | ❌ 只能一个 |

**结论**: 优先使用 Toast,只在需要用户明确确认时使用 `window.confirm()`。

### Q: 如何禁用 API 的自动 Toast?

**A**: 设置 `autoToast: false`:

```typescript
const result = await apiRequestPost("/api/tasks", data, {
  autoToast: false,  // 禁用自动 Toast
});
```

### Q: Toast 会自动消失吗?

**A**: 是的,默认 3 秒后自动消失。可以通过 `duration` 参数自定义:

```typescript
toast.success("保存成功", 5000);  // 5 秒后消失
toast.info("重要信息", 0);  // 不自动消失,需手动关闭
```

### Q: 可以同时显示多个 Toast 吗?

**A**: 可以!Toast 系统支持并发显示多个提示:

```typescript
toast.success("保存成功");
toast.info("已自动备份");
toast.warning("积分即将耗尽");
// 三个 Toast 会同时显示,互不影响
```

### Q: 如何在 API 错误时显示自定义错误消息?

**A**: 有两种方式:

**方式 1: 禁用自动 Toast,手动处理**
```typescript
const result = await apiRequestPost("/api/users", data, {
  autoToast: false,
});

if (!result.success) {
  if (result.error.hasCode("INSUFFICIENT_CREDITS")) {
    toast.error("积分不足,请充值");
  } else {
    toast.error("操作失败,请重试");
  }
}
```

**方式 2: 使用 `toastContext` 添加前缀**
```typescript
const result = await apiRequestPost("/api/users", data, {
  toastContext: "保存用户",  // 错误消息会显示: "保存用户: 请求失败 (HTTP 400)"
});
```

## 完整示例

### 示例 1: 表单提交

```typescript
"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import { apiRequestPost } from "@/lib/api-client";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 客户端验证
    if (!name.trim()) {
      toast.error("请输入您的姓名");
      return;
    }

    if (!email.trim()) {
      toast.error("请输入您的邮箱");
      return;
    }

    if (!email.includes("@")) {
      toast.error("请输入有效的邮箱地址");
      return;
    }

    setIsLoading(true);

    try {
      // API 调用(自动显示错误 Toast)
      const result = await apiRequestPost("/api/contact", {
        name,
        email,
      }, {
        toastType: "success",
        toastContext: "提交",
      });

      if (result.success) {
        // 成功,自动显示 Toast("提交: 操作成功")
        setName("");
        setEmail("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="您的姓名"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="您的邮箱"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "提交中..." : "提交"}
      </button>
    </form>
  );
}
```

### 示例 2: 数据加载和错误处理

```typescript
"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { apiRequestGet } from "@/lib/api-client";

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);

    try {
      const result = await apiRequestGet("/api/tasks", {
        autoToast: false,  // 手动处理错误
      });

      if (result.success) {
        setTasks(result.data);
        toast.success(`加载了 ${result.data.length} 个任务`);
      } else {
        // 根据错误类型显示不同的提示
        if (result.error.hasStatus(401)) {
          toast.error("请先登录");
        } else if (result.error.hasStatus(403)) {
          toast.error("权限不足");
        } else {
          toast.error("加载任务失败,请刷新页面重试");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    toast.info("正在重新加载...");
    await loadTasks();
  };

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <button onClick={handleRetry}>刷新</button>
      <ul>
        {tasks.map((task: any) => (
          <li key={task.id}>{task.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 示例 3: 批量操作

```typescript
"use client";

import { toast } from "@/lib/toast";
import { apiRequestPost } from "@/lib/api-client";

export default function BatchActions() {
  const handleBatchDelete = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) {
      toast.warning("请先选择要删除的项目");
      return;
    }

    const confirmed = window.confirm(
      `确定要删除 ${selectedIds.length} 个项目吗?此操作不可恢复。`
    );

    if (!confirmed) return;

    try {
      const result = await apiRequestPost("/api/batch-delete", {
        ids: selectedIds,
      }, {
        toastType: "success",
        toastContext: "批量删除",
      });

      if (result.success) {
        toast.success(`成功删除 ${selectedIds.length} 个项目`);
        // 刷新列表
      }
    } catch (error) {
      toast.error("批量删除失败,请重试");
    }
  };

  return (
    <button onClick={() => handleBatchDelete(["1", "2", "3"])}>
      批量删除
    </button>
  );
}
```

## 总结

Toast 系统提供了统一、优雅的用户反馈机制:

- ✅ **优先使用 Toast** 而不是 `alert()`
- ✅ **根据语义选择类型**: success/error/warning/info
- ✅ **消息要简洁明了**: 避免过长的描述
- ✅ **API 自动错误处理**: 利用 `autoToast` 和 `toastType`
- ✅ **只在需要确认时使用 `window.confirm()`**: 不要滥用

通过合理使用 Toast,可以显著提升应用的用户体验! 🎉
