# 任务状态系统重构详细计划

**创建时间**：2025-10-14
**重构范围**：任务状态设计（TaskStatus 和 ModelStatus）
**重构原因**：现有状态命名模糊，混合了"阶段"、"信号"、"状态"等多种语义，前端难以判断 UI 状态
**数据处理**：可以丢失现有数据，直接进行破坏性迁移

---

## 📊 问题分析

### 旧设计的问题

#### 1. TaskStatus 语义混乱

```prisma
enum TaskStatus {
  PENDING            // ❌ 模糊：等待什么？图片还是模型？
  GENERATING_IMAGES  // ⚠️ 命名风格不一致
  IMAGES_READY       // ✅ 清晰
  GENERATING_MODEL   // ❌ 看起来像状态，实际是 Worker 监听的"信号"
  COMPLETED          // ✅ 清晰
  FAILED             // ⚠️ 不知道在哪个阶段失败
  CANCELLED          // ✅ 清晰
}
```

**问题清单**：
- `PENDING` 不知道是图片等待还是模型等待
- `GENERATING_MODEL` 既是"触发信号"又是"执行状态"，语义重叠
- 命名风格不统一（GENERATING_IMAGES vs IMAGES_READY）
- 前端需要多个 if/else 判断当前应该显示什么 UI

#### 2. ModelStatus vs TaskStatus 混乱

- **图片生成**：只有 TaskStatus，没有单独的 ImageStatus
- **模型生成**：既有 TaskStatus.GENERATING_MODEL，又有 ModelStatus.GENERATING
- 双层状态导致"任务说正在生成，模型说等待中"的矛盾

---

## ✅ 新设计方案

### 核心设计原则

1. **前端优先**：状态命名以前端 UI 需求为主
2. **语义清晰**：开发者看到状态名立即知道 UI 应该显示什么
3. **阶段分离**：明确区分"图片生成阶段"和"模型生成阶段"
4. **命名一致**：统一使用 `阶段_状态` 的命名格式
5. **技术解耦**：业务状态与 Provider 技术状态分离

---

## 🎯 新状态设计

### TaskStatus（任务级状态）

```prisma
enum TaskStatus {
  // === 图片生成阶段 ===
  IMAGE_PENDING      // 图片生成：等待开始（队列中）
  IMAGE_GENERATING   // 图片生成：生成中
  IMAGE_COMPLETED    // 图片生成：已完成，等待用户选择

  // === 3D模型生成阶段 ===
  MODEL_PENDING      // 模型生成：等待开始（用户已选图片）
  MODEL_GENERATING   // 模型生成：生成中
  MODEL_COMPLETED    // 模型生成：已完成

  // === 终态 ===
  FAILED             // 失败（通过 errorMessage 判断在哪个阶段失败）
  CANCELLED          // 用户取消
}
```

**改进点**：
- ✅ `IMAGE_` 前缀明确表示图片生成阶段
- ✅ `MODEL_` 前缀明确表示模型生成阶段
- ✅ `PENDING` 拆分为 `IMAGE_PENDING` 和 `MODEL_PENDING`
- ✅ 统一命名风格：`名词_动词ing`（IMAGE_GENERATING, MODEL_GENERATING）
- ✅ 去除 `GENERATING_MODEL` 的歧义，改为 `MODEL_PENDING`（触发）+ `MODEL_GENERATING`（执行）

### ModelStatus（模型级状态）

```prisma
enum ModelStatus {
  PENDING      // 等待处理（对应 Provider 的 WAIT）
  GENERATING   // 生成中（对应 Provider 的 RUN）
  COMPLETED    // 完成（对应 Provider 的 DONE）
  FAILED       // 失败（对应 Provider 的 FAIL）
}
```

**设计理由**：
- ✅ 与 Provider 接口的 `ModelTaskStatus = "WAIT" | "RUN" | "DONE" | "FAIL"` 一一对应
- ✅ 保持简洁，只有 4 个状态
- ✅ 使用业务语义（PENDING/GENERATING），而不是技术术语（WAIT/RUN）

---

## 📋 状态流转图

### 完整流程

```
用户输入提示词 → 点击"重新再生"
    ↓
[IMAGE_PENDING]  ← API 创建任务
    ↓ (Worker 监听)
[IMAGE_GENERATING]  ← Worker 开始生成图片
    ↓ (生成 4 张图片)
[IMAGE_COMPLETED]  ← 图片就绪，等待用户选择
    ↓ (用户选择图片 → 点击"生成3D模型")
[MODEL_PENDING]  ← API 更新任务状态
    ↓ (Worker 监听)
[MODEL_GENERATING] + ModelStatus: PENDING
    ↓ (Worker 提交到 Provider)
[MODEL_GENERATING] + ModelStatus: GENERATING
    ↓ (Provider 处理完成)
[MODEL_COMPLETED] + ModelStatus: COMPLETED
    ↓
任务完成 ✅

错误分支：
  IMAGE_GENERATING → [FAILED] (errorMessage: "图片生成失败：...")
  MODEL_GENERATING → [FAILED] (errorMessage: "模型生成失败：...")
```

---

## 🎨 前端 UI 映射表

### 图片生成阶段

| TaskStatus | 前端 UI | 按钮状态 | 用户提示 |
|-----------|--------|---------|---------|
| `IMAGE_PENDING` | 骨架屏 + 动画 | 禁用"生成3D模型" | "任务队列中，等待处理" |
| `IMAGE_GENERATING` | 骨架屏 + "AI正在创作 X/4" | 禁用"生成3D模型" | "正在生成 2/4 张图片" |
| `IMAGE_COMPLETED` | 显示 4 张图片，可点击选择 | 启用"生成3D模型" | "选择一张图片生成3D模型" |

### 模型生成阶段

| TaskStatus | ModelStatus | 前端 UI | 按钮状态 | 进度显示 |
|-----------|------------|--------|---------|---------|
| `MODEL_PENDING` | `PENDING` | 加载动画 | 禁用 | "准备生成模型..." |
| `MODEL_GENERATING` | `PENDING` | 进度条 0% | 禁用 | "等待处理 0%" |
| `MODEL_GENERATING` | `GENERATING` | 进度条 0-100% | 禁用 | "生成中 50%" |
| `MODEL_COMPLETED` | `COMPLETED` | 3D 查看器 | 启用"下载模型" | "100%" |

### 失败处理

| TaskStatus | errorMessage 包含 | 前端 UI | 重试按钮文案 |
|-----------|------------------|--------|-----------|
| `FAILED` | "图片生成" 或 "IMAGE" | "图片生成失败：XXX" | "重新生成图片" |
| `FAILED` | "模型生成" 或 "MODEL" | "模型生成失败：XXX" | "重新生成3D模型" |

---

## 🔄 Provider 状态映射

### 技术状态 → 业务状态

在 Worker 层添加映射逻辑：

```typescript
// lib/workers/model3d-worker.ts

import type { ModelTaskStatus } from "@/lib/providers/model3d";
import type { ModelStatus } from "@prisma/client";

/**
 * 将 Provider 的技术状态映射为业务状态
 */
const PROVIDER_STATUS_MAP: Record<ModelTaskStatus, ModelStatus> = {
  WAIT: "PENDING",      // Provider: 等待处理 → 业务: 等待中
  RUN: "GENERATING",    // Provider: 运行中 → 业务: 生成中
  DONE: "COMPLETED",    // Provider: 完成 → 业务: 已完成
  FAIL: "FAILED"        // Provider: 失败 → 业务: 失败
};

/**
 * 映射 Provider 状态
 */
function mapProviderStatus(providerStatus: ModelTaskStatus): ModelStatus {
  return PROVIDER_STATUS_MAP[providerStatus];
}
```

**设计优势**：
- ✅ **技术与业务分离**：Provider 返回技术状态，数据库存储业务状态
- ✅ **易于扩展**：未来切换 Provider 只需修改映射逻辑
- ✅ **语义友好**：前端看到的是 PENDING/GENERATING，不是 WAIT/RUN

---

## 📝 代码改动清单

### 1. 数据库 Schema

**文件**：`prisma/schema.prisma`

**改动内容**：

```prisma
// 枚举: 任务状态
enum TaskStatus {
  // 图片生成阶段
  IMAGE_PENDING      // 图片生成：等待开始
  IMAGE_GENERATING   // 图片生成：生成中
  IMAGE_COMPLETED    // 图片生成：已完成

  // 模型生成阶段
  MODEL_PENDING      // 模型生成：等待开始
  MODEL_GENERATING   // 模型生成：生成中
  MODEL_COMPLETED    // 模型生成：已完成

  // 终态
  FAILED             // 任务失败
  CANCELLED          // 用户取消
}

// 枚举: 3D模型状态
enum ModelStatus {
  PENDING      // 等待生成
  GENERATING   // 生成中
  COMPLETED    // 生成完成
  FAILED       // 生成失败
}
```

**迁移策略**：
- 由于数据可以丢失，直接删除旧数据库，重新生成

---

### 2. 类型定义

**文件**：`types/index.ts`

**改动内容**：
```typescript
// 无需改动，Prisma 会自动生成新的枚举类型
export { ModelStatus, TaskStatus } from "@prisma/client";
```

---

### 3. Worker 层

**文件**：`lib/workers/model3d-worker.ts`

**改动内容**：

#### 3.1 监听状态改为 MODEL_PENDING

```typescript
// 旧代码
const tasks = await prisma.task.findMany({
  where: { status: "GENERATING_MODEL" }
});

// 新代码
const tasks = await prisma.task.findMany({
  where: { status: "MODEL_PENDING" }
});
```

#### 3.2 添加状态映射逻辑

```typescript
import type { ModelTaskStatus } from "@/lib/providers/model3d";
import type { ModelStatus } from "@prisma/client";

/**
 * 将 Provider 的技术状态映射为业务状态
 */
const PROVIDER_STATUS_MAP: Record<ModelTaskStatus, ModelStatus> = {
  WAIT: "PENDING",
  RUN: "GENERATING",
  DONE: "COMPLETED",
  FAIL: "FAILED"
};
```

#### 3.3 更新 processTask 函数

```typescript
async function processTask(taskId: string): Promise<void> {
  // ...

  // 验证任务状态（必须是 MODEL_PENDING）
  if (task.status !== "MODEL_PENDING") {
    log.warn("processTask", "任务状态已变化，跳过处理", {
      taskId,
      currentStatus: task.status,
    });
    return;
  }

  // 更新任务状态为 MODEL_GENERATING
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "MODEL_GENERATING",
      modelGenerationStartedAt: new Date()
    }
  });

  // 创建 TaskModel 记录（PENDING 状态）
  await prisma.taskModel.create({
    data: {
      taskId,
      name: `${task.prompt.slice(0, 30)} - 3D模型`,
      status: "PENDING",
      progress: 0,
      apiTaskId: tencentResponse.jobId,
      apiRequestId: tencentResponse.requestId,
    }
  });

  // ...
}
```

#### 3.4 更新轮询逻辑

```typescript
async function pollModel3DStatus(taskId: string, jobId: string): Promise<void> {
  // ...

  // 查询 Provider 状态
  const providerStatus = await model3DProvider.queryModelTaskStatus(jobId);

  // 映射为业务状态
  const businessStatus = PROVIDER_STATUS_MAP[providerStatus.status];

  // 计算进度
  let progress = 0;
  if (providerStatus.status === "WAIT") progress = 0;
  else if (providerStatus.status === "RUN") progress = 50;
  else if (providerStatus.status === "DONE") progress = 100;

  // 更新本地模型状态
  await prisma.taskModel.update({
    where: { taskId },
    data: {
      status: businessStatus,
      progress
    }
  });

  // 处理完成状态
  if (providerStatus.status === "DONE") {
    // 更新任务状态为 MODEL_COMPLETED
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "MODEL_COMPLETED",
        modelGenerationCompletedAt: new Date(),
        completedAt: new Date(),
      }
    });
    return;
  }

  // 处理失败状态
  if (providerStatus.status === "FAIL") {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: `模型生成失败：${providerStatus.errorMessage || "未知错误"}`,
      }
    });
    throw new Error(providerStatus.errorMessage || "模型生成失败");
  }

  // ...
}
```

---

### 4. Service 层

**文件**：`lib/services/task-service.ts`

**改动内容**：

#### 4.1 createTask 函数

```typescript
// 旧代码
const task = await prisma.task.create({
  data: {
    userId,
    prompt: trimmedPrompt,
    status: "PENDING",
  }
});

// 新代码
const task = await prisma.task.create({
  data: {
    userId,
    prompt: trimmedPrompt,
    status: "IMAGE_PENDING",  // ← 明确是图片等待
  }
});
```

#### 4.2 createTaskWithStatus 函数

```typescript
// 旧代码
export async function createTaskWithStatus(
  userId: string,
  prompt: string,
  status: TaskStatus,
) {
  // ...
}

// 新代码（保持不变，但注意调用方传入的是新状态）
export async function createTaskWithStatus(
  userId: string,
  prompt: string,
  status: TaskStatus,  // 现在可以是 IMAGE_PENDING, IMAGE_GENERATING 等
) {
  // ...
}
```

#### 4.3 cancelTask 函数

```typescript
// 旧代码
const cancellableStatuses: TaskStatus[] = ["PENDING", "GENERATING_IMAGES"];

// 新代码
const cancellableStatuses: TaskStatus[] = [
  "IMAGE_PENDING",
  "IMAGE_GENERATING",
  "MODEL_PENDING",
  "MODEL_GENERATING"
];
```

#### 4.4 retryImageGeneration 函数

```typescript
// 重置任务状态为 IMAGE_PENDING
const resetTask = await tx.task.update({
  where: { id: taskId },
  data: {
    status: "IMAGE_PENDING",  // ← 改为 IMAGE_PENDING
    // ...
  }
});
```

#### 4.5 retryModelGeneration 函数

```typescript
// 重置任务状态为 MODEL_PENDING（而不是 IMAGES_READY）
const resetTask = await tx.task.update({
  where: { id: taskId },
  data: {
    status: "MODEL_PENDING",  // ← 改为 MODEL_PENDING
    // ...
  }
});
```

---

### 5. API 路由

#### 5.1 POST /api/tasks

**文件**：`app/api/tasks/route.ts`

**改动内容**：

```typescript
// 旧代码
const task = await TaskService.createTaskWithStatus(
  MOCK_USER.id,
  prompt,
  "GENERATING_IMAGES",
);

// 新代码
const task = await TaskService.createTaskWithStatus(
  MOCK_USER.id,
  prompt,
  "IMAGE_GENERATING",  // ← 改为 IMAGE_GENERATING
);
```

#### 5.2 PATCH /api/tasks/[id]

**文件**：`app/api/tasks/[id]/route.ts`

**改动内容**：

```typescript
// 当用户选择图片并点击"生成3D模型"时
export const PATCH = withErrorHandler(async (request: NextRequest, { params }) => {
  const { id } = await params;
  const body = await request.json();

  // 验证输入
  const { selectedImageIndex } = updateTaskSchema.parse(body);

  // 更新任务：保存选中图片索引，并设置状态为 MODEL_PENDING
  const task = await TaskService.updateTask(id, {
    selectedImageIndex,
    status: "MODEL_PENDING",  // ← 触发 Worker 监听
  });

  return NextResponse.json({
    success: true,
    data: task,
    message: "3D模型生成已启动"
  });
});
```

---

### 6. 前端组件

#### 6.1 ImageGrid.tsx

**文件**：`app/workspace/components/ImageGrid.tsx`

**改动内容**：

```typescript
// 根据任务状态设置组件状态
useEffect(() => {
  if (task?.images && task.images.length > 0) {
    // ... 初始化图片槽位

    // 旧代码
    if (task.status === "IMAGES_READY") {
      setStatus("completed");
    } else if (task.status === "GENERATING_IMAGES") {
      setStatus("generating");
    }

    // 新代码
    if (task.status === "IMAGE_COMPLETED") {
      setStatus("completed");
    } else if (task.status === "IMAGE_GENERATING") {
      setStatus("generating");
    }

    // ...
  } else if (task?.status === "IMAGE_PENDING") {
    // 如果任务在队列中，设置状态为生成中
    setStatus("generating");
  }
}, [task]);

// 显示提示文案
{task?.status === "IMAGE_PENDING" ? (
  <p className="text-xs text-white/60">
    任务队列中，等待处理，预计需要 10-30 秒
  </p>
) : task?.status === "IMAGE_GENERATING" ? (
  <p className="text-xs text-white/60">
    正在生成 {imageSlots.filter(s => s.status === "completed").length}/4 张图片
  </p>
) : null}
```

#### 6.2 ModelPreview.tsx

**文件**：`app/workspace/components/ModelPreview.tsx`

**改动内容**：

```typescript
// 当任务状态或模型数据改变时更新 UI
useEffect(() => {
  // 旧代码
  if (task?.status === "COMPLETED" && task.model) {
    setStatus("completed");
    setProgress(task.model.progress || 100);
    return;
  }

  if (task?.status === "GENERATING_MODEL" && task.model) {
    setStatus("generating");
    setProgress(task.model.progress || 0);
    return;
  }

  if (task?.status === "FAILED") {
    setStatus("failed");
    return;
  }

  if (
    task?.status === "IMAGES_READY" ||
    task?.status === "PENDING" ||
    task?.status === "GENERATING_IMAGES"
  ) {
    setStatus("idle");
    setProgress(0);
  }

  // 新代码
  if (task?.status === "MODEL_COMPLETED" && task.model) {
    setStatus("completed");
    setProgress(task.model.progress || 100);
    return;
  }

  if (
    (task?.status === "MODEL_PENDING" || task?.status === "MODEL_GENERATING")
    && task.model
  ) {
    setStatus("generating");
    setProgress(task.model.progress || 0);
    return;
  }

  if (task?.status === "FAILED") {
    setStatus("failed");
    return;
  }

  if (
    task?.status === "IMAGE_COMPLETED" ||
    task?.status === "IMAGE_PENDING" ||
    task?.status === "IMAGE_GENERATING"
  ) {
    setStatus("idle");
    setProgress(0);
  }
}, [task?.status, task?.model?.progress, task?.model?.status]);

// 显示更详细的提示
{status === "generating" && (
  <p className="text-sm font-medium text-foreground-muted">
    {task?.model?.status === "PENDING"
      ? "等待处理..."
      : "正在生成3D模型..."}
  </p>
)}
```

---

### 7. 文档更新

#### 7.1 CLAUDE.md

**文件**：`CLAUDE.md`

**改动内容**：更新"核心架构"章节的状态枚举说明

```markdown
### 状态管理

#### 任务状态枚举
```prisma
enum TaskStatus {
  // 图片生成阶段
  IMAGE_PENDING      // 图片生成：等待开始
  IMAGE_GENERATING   // 图片生成：生成中
  IMAGE_COMPLETED    // 图片生成：已完成

  // 模型生成阶段
  MODEL_PENDING      // 模型生成：等待开始
  MODEL_GENERATING   // 模型生成：生成中
  MODEL_COMPLETED    // 模型生成：已完成

  // 终态
  FAILED             // 任务失败
  CANCELLED          // 用户取消
}
```

**状态设计原则**：
- 明确区分图片和模型两个生成阶段
- 统一命名风格（IMAGE_*, MODEL_*）
- 语义清晰，前端易于判断 UI 状态
```

#### 7.2 TASK_LOGIC_FLOW.md

**文件**：`docs/TASK_LOGIC_FLOW.md`

**改动内容**：更新所有状态流转图和代码示例

```markdown
## 完整任务处理流程

### 阶段 1: 创建任务

```
用户输入 prompt → POST /api/tasks
  ↓
创建任务: status = IMAGE_PENDING  ← 图片等待生成
```

### 阶段 2: 图片生成

```
Worker 监听 IMAGE_PENDING
  ↓
更新状态: IMAGE_GENERATING  ← 开始生成
  ↓
逐张保存图片 (1/4 → 4/4)
  ↓
更新状态: IMAGE_COMPLETED  ← 图片就绪
```

### 阶段 3: 用户选择图片

```
用户选择图片 → 点击"生成3D模型"
  ↓
PATCH /api/tasks/{id}
  ↓
更新状态: MODEL_PENDING  ← 触发3D生成
```

### 阶段 4: 模型生成

```
Worker 监听 MODEL_PENDING
  ↓
更新状态: MODEL_GENERATING
创建模型记录: ModelStatus = PENDING
  ↓
提交到 Provider (腾讯云/Mock)
  ↓
轮询 Provider 状态:
  WAIT → ModelStatus: PENDING (0%)
  RUN → ModelStatus: GENERATING (50%)
  DONE → ModelStatus: COMPLETED (100%)
  ↓
更新状态: MODEL_COMPLETED  ← 任务完成
```
```

---

## 🔧 执行步骤

### Step 1: 创建重构文档 ✅
- [x] 创建 `docs/REFACTOR_TASK_STATUS.md`（本文档）

### Step 2: 更新数据库 Schema
```bash
# 1. 更新 prisma/schema.prisma（手动编辑）
# 2. 删除旧数据库（数据可丢失）
rm prisma/dev.db

# 3. 生成新的 Prisma Client
npx prisma generate

# 4. 应用数据库迁移（创建新表）
npx prisma db push

# 5. （可选）查看数据库
npx prisma studio
```

### Step 3: 更新后端代码
- Worker 层：`lib/workers/model3d-worker.ts`
- Service 层：`lib/services/task-service.ts`
- API 路由：`app/api/tasks/**/*.ts`

### Step 4: 更新前端代码
- `app/workspace/components/ImageGrid.tsx`
- `app/workspace/components/ModelPreview.tsx`

### Step 5: 更新文档
- `CLAUDE.md`
- `docs/TASK_LOGIC_FLOW.md`

### Step 6: 测试验证
- [ ] 创建新任务 → 图片生成
- [ ] 选择图片 → 3D 模型生成
- [ ] 测试失败重试
- [ ] 测试取消任务

---

## ✅ 验收标准

### 功能验收
- [ ] 用户可以正常创建任务并生成图片
- [ ] 用户可以选择图片并生成3D模型
- [ ] 失败任务可以正确重试
- [ ] 取消任务功能正常

### 代码验收
- [ ] 所有状态命名清晰，无歧义
- [ ] 前端 UI 正确响应每个状态
- [ ] Worker 正确监听和处理状态变更
- [ ] 没有遗留旧状态的代码

### 文档验收
- [ ] CLAUDE.md 已更新
- [ ] TASK_LOGIC_FLOW.md 已更新
- [ ] 本重构文档完整记录所有改动

---

## 📊 状态对比总结

### TaskStatus 对比

| 旧状态 | 新状态 | 说明 |
|-------|-------|------|
| `PENDING` | `IMAGE_PENDING` | 明确是图片等待 |
| `GENERATING_IMAGES` | `IMAGE_GENERATING` | 统一命名风格 |
| `IMAGES_READY` | `IMAGE_COMPLETED` | 更准确的语义 |
| 无 | `MODEL_PENDING` | 新增：触发信号 |
| `GENERATING_MODEL` | `MODEL_GENERATING` | 明确是执行状态 |
| `COMPLETED` | `MODEL_COMPLETED` | 明确是模型完成 |
| `FAILED` | `FAILED` | 无变化 |
| `CANCELLED` | `CANCELLED` | 无变化 |

### ModelStatus 对比

| 旧状态 | 新状态 | Provider 状态 | 说明 |
|-------|-------|--------------|------|
| `PENDING` | `PENDING` | `WAIT` | 无变化 |
| `GENERATING` | `GENERATING` | `RUN` | 无变化 |
| `COMPLETED` | `COMPLETED` | `DONE` | 无变化 |
| `FAILED` | `FAILED` | `FAIL` | 无变化 |

---

## 🎉 预期效果

### 1. 前端开发体验提升

**旧代码**（需要复杂判断）：
```typescript
if (task.status === "PENDING" || task.status === "GENERATING_IMAGES") {
  // 显示图片生成 UI？还是模型生成 UI？不确定
}
```

**新代码**（一目了然）：
```typescript
if (task.status === "IMAGE_PENDING" || task.status === "IMAGE_GENERATING") {
  // 显示图片生成骨架屏
} else if (task.status === "MODEL_PENDING" || task.status === "MODEL_GENERATING") {
  // 显示模型生成进度条
}
```

### 2. 后端代码可读性提升

**旧代码**（歧义）：
```typescript
// GENERATING_MODEL 是信号还是状态？
const tasks = await prisma.task.findMany({
  where: { status: "GENERATING_MODEL" }
});
```

**新代码**（明确）：
```typescript
// MODEL_PENDING 明确是触发信号
const tasks = await prisma.task.findMany({
  where: { status: "MODEL_PENDING" }
});

// 开始处理后立即更新为 MODEL_GENERATING
await prisma.task.update({
  where: { id: taskId },
  data: { status: "MODEL_GENERATING" }
});
```

### 3. 文档和注释更清晰

**旧注释**：
```typescript
// 任务已创建，等待开始生成图片
status: "PENDING"
```

**新注释**（无需注释，自解释）：
```typescript
status: "IMAGE_PENDING"  // 状态名本身就说明了一切
```

---

## 🚀 后续优化方向

1. **添加更多阶段**：如果未来增加"图片编辑"阶段，只需添加 `IMAGE_EDITING` 状态
2. **WebSocket 推送**：替代轮询，实时推送状态变化给前端
3. **状态机验证**：使用 XState 等状态机库，确保状态流转合法
4. **监控告警**：记录每个状态的停留时间，发现异常卡顿

---

**文档版本**：v1.0
**维护者**：AI Assistant + 姚兔兔
**最后更新**：2025-10-14
