# 服务端重构计划

> **分支**: `refactor/database-redesign`
> **创建时间**: 2025-11-21
> **状态**: 进行中

---

## 目录

- [需求背景](#需求背景)
- [重构目标](#重构目标)
- [数据库设计](#数据库设计)
- [阶段 1：数据库重构](#阶段-1数据库重构)
- [阶段 2：后端核心层重构](#阶段-2后端核心层重构)
- [阶段 3：API 层重构](#阶段-3api-层重构)
- [阶段 4：前端适配](#阶段-4前端适配)
- [进度记录](#进度记录)

---

## 需求背景

### 业务需求变更

1. **1 任务 : 1 模型** - 原来一个任务可以生成多个模型，现在只能选择 1 张图生成 1 个模型
2. **模型广场** - 支持浏览、点赞、收藏公开模型
3. **用户上传** - 未来支持用户直接上传模型（不经过 AI 生成）

### 当前架构问题

1. `GenerationRequest` 缺少 `status`、`phase`、`selectedImageIndex` 字段
2. `GeneratedModel` 和 `UserAsset` 表重复，职责不清
3. 缺少用户交互记录表（点赞、收藏）
4. 没有 1 Request : 1 Model 的数据库约束

---

## 重构目标

1. **精简表结构** - 从 13+ 表减少到 9 表
2. **明确状态管理** - GenerationRequest 有完整的状态字段
3. **数据库级约束** - 1 Request : 1 Model
4. **支持模型广场** - 点赞、收藏、统计
5. **前端功能不受影响** - 所有现有功能保持正常

---

## 数据库设计

### 最终表结构（9 个表）

| 层次 | 表名 | 用途 |
|------|------|------|
| 用户层 | `User` | 用户信息 |
| 用户层 | `EmailVerificationCode` | 邮箱验证码 |
| 任务层 | `GenerationRequest` | 生成任务（含状态） |
| 任务层 | `GeneratedImage` | 任务产出的 4 张图片 |
| 模型层 | `Model` | 统一模型表（AI生成 + 用户上传） |
| 执行层 | `ImageGenerationJob` | 图片生成 Worker 任务 |
| 执行层 | `ModelGenerationJob` | 模型生成 Worker 任务 |
| 配置层 | `QueueConfig` | Worker 队列配置 |
| 交互层 | `ModelInteraction` | 点赞/收藏记录 |

### 删除的表

- `GeneratedModel` → 合并到 `Model`
- `UserAsset` → 合并到 `Model`

### 实体关系图

```
User
 ├─ GenerationRequest[] (AI 生成任务)
 │   ├─ GeneratedImage[4]
 │   │   └─ ImageGenerationJob (1:1)
 │   └─ Model? (1:1，AI 生成的模型)
 │       └─ ModelGenerationJob (1:1)
 │
 ├─ Model[] (所有模型：AI 生成 + 用户上传)
 │   └─ ModelInteraction[] (点赞/收藏)
 │
 └─ ModelInteraction[] (我的点赞/收藏)
```

---

## 阶段 1：数据库重构

### 1.1 任务清单

- [ ] 备份当前 schema.prisma
- [ ] 创建新的 schema.prisma
- [ ] 删除旧数据库文件
- [ ] 执行 prisma migrate dev
- [ ] 初始化 QueueConfig 默认配置

### 1.2 新 Schema 详细设计

```prisma
// ============================================
// 用户层（2 个表）
// ============================================

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  avatar      String?

  lastLoginAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  requests           GenerationRequest[]
  models             Model[]
  emailVerifications EmailVerificationCode[]
  interactions       ModelInteraction[]
}

model EmailVerificationCode {
  id         String    @id @default(cuid())
  email      String
  code       String
  expiresAt  DateTime
  verifiedAt DateTime?
  createdAt  DateTime  @default(now())

  userId String?
  user   User?   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([email, createdAt(sort: Desc)])
  @@index([email, expiresAt])
}

// ============================================
// 任务层（2 个表）
// ============================================

model GenerationRequest {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  prompt String

  status RequestStatus @default(IMAGE_PENDING)
  phase  RequestPhase  @default(IMAGE_GENERATION)
  selectedImageIndex Int?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  completedAt DateTime?

  images GeneratedImage[]
  model  Model?

  @@index([userId, createdAt(sort: Desc)])
  @@index([status, phase])
}

model GeneratedImage {
  id        String @id @default(cuid())
  requestId String
  request   GenerationRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)

  index       Int
  imageUrl    String?
  imagePrompt String?

  imageStatus  ImageStatus @default(PENDING)

  createdAt    DateTime  @default(now())
  completedAt  DateTime?
  failedAt     DateTime?
  errorMessage String?

  generationJob ImageGenerationJob?
  model         Model?

  @@unique([requestId, index])
  @@index([requestId])
  @@index([imageStatus])
}

// ============================================
// 模型层（1 个表）
// ============================================

model Model {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  source ModelSource @default(AI_GENERATED)

  requestId     String?         @unique
  request       GenerationRequest? @relation(fields: [requestId], references: [id], onDelete: SetNull)

  sourceImageId String?         @unique
  sourceImage   GeneratedImage? @relation(fields: [sourceImageId], references: [id], onDelete: SetNull)

  name            String
  description     String?
  modelUrl        String?
  previewImageUrl String?
  format          String  @default("OBJ")
  fileSize        Int?

  visibility  ModelVisibility @default(PRIVATE)
  publishedAt DateTime?

  viewCount     Int @default(0)
  likeCount     Int @default(0)
  favoriteCount Int @default(0)
  downloadCount Int @default(0)

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  completedAt  DateTime?
  failedAt     DateTime?
  errorMessage String?

  generationJob ModelGenerationJob?
  interactions  ModelInteraction[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([source])
  @@index([visibility, publishedAt(sort: Desc)])
  @@index([visibility, likeCount(sort: Desc)])
}

// ============================================
// 执行层（2 个表）
// ============================================

model ImageGenerationJob {
  id      String         @id @default(cuid())
  imageId String         @unique
  image   GeneratedImage @relation(fields: [imageId], references: [id], onDelete: Cascade)

  status      JobStatus @default(PENDING)
  priority    Int       @default(0)
  retryCount  Int       @default(0)
  maxRetries  Int       @default(3)
  nextRetryAt DateTime?
  timeoutAt   DateTime?

  providerName  String?
  providerJobId String?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  startedAt   DateTime?
  completedAt DateTime?
  failedAt    DateTime?

  errorMessage String?
  errorCode    String?
  executionDuration Int?

  @@index([status, priority(sort: Desc), createdAt])
  @@index([status, nextRetryAt])
}

model ModelGenerationJob {
  id      String @id @default(cuid())
  modelId String @unique
  model   Model  @relation(fields: [modelId], references: [id], onDelete: Cascade)

  status      JobStatus @default(PENDING)
  priority    Int       @default(0)
  progress    Int       @default(0)
  retryCount  Int       @default(0)
  maxRetries  Int       @default(3)
  nextRetryAt DateTime?
  timeoutAt   DateTime?

  providerName  String?
  providerJobId String?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  startedAt   DateTime?
  completedAt DateTime?
  failedAt    DateTime?

  errorMessage String?
  errorCode    String?
  executionDuration Int?

  @@index([status, priority(sort: Desc), createdAt])
  @@index([status, nextRetryAt])
}

// ============================================
// 配置层（1 个表）
// ============================================

model QueueConfig {
  id             String  @id @default(cuid())
  queueName      String  @unique
  maxConcurrency Int     @default(1)
  jobTimeout     Int     @default(300000)
  maxRetries     Int     @default(3)
  retryDelayBase Int     @default(5000)
  retryDelayMax  Int     @default(60000)
  enablePriority Boolean @default(false)
  isActive       Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ============================================
// 交互层（1 个表）
// ============================================

model ModelInteraction {
  id        String          @id @default(cuid())
  userId    String
  user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  modelId   String
  model     Model           @relation(fields: [modelId], references: [id], onDelete: Cascade)

  type      InteractionType

  createdAt DateTime @default(now())

  @@unique([userId, modelId, type])
  @@index([userId, type, createdAt(sort: Desc)])
  @@index([modelId, type])
}

// ============================================
// 枚举
// ============================================

enum RequestStatus {
  IMAGE_PENDING
  IMAGE_GENERATING
  IMAGE_COMPLETED
  IMAGE_FAILED
  MODEL_PENDING
  MODEL_GENERATING
  MODEL_COMPLETED
  MODEL_FAILED
  COMPLETED
  FAILED
  CANCELLED
}

enum RequestPhase {
  IMAGE_GENERATION
  AWAITING_SELECTION
  MODEL_GENERATION
  COMPLETED
}

enum ImageStatus {
  PENDING
  GENERATING
  COMPLETED
  FAILED
}

enum JobStatus {
  PENDING
  RUNNING
  RETRYING
  COMPLETED
  FAILED
  CANCELLED
  TIMEOUT
}

enum ModelSource {
  AI_GENERATED
  USER_UPLOADED
}

enum ModelVisibility {
  PRIVATE
  PUBLIC
}

enum InteractionType {
  LIKE
  FAVORITE
}
```

### 1.3 验证清单

- [ ] `npx prisma studio` 能正常打开
- [ ] 确认 9 个表都已创建
- [ ] 确认枚举类型正确
- [ ] 确认索引已创建
- [ ] 确认 QueueConfig 有默认数据

### 1.4 回滚方案

如果出现问题：
```bash
git checkout main-redesign -- prisma/schema.prisma
git checkout main-redesign -- prisma/dev.db
```

---

## 阶段 2：后端核心层重构

### 2.1 任务清单

- [ ] 创建 `lib/repositories/model.repository.ts`
- [ ] 创建 `lib/repositories/model-interaction.repository.ts`
- [ ] 修改 `lib/repositories/generation-request.repository.ts`
- [ ] 删除 `lib/repositories/generated-model.repository.ts`
- [ ] 删除 `lib/repositories/user-asset.repository.ts`
- [ ] 创建 `lib/services/model-service.ts`
- [ ] 创建 `lib/services/interaction-service.ts`
- [ ] 创建 `lib/services/gallery-service.ts`
- [ ] 修改 `lib/services/generation-request-service.ts`
- [ ] 删除 `lib/services/generated-model-service.ts`
- [ ] 修改 `lib/workers/image-worker.ts`
- [ ] 修改 `lib/workers/model3d-worker.ts`
- [ ] 更新 `lib/repositories/index.ts`

### 2.2 验证清单

- [ ] TypeScript 编译无错误
- [ ] Worker 能正常启动
- [ ] 手动测试：创建任务 → 图片生成
- [ ] 手动测试：选择图片 → 模型生成
- [ ] 确认状态同步正确

---

## 阶段 3：API 层重构

### 3.1 任务清单

#### 修改现有 API
- [ ] `POST /api/tasks` - 返回新字段
- [ ] `GET /api/tasks/:id` - 返回新字段
- [ ] `PATCH /api/tasks/:id` - 支持 selectedImageIndex
- [ ] `GET /api/tasks/:id/events` - SSE 事件格式

#### 新增模型 API
- [ ] `GET /api/models/:id` - 获取模型详情
- [ ] `PATCH /api/models/:id` - 更新模型信息
- [ ] `DELETE /api/models/:id` - 删除模型
- [ ] `POST /api/models/:id/publish` - 发布到广场
- [ ] `POST /api/models/:id/unpublish` - 取消发布

#### 新增广场 API
- [ ] `GET /api/gallery` - 公开模型列表
- [ ] `GET /api/gallery/:id` - 广场模型详情

#### 新增交互 API
- [ ] `POST /api/models/:id/like` - 点赞/取消
- [ ] `POST /api/models/:id/favorite` - 收藏/取消
- [ ] `GET /api/me/likes` - 我的点赞
- [ ] `GET /api/me/favorites` - 我的收藏
- [ ] `GET /api/me/models` - 我的模型

#### 删除旧 API
- [ ] 删除 `app/api/test/models/generate/route.ts`
- [ ] 重构 `app/api/gallery/models/` 目录

### 3.2 验证清单

- [ ] 所有 API 能正常响应
- [ ] 使用 curl 测试核心 API
- [ ] 验证权限控制正确
- [ ] 验证错误处理正确

---

## 阶段 4：前端适配

### 4.1 任务清单

#### 类型定义
- [ ] 更新 `types/index.ts`
- [ ] 简化 `lib/utils/task-adapter-client.ts`

#### 页面适配
- [ ] `app/workspace/page.tsx`
- [ ] `app/workspace/components/ImageGrid.tsx`
- [ ] `app/workspace/components/ModelPreview.tsx`
- [ ] `app/gallery/page.tsx`
- [ ] `app/gallery/[id]/page.tsx`
- [ ] `app/history/page.tsx`

#### 新增页面（可选）
- [ ] `app/me/likes/page.tsx`
- [ ] `app/me/favorites/page.tsx`

### 4.2 验证清单

- [ ] 首页正常加载
- [ ] Workspace 页面正常工作
- [ ] 能创建任务并生成图片
- [ ] 能选择图片生成模型
- [ ] Gallery 页面正常显示
- [ ] 点赞/收藏功能正常
- [ ] 历史记录页面正常

---

## 进度记录

### 2025-11-21

| 时间 | 操作 | 状态 |
|------|------|------|
| -- | 创建分支 `refactor/database-redesign` | ✅ 完成 |
| -- | 创建计划文档 | ✅ 完成 |
| -- | 阶段 1：数据库重构 | ✅ 完成 |
| -- | - 备份 schema.prisma.backup | ✅ 完成 |
| -- | - 创建新 schema（9 表） | ✅ 完成 |
| -- | - prisma migrate dev | ✅ 完成 |
| -- | - QueueConfig 初始化 | ✅ 完成 |
| -- | 阶段 2：后端核心层重构 | ✅ 完成 |
| -- | - 创建 model.repository.ts | ✅ 完成 |
| -- | - 创建 model-interaction.repository.ts | ✅ 完成 |
| -- | - 修改 generation-request.repository.ts | ✅ 完成 |
| -- | - 修改 generated-image.repository.ts | ✅ 完成 |
| -- | - 修改 job.repository.ts | ✅ 完成 |
| -- | - 删除 generated-model.repository.ts | ✅ 完成 |
| -- | - 删除 user-asset.repository.ts | ✅ 完成 |
| -- | - 创建 model-service.ts | ✅ 完成 |
| -- | - 创建 interaction-service.ts | ✅ 完成 |
| -- | - 删除 generated-model-service.ts | ✅ 完成 |
| -- | - 修改 model3d-worker.ts | ✅ 完成 |
| -- | - 修改 image-worker.ts | ✅ 完成 |
| -- | - 更新 repositories/index.ts | ✅ 完成 |
| -- | 阶段 3：API 层重构 | ⏳ 待开始 |

---

## 注意事项

1. **每个阶段完成后需要用户确认才能继续**
2. **所有变更都在 `refactor/database-redesign` 分支进行**
3. **遇到问题可以随时回滚到 `main-redesign` 分支**
4. **前端功能必须保持正常**
