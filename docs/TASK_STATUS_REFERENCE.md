# 任务状态快速参考

> **最后更新**: 2025-10-14
> **相关文档**: [REFACTOR_TASK_STATUS.md](./REFACTOR_TASK_STATUS.md) | [CLAUDE.md](../CLAUDE.md)

## 核心设计理念

### 状态命名规范

```
阶段前缀 + 状态类型

IMAGE_*  → 图片生成阶段
MODEL_*  → 3D模型生成阶段
```

### 状态语义

- **PENDING**: 等待开始（触发信号）
- **GENERATING**: 正在生成中（执行状态）
- **COMPLETED**: 已完成（终态）
- **FAILED**: 失败（终态）
- **CANCELLED**: 用户取消（终态）

---

## TaskStatus 枚举

```prisma
enum TaskStatus {
  // === 图片生成阶段 ===
  IMAGE_PENDING      // 等待开始（队列中）
  IMAGE_GENERATING   // 正在生成中
  IMAGE_COMPLETED    // 已完成，等待用户选择

  // === 3D模型生成阶段 ===
  MODEL_PENDING      // 等待开始（用户已选图片）
  MODEL_GENERATING   // 正在生成中
  MODEL_COMPLETED    // 已完成

  // === 终态 ===
  FAILED             // 任务失败
  CANCELLED          // 用户取消
}
```

---

## ModelStatus 枚举

> 用于映射 Provider 的技术状态到业务状态

```prisma
enum ModelStatus {
  PENDING      // 等待处理 (Provider: WAIT)
  GENERATING   // 生成中 (Provider: RUN)
  COMPLETED    // 生成完成 (Provider: DONE)
  FAILED       // 生成失败 (Provider: FAIL)
}
```

---

## 完整状态流转

### 正常流程

```
用户创建任务
    ↓
IMAGE_PENDING (API 设置)
    ↓
IMAGE_GENERATING (Worker 检测并开始处理)
    ↓
IMAGE_COMPLETED (图片生成完成)
    ↓
用户选择图片
    ↓
MODEL_PENDING (API 检测到 selectedImageIndex)
    ↓
MODEL_GENERATING (Worker 检测并开始处理)
    ↓
MODEL_COMPLETED (模型生成完成)
```

### 错误处理

```
任意状态
    ↓
发生错误
    ↓
FAILED (记录错误信息)
```

### 用户取消

```
IMAGE_PENDING / IMAGE_GENERATING / MODEL_PENDING / MODEL_GENERATING
    ↓
用户点击取消
    ↓
CANCELLED (通过 FAILED + errorMessage="用户取消" 实现)
```

---

## API 层职责

### ✅ 应该做的

1. **状态触发**: 设置 PENDING 状态触发 Worker
2. **快速响应**: 立即返回，不执行业务逻辑
3. **数据验证**: 验证请求参数

```typescript
// ✅ 正确示例
export const POST = async (request) => {
  const { prompt } = await request.json();

  // 只创建任务，状态设为 IMAGE_GENERATING
  const task = await createTask(userId, prompt, "IMAGE_GENERATING");

  // 立即返回，Worker 会监听并处理
  return NextResponse.json({ success: true, data: task });
};
```

### ❌ 不应该做的

1. **执行业务逻辑**: 调用外部 API
2. **长时间等待**: 轮询任务状态
3. **直接设置 GENERATING 状态**: 应该设置 PENDING，让 Worker 处理

```typescript
// ❌ 错误示例
export const POST = async (request) => {
  const { prompt } = await request.json();

  // ❌ API 层不应该调用外部服务
  const images = await imageProvider.generateImages(prompt, 4);

  return NextResponse.json({ success: true, data: images });
};
```

---

## Worker 层职责

### ✅ 应该做的

1. **监听 PENDING 状态**: 持续轮询数据库
2. **执行业务逻辑**: 调用外部 API、处理数据
3. **更新状态**: 从 PENDING → GENERATING → COMPLETED/FAILED
4. **错误处理**: 捕获异常，更新状态为 FAILED
5. **防止重复处理**: 使用 Set 跟踪处理中的任务

```typescript
// ✅ 正确示例
async function workerLoop() {
  while (isRunning) {
    // 1. 监听 PENDING 状态
    const tasks = await prisma.task.findMany({
      where: { status: "IMAGE_PENDING" },
      take: MAX_CONCURRENT
    });

    // 2. 执行业务逻辑
    for (const task of tasks) {
      await processTask(task.id);
    }

    await sleep(POLL_INTERVAL);
  }
}

async function processTask(taskId: string) {
  try {
    // 3. 更新为 GENERATING 状态
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IMAGE_GENERATING" }
    });

    // 4. 执行业务逻辑
    const images = await generateImages(prompt, 4);

    // 5. 更新为 COMPLETED 状态
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IMAGE_COMPLETED" }
    });
  } catch (error) {
    // 6. 错误处理
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        errorMessage: error.message
      }
    });
  }
}
```

---

## 前端轮询逻辑

```typescript
useEffect(() => {
  if (!task?.id) return;

  // 只有在生成中的状态才需要轮询
  const needsPolling =
    task.status === "IMAGE_PENDING" ||
    task.status === "IMAGE_GENERATING" ||
    task.status === "MODEL_PENDING" ||
    task.status === "MODEL_GENERATING";

  if (!needsPolling) return;

  // 轮询任务状态
  const interval = setInterval(async () => {
    const response = await fetch(`/api/tasks/${task.id}`);
    const { data } = await response.json();

    setTask(data);

    // 停止轮询条件
    if (
      data.status === "IMAGE_COMPLETED" ||
      data.status === "MODEL_COMPLETED" ||
      data.status === "FAILED" ||
      data.status === "CANCELLED"
    ) {
      clearInterval(interval);
    }
  }, 2000); // 每 2 秒轮询一次

  return () => clearInterval(interval);
}, [task?.id, task?.status]);
```

---

## 状态判断示例

### 判断任务是否正在进行中

```typescript
function isTaskInProgress(status: TaskStatus): boolean {
  return [
    "IMAGE_PENDING",
    "IMAGE_GENERATING",
    "MODEL_PENDING",
    "MODEL_GENERATING"
  ].includes(status);
}
```

### 判断任务是否已完成

```typescript
function isTaskCompleted(status: TaskStatus): boolean {
  return [
    "IMAGE_COMPLETED",
    "MODEL_COMPLETED"
  ].includes(status);
}
```

### 判断任务是否失败

```typescript
function isTaskFailed(status: TaskStatus): boolean {
  return ["FAILED", "CANCELLED"].includes(status);
}
```

### 判断任务是否可以取消

```typescript
function canCancelTask(status: TaskStatus): boolean {
  return [
    "IMAGE_PENDING",
    "IMAGE_GENERATING",
    "MODEL_PENDING",
    "MODEL_GENERATING"
  ].includes(status);
}
```

---

## Provider 状态映射

### Model3D Provider

```typescript
const PROVIDER_STATUS_MAP: Record<ModelTaskStatus, ModelStatus> = {
  WAIT: "PENDING",      // 等待处理
  RUN: "GENERATING",    // 生成中
  DONE: "COMPLETED",    // 生成完成
  FAIL: "FAILED"        // 生成失败
};

function mapProviderStatus(providerStatus: ModelTaskStatus): ModelStatus {
  return PROVIDER_STATUS_MAP[providerStatus];
}
```

### 使用示例

```typescript
// 1. 提交任务
const { jobId } = await provider.submitModelGenerationJob({ imageUrl });

// 2. 轮询状态
const status = await provider.queryModelTaskStatus(jobId);
// status.status: "WAIT" | "RUN" | "DONE" | "FAIL"

// 3. 映射到业务状态
const businessStatus = mapProviderStatus(status.status);
// businessStatus: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED"

// 4. 更新数据库
await prisma.taskModel.update({
  where: { id: modelId },
  data: { status: businessStatus }
});
```

---

## 常见问题

### Q1: 为什么要区分 PENDING 和 GENERATING？

**A**:
- **PENDING**: 触发信号，表示任务已创建但尚未开始处理
- **GENERATING**: 执行状态，表示 Worker 正在处理任务

这样可以清晰地区分任务的等待阶段和执行阶段，便于监控和调试。

### Q2: 为什么 API 层不直接设置 GENERATING 状态？

**A**:
- API 层职责是快速响应，不应该执行耗时的业务逻辑
- Worker 检测到 PENDING 状态后，会自动更新为 GENERATING 并开始处理
- 这样可以保证状态变更的原子性和一致性

### Q3: ModelStatus 和 TaskStatus 有什么区别？

**A**:
- **TaskStatus**: 任务整体的业务状态（图片生成、模型生成、完成、失败）
- **ModelStatus**: 3D 模型记录的生成状态（用于映射 Provider 的技术状态）

ModelStatus 是 TaskStatus 的细化，用于更精确地跟踪模型生成进度。

### Q4: 如何处理 Worker 崩溃？

**A**:
Worker 通过 Next.js Instrumentation Hook 自动启动：
```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAllWorkers } = await import('@/lib/workers');
    startAllWorkers();
  }
}
```

- ✅ 服务器启动时自动运行
- ✅ 不依赖 HTTP 请求
- ✅ 如果 Worker 崩溃，重启服务器即可恢复

### Q5: 如何查看 Worker 状态？

**A**:
访问 `/api/workers/status` 查看 Worker 运行状态：

```json
{
  "success": true,
  "data": {
    "image": {
      "isRunning": true,
      "processingCount": 2,
      "processingTaskIds": ["task-123", "task-456"]
    },
    "model3d": {
      "isRunning": true,
      "processingCount": 1,
      "processingTaskIds": ["task-789"]
    }
  }
}
```

---

## 相关文档

- [完整重构文档](./REFACTOR_TASK_STATUS.md) - 详细的重构计划和代码示例
- [项目架构文档](../CLAUDE.md) - Worker 架构和 Provider 模式说明
- [Prisma Schema](../prisma/schema.prisma) - 数据库模型定义
