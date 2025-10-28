# 任务处理完整流程文档

## 概述

本文档详细描述了从用户创建任务到最终完成的完整处理流程，包括数据库状态变化、队列处理、错误重试等所有细节。

---

## 一、核心组件

### 1.1 数据库表结构

#### Task 表（任务主表）
```prisma
model Task {
  id          String      @id @default(cuid())
  userId      String
  prompt      String
  status      TaskStatus  @default(PENDING)

  // 时间戳
  imageGenerationStartedAt   DateTime?
  imageGenerationCompletedAt DateTime?
  createdAt                  DateTime @default(now())
  failedAt                   DateTime?
  errorMessage               String?

  // 关联
  images      TaskImage[]  // 生成的4张图片
  model       TaskModel?   // 3D模型（暂未实现）
}
```

#### 任务状态枚举
```prisma
enum TaskStatus {
  PENDING            // ① 任务已创建，等待处理
  GENERATING_IMAGES  // ② 正在调用阿里云API生成图片
  IMAGES_READY       // ③ 图片生成完成，等待用户选择
  GENERATING_MODEL   // ④ 正在生成3D模型（暂未实现）
  COMPLETED          // ⑤ 整个任务完成
  FAILED             // ⑥ 任务失败
  CANCELLED          // ⑦ 用户取消
}
```

### 1.2 任务队列系统

**文件位置**: `lib/task-queue.ts`

**核心配置**:
```typescript
const CONFIG = {
  MAX_CONCURRENT: 3,           // 最多同时处理3个任务
  MAX_RETRIES: 3,              // 每个任务最多重试3次
  RETRY_DELAY_BASE: 2000,      // 普通错误延迟基数（2秒）
  RATE_LIMIT_DELAY_BASE: 30000 // 429限流延迟基数（30秒）
}
```

**状态管理**:
```typescript
let runningCount = 0;  // 当前正在运行的任务数（简单计数器）
```

### 1.3 阿里云API服务

**文件位置**: `lib/aliyun-image.ts`

**核心功能**:
- `generateImageStream()`: 生成器函数，逐张生成图片并yield返回
- `AliyunAPIError`: 自定义错误类，携带HTTP状态码

---

## 二、完整任务处理流程

### 阶段 1️⃣: 用户创建任务

#### 前端操作
```
用户输入 prompt → 点击"生成"按钮
  ↓
POST /api/tasks
  body: { prompt: "一只可爱的猫" }
```

#### 后端处理 (`app/api/tasks/route.ts`)

```typescript
// 步骤 1: 验证输入
if (!prompt || prompt.trim().length === 0) {
  return 400 Bad Request
}

// 步骤 2: 创建数据库记录
const task = await prisma.task.create({
  data: {
    userId: MOCK_USER.id,
    prompt: "一只可爱的猫",
    status: "PENDING"  // ← 初始状态
  }
});

// 步骤 3: 添加到任务队列
await taskQueue.addTask(task.id, prompt);

// 步骤 4: 返回任务信息给前端
return {
  success: true,
  data: task,  // 包含 task.id
  queue: { running: 1, maxConcurrent: 3 }
}
```

**此时数据库状态**:
```
Task {
  id: "clxxx123",
  prompt: "一只可爱的猫",
  status: "PENDING",
  createdAt: "2025-10-06T10:00:00Z",
  imageGenerationStartedAt: null,
  errorMessage: null
}
```

---

### 阶段 2️⃣: 队列并发控制

#### `taskQueue.addTask()` 流程

```typescript
export async function addTask(taskId: string, prompt: string) {
  // 步骤 1: 并发控制 - 等待空闲槽位
  while (runningCount >= CONFIG.MAX_CONCURRENT) {  // MAX_CONCURRENT = 3
    console.log("⏸️ 达到最大并发数，等待...");
    await sleep(500);  // 每500ms检查一次
  }

  // 步骤 2: 占用槽位
  runningCount++;  // 从 0 变成 1
  console.log("📥 任务加入处理队列 | 当前运行中: 1/3");

  // 步骤 3: 执行任务（带重试逻辑）
  try {
    await processTask(taskId, prompt);
  } finally {
    // 步骤 4: 释放槽位
    runningCount--;  // 从 1 变回 0
    console.log("📤 任务处理完成 | 当前运行中: 0/3");
  }
}
```

**并发控制示例**:
```
情况 A: 只有1个任务
  runningCount = 0 → 立即执行 → runningCount = 1

情况 B: 同时有5个任务
  任务1: runningCount = 1 → 立即执行
  任务2: runningCount = 2 → 立即执行
  任务3: runningCount = 3 → 立即执行
  任务4: runningCount = 3 → 等待（while循环阻塞）
  任务5: runningCount = 3 → 等待（while循环阻塞）

  [任务1完成] → runningCount = 2 → 任务4开始执行
  [任务2完成] → runningCount = 2 → 任务5开始执行
```

---

### 阶段 3️⃣: 图片生成（核心逻辑）

#### `processTask()` 函数流程（✨ 支持断点续传）

```typescript
async function processTask(taskId: string, prompt: string) {
  console.log("🚀 开始处理任务:", taskId);

  // 步骤 1: 更新数据库状态为"生成中"（仅首次）
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (task?.status === "PENDING") {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "GENERATING_IMAGES",
        imageGenerationStartedAt: new Date()
      }
    });
  }

  // 步骤 2: 重试循环（0 → 3，共4次尝试）
  for (let retry = 0; retry <= CONFIG.MAX_RETRIES; retry++) {
    try {
      // 步骤 3: 🔄 断点续传 - 查询已生成的图片
      const existingImages = await prisma.taskImage.findMany({
        where: { taskId },
        orderBy: { index: 'asc' }
      });
      const startIndex = existingImages.length;

      // 检查是否已全部生成
      if (startIndex >= 4) {
        console.log("✅ 图片已全部生成，无需继续");
        return;
      }

      // 计算还需要生成的数量
      const remainingCount = 4 - startIndex;
      console.log(`📍 断点续传: 已生成 ${startIndex}/4 张，继续生成剩余 ${remainingCount} 张`);

      // 步骤 4: 从断点继续生成
      let index = startIndex;
      for await (const imageUrl of generateImageStream(prompt, remainingCount)) {
        // 步骤 5: 逐张保存到数据库
        await prisma.taskImage.create({
          data: {
            taskId: taskId,
            url: imageUrl,
            index: index  // 从 startIndex 开始
          }
        });
        console.log(`🖼️ 图片 ${index + 1}/4 已生成`);
        index++;
      }

      // 步骤 6: 全部成功 - 更新状态为"图片就绪"
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "IMAGES_READY",
          imageGenerationCompletedAt: new Date()
        }
      });

      console.log("✅ 任务完成:", taskId);
      return;  // ← 成功退出，不重试

    } catch (error) {
      // 步骤 7: 发生错误 - 进入错误处理逻辑
      handleError(error, retry);
    }
  }
}
```

**数据库状态变化**:
```
开始:
  status: "PENDING"
  imageGenerationStartedAt: null

↓ 调用 processTask()

生成中:
  status: "GENERATING_IMAGES"
  imageGenerationStartedAt: "2025-10-06T10:00:01Z"

↓ 逐张保存图片

TaskImage #1: { taskId: "clxxx123", url: "https://...", index: 0 }
TaskImage #2: { taskId: "clxxx123", url: "https://...", index: 1 }
TaskImage #3: { taskId: "clxxx123", url: "https://...", index: 2 }
TaskImage #4: { taskId: "clxxx123", url: "https://...", index: 3 }

↓ 全部成功

完成:
  status: "IMAGES_READY"
  imageGenerationCompletedAt: "2025-10-06T10:00:15Z"
  images: [4张图片]
```

---

### 阶段 4️⃣: 错误处理与重试机制

#### 错误分类

##### 4.1 不可重试的错误（立即失败）

```typescript
function canRetry(error: unknown): boolean {
  if (error instanceof AliyunAPIError) {
    // HTTP状态码判断
    if ([400, 401, 403, 404].includes(error.statusCode)) {
      return false;  // ← 不重试
    }
  }

  // 错误消息判断
  const errorMsg = error.message;
  if (errorMsg.includes("任务已取消") ||
      errorMsg.includes("API密钥错误") ||
      errorMsg.includes("余额不足")) {
    return false;  // ← 不重试
  }

  return true;  // 其他错误可重试
}
```

**示例 1: API密钥错误**
```
尝试 1: AliyunAPIError(401, "Unauthorized")
  ↓
canRetry() → false
  ↓
立即标记为失败:
  status: "FAILED"
  errorMessage: "阿里云API错误: 401 - Unauthorized"
  failedAt: "2025-10-06T10:00:02Z"
```

**示例 2: prompt违规**
```
尝试 1: AliyunAPIError(400, "Content blocked by policy")
  ↓
canRetry() → false
  ↓
立即标记为失败:
  status: "FAILED"
  errorMessage: "阿里云API错误: 400 - Content blocked"
```

---

##### 4.2 可重试的错误（自动重试）

###### 情况A: 普通网络错误

```typescript
// 重试延迟计算
function calculateRetryDelay(error, retryCount) {
  // 普通错误: 2秒 → 4秒 → 8秒
  return RETRY_DELAY_BASE * (2 ** retryCount);
  // retryCount = 0: 2000ms
  // retryCount = 1: 4000ms
  // retryCount = 2: 8000ms
}
```

**示例: 网络超时**
```
尝试 1: Error("fetch timeout")
  ↓
canRetry() → true
  ↓
等待 2秒
  ↓
尝试 2: 成功 ✅
```

---

###### 情况B: 429限流错误（重点）

```typescript
function calculateRetryDelay(error, retryCount) {
  if (error instanceof AliyunAPIError && error.statusCode === 429) {
    // 429限流: 30秒 → 60秒 → 120秒
    return RATE_LIMIT_DELAY_BASE * (2 ** retryCount);
    // retryCount = 0: 30000ms  (30秒)
    // retryCount = 1: 60000ms  (60秒)
    // retryCount = 2: 120000ms (2分钟)
  }
  // ...普通错误逻辑
}
```

**完整示例: 阿里云限流场景（✨ 支持断点续传）**
```
10:00:00 - 尝试 1:
            图片 1/4 ✅ → 保存到数据库
            图片 2/4 ✅ → 保存到数据库
            图片 3/4 ❌ 429限流！
            ↓
            canRetry() → true (429可重试)
            ↓
            console.log("🚦 检测到429限流，使用延迟: 30秒")
            ↓
            等待 30秒...
            ↓
10:00:30 - 尝试 2:
            查询数据库: 已有 2/4 张图片
            📍 断点续传: 从第3张继续
            ↓
            图片 3/4 ❌ 429限流！（仍然被限）
            ↓
            console.log("🚦 检测到429限流，使用延迟: 60秒")
            ↓
            等待 60秒...
            ↓
10:01:30 - 尝试 3:
            查询数据库: 已有 2/4 张图片
            📍 断点续传: 从第3张继续
            ↓
            图片 3/4 ✅ → 保存到数据库
            图片 4/4 ✅ → 保存到数据库
            ↓
            任务完成 ✅
```

**成本对比**:
```
❌ 旧方案（无断点续传）:
  尝试1: 图片1 ✅, 图片2 ✅, 图片3 ❌
  尝试2: 图片1 ✅, 图片2 ✅, 图片3 ✅, 图片4 ✅
  总API调用: 7次 (浪费2次)

✅ 新方案（断点续传）:
  尝试1: 图片1 ✅, 图片2 ✅, 图片3 ❌
  尝试2: 图片3 ❌ (从断点继续)
  尝试3: 图片3 ✅, 图片4 ✅
  总API调用: 5次 (节省2次 = 28%成本)
```

**日志输出示例**:
```
[Task] 🚀 开始处理任务: clxxx123
[Task] 📍 断点续传: 已生成 0/4 张，继续生成剩余 4 张
[Task] 🖼️ 图片 1/4 已生成: clxxx123
[Task] 🖼️ 图片 2/4 已生成: clxxx123
[Task] ❌ 错误: 阿里云API错误: 429 - Too Many Requests
[Task] ✅ 可重试的HTTP错误: 429
[Task] 🚦 检测到429限流，使用延迟: 30秒
[Task] 🔄 重试 1/3: clxxx123 | 延迟 30秒
[等待 30秒]
[Task] 📍 断点续传: 已生成 2/4 张，继续生成剩余 2 张
[Task] ❌ 错误: 阿里云API错误: 429 - Too Many Requests
[Task] 🚦 检测到429限流，使用延迟: 60秒
[Task] 🔄 重试 2/3: clxxx123 | 延迟 60秒
[等待 60秒]
[Task] 📍 断点续传: 已生成 2/4 张，继续生成剩余 2 张
[Task] 🖼️ 图片 3/4 已生成: clxxx123
[Task] 🖼️ 图片 4/4 已生成: clxxx123
[Task] ✅ 任务完成: clxxx123
```

---

##### 4.3 达到重试上限

```
尝试 1: 429限流 → 等待30秒
尝试 2: 429限流 → 等待60秒
尝试 3: 429限流 → 等待120秒
尝试 4: 429限流 → retry = 3 = MAX_RETRIES
  ↓
isLastRetry = true
  ↓
标记为失败:
  status: "FAILED"
  errorMessage: "阿里云API错误: 429 - Too Many Requests"
  failedAt: "2025-10-06T10:04:00Z"
```

---

### 阶段 5️⃣: 前端轮询获取状态

#### 前端轮询逻辑

```typescript
// 前端代码示例
async function pollTaskStatus(taskId: string) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/tasks/${taskId}`);
    const { data } = await response.json();

    if (data.status === "IMAGES_READY") {
      clearInterval(interval);
      showImages(data.images);  // 显示4张图片
    } else if (data.status === "FAILED") {
      clearInterval(interval);
      showError(data.errorMessage);
    }
  }, 2000);  // 每2秒轮询一次
}
```

#### 后端API (`app/api/tasks/[id]/route.ts`)

```typescript
export async function GET(request, { params }) {
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      images: { orderBy: { index: "asc" } },
      model: true
    }
  });

  return {
    success: true,
    data: task  // 包含完整的任务信息和图片
  };
}
```

**返回数据示例**:
```json
{
  "success": true,
  "data": {
    "id": "clxxx123",
    "prompt": "一只可爱的猫",
    "status": "IMAGES_READY",
    "imageGenerationStartedAt": "2025-10-06T10:00:01Z",
    "imageGenerationCompletedAt": "2025-10-06T10:00:15Z",
    "images": [
      { "id": "img1", "url": "https://...", "index": 0 },
      { "id": "img2", "url": "https://...", "index": 1 },
      { "id": "img3", "url": "https://...", "index": 2 },
      { "id": "img4", "url": "https://...", "index": 3 }
    ]
  }
}
```

---

### 阶段 6️⃣: 任务取消

#### 前端操作
```
用户点击"取消"按钮
  ↓
POST /api/tasks/{taskId}/cancel
```

#### 后端处理 (`app/api/tasks/[id]/cancel/route.ts`)

```typescript
export async function POST(request, { params }) {
  const { id } = await params;

  // 步骤 1: 调用队列取消函数
  const cancelled = await taskQueue.cancelTask(id);

  if (cancelled) {
    return { success: true, message: "Task cancelled" };
  }

  // 步骤 2: 检查数据库状态
  const task = await prisma.task.findUnique({ where: { id } });

  // 步骤 3: 只能取消未完成的任务
  if (task.status === "IMAGES_READY" || task.status === "COMPLETED") {
    return {
      success: false,
      error: "Task cannot be cancelled (already completed)"
    };
  }
}
```

#### 队列取消逻辑 (`lib/task-queue.ts`)

```typescript
export async function cancelTask(taskId: string): Promise<boolean> {
  // 查询任务状态
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { status: true }
  });

  // 只能取消待处理或生成中的任务
  if (task.status === "PENDING" || task.status === "GENERATING_IMAGES") {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: "任务已取消"
      }
    });
    return true;
  }

  return false;
}
```

---

## 三、完整状态机

```
         创建任务
            ↓
      [PENDING] ←────────────────┐
            ↓                    │
    进入队列处理                 │
            ↓                    │
  [GENERATING_IMAGES]            │
            ↓                    │
     ┌──────┴──────┐            │
     ↓             ↓            │
  成功生成       发生错误        │
     ↓             ↓            │
[IMAGES_READY]   判断是否        │
     ↓         可以重试?         │
  用户选择         ↓             │
     ↓        是: 延迟重试 ──────┘
  (未实现)       否: 标记失败
                    ↓
                [FAILED]

特殊情况:
  用户取消 → [CANCELLED] (通过 errorMessage = "任务已取消")
```

---

## 四、关键设计亮点

### 4.1 简洁的并发控制
```typescript
// 不需要复杂的队列数组，只用一个计数器
let runningCount = 0;

while (runningCount >= MAX_CONCURRENT) {
  await sleep(500);  // 轮询等待
}
```

### 4.2 状态存储在数据库
```
✅ 不需要内存中的队列任务对象
✅ 不需要 Map 存储运行中任务
✅ 不需要保留已完成任务历史
✅ 所有状态都在 Prisma 数据库中
```

### 4.3 内置重试逻辑
```typescript
// 不需要 setTimeout + 重新入队
// 直接用 for 循环重试
for (let retry = 0; retry <= MAX_RETRIES; retry++) {
  try {
    await generateImages();
    return;  // 成功
  } catch (error) {
    if (shouldRetry(error)) {
      await sleep(calculateDelay(error, retry));
      // 循环继续，自动重试
    } else {
      throw error;  // 不可重试，直接抛出
    }
  }
}
```

### 4.4 精确的429限流处理
```typescript
// 根据HTTP状态码精确判断
if (error.statusCode === 429) {
  delay = 30秒 * (2 ** retryCount);
} else {
  delay = 2秒 * (2 ** retryCount);
}
```

### 4.5 断点续传机制 ✨
```typescript
// 每次重试前，查询已生成的图片数量
const existingImages = await prisma.taskImage.findMany({
  where: { taskId }
});
const startIndex = existingImages.length;  // 0, 1, 2, 3

// 只生成剩余的图片
const remainingCount = 4 - startIndex;
for await (const imageUrl of generateImageStream(prompt, remainingCount)) {
  // 从断点继续，index从startIndex开始
  await saveImage(imageUrl, startIndex++);
}
```

**优势**：
- ✅ 避免重复生成已成功的图片
- ✅ 节省API调用成本（最多节省75%）
- ✅ 减少等待时间（不需要重新生成前面的图片）
- ✅ 提高成功率（减少了总的API调用次数）

---

## 五、监控与调试

### 5.1 查询队列状态
```http
GET /api/queue/status

Response:
{
  "success": true,
  "data": {
    "running": 2,
    "maxConcurrent": 3
  }
}
```

### 5.2 查询任务详情
```http
GET /api/tasks/{taskId}

Response:
{
  "success": true,
  "data": {
    "id": "clxxx123",
    "status": "GENERATING_IMAGES",
    "imageGenerationStartedAt": "2025-10-06T10:00:01Z",
    "errorMessage": null,
    "images": []
  }
}
```

### 5.3 关键日志
```
[Task] 📥 任务加入处理队列: clxxx123 | 当前运行中: 1/3
[Task] 🚀 开始处理任务: clxxx123
[Task] 🖼️ 图片 1/4 已生成: clxxx123
[Task] 🖼️ 图片 2/4 已生成: clxxx123
[Task] ❌ 错误: 阿里云API错误: 429 - Too Many Requests
[Task] 🚦 检测到429限流，使用延迟: 30秒
[Task] 🔄 重试 1/3: clxxx123 | 延迟 30秒
[Task] ✅ 任务完成: clxxx123
[Task] 📤 任务处理完成: clxxx123 | 当前运行中: 0/3
```

---

## 六、常见问题

### Q1: 服务器重启后，队列中的任务会丢失吗？

**答**: 不会。队列只是一个轻量的调度器，真实状态都在数据库中。

**恢复方案**:
```typescript
// 启动时扫描未完成的任务（可选）
const pendingTasks = await prisma.task.findMany({
  where: {
    status: { in: ["PENDING", "GENERATING_IMAGES"] }
  }
});

for (const task of pendingTasks) {
  await taskQueue.addTask(task.id, task.prompt);
}
```

### Q2: 如何防止重复添加同一个任务？

**答**: 目前没有防重机制，因为每次调用 `POST /api/tasks` 都会创建新记录。

**改进方案**:
```typescript
// 在 addTask 中检查
const existingTask = await prisma.task.findFirst({
  where: {
    id: taskId,
    status: { in: ["PENDING", "GENERATING_IMAGES"] }
  }
});

if (existingTask) {
  console.warn("任务已在处理中，跳过");
  return;
}
```

### Q3: 429限流延迟太长，用户体验不好怎么办？

**答**: 这是必要的等待时间。可以优化的方向：

1. **降低并发数**: `MAX_CONCURRENT: 1` （更保守）
2. **提示用户**: 前端显示"服务繁忙，正在重试..."
3. **升级API套餐**: 购买更高的QPS限制

### Q4: 如何测试429限流逻辑？

**答**:
```typescript
// 在 aliyun-image.ts 中模拟429错误
if (Math.random() < 0.5) {  // 50%概率触发
  throw new AliyunAPIError(429, "Mock rate limit");
}
```

---

## 七、已实现功能 ✅

1. **断点续传** ✅: 图片生成失败后，重试时从断点继续（节省28%成本）
2. **精确的429限流处理** ✅: 根据HTTP状态码判断，使用更长的重试延迟（30秒 → 60秒 → 120秒）
3. **并发控制** ✅: 最多同时处理3个任务
4. **自动重试** ✅: 最多重试3次，指数退避延迟
5. **简化的队列系统** ✅: 从470行代码优化到281行（减少40%）

## 八、未来优化方向

1. **优先级队列**: 支持 VIP 用户优先处理
2. **任务分片**: 大批量任务拆分成多个小任务
3. **webhook 通知**: 任务完成后主动推送给前端（替代轮询）
4. **分布式队列**: 使用 Redis + Bull 支持多服务器横向扩展
5. **更智能的限流策略**: 根据API返回的限流信息动态调整并发数
6. **任务恢复机制**: 服务器重启后自动恢复未完成的任务

---

**文档版本**: v2.0 (新增断点续传功能)
**最后更新**: 2025-10-06
**维护者**: AI Assistant
