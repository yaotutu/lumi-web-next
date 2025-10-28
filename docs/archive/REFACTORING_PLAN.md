# 后端架构重构计划

## 🎯 改造目标

将当前的API路由层和业务逻辑分离，遵循最佳实践但避免过度封装。

## 📋 改造步骤

### ✅ 步骤1: 创建统一错误处理 (15分钟) - 已完成

**目标**: 创建统一的错误类型和HTTP响应转换

**任务清单**:
- [x] 创建 `lib/utils/errors.ts`
- [x] 定义 `AppError` 类和错误代码
- [x] 实现 `toErrorResponse()` 函数
- [x] 实现 `withErrorHandler()` 高阶函数
- [x] 创建测试脚本 `scripts/test-error-handler.ts`
- [x] 运行验证: `npm run test:error-handler`

**验证标准**: 所有错误类型正确映射到HTTP响应

**验证结果**: ✅ 通过 - 所有6个测试用例通过
- AppError正确映射到HTTP状态码
- AliyunAPIError正确处理429和500错误
- 未知错误兜底为500
- 错误详情字段正确传递

---

### ✅ 步骤2: 创建Task Service层 (30分钟) - 已完成

**目标**: 将任务管理逻辑从API路由抽离到Service层

**任务清单**:
- [x] 创建目录 `lib/services`
- [x] 创建 `lib/services/task-service.ts`
- [x] 实现以下函数:
  - `listTasks()` - 获取任务列表
  - `getTaskById()` - 获取任务详情
  - `createTask()` - 创建任务
  - `updateTask()` - 更新任务
  - `deleteTask()` - 删除任务
  - `cancelTask()` - 取消任务
- [x] 创建测试脚本 `scripts/test-task-service.ts`
- [x] 运行验证: `npm run test:task-service`

**验证标准**: 所有CRUD操作正常，错误处理正确

**验证结果**: ✅ 通过 - 所有12个测试用例通过
- 创建任务：正常流程 + 验证空提示词 + 验证长度限制
- 查询任务：单个任务 + 任务列表 + 状态筛选
- 更新任务：正常流程 + 验证索引范围
- 取消任务：正常流程 + 验证状态限制
- 删除任务：正常流程 + 验证已删除
- 错误处理：NOT_FOUND、VALIDATION_ERROR、INVALID_STATE 全部正确

---

### ✅ 步骤3: 创建Queue Service层 (20分钟) - 已完成

**目标**: 封装队列管理逻辑，隔离任务队列实现细节

**任务清单**:
- [x] 创建 `lib/services/queue-service.ts`
- [x] 实现以下函数:
  - `enqueueTask()` - 添加任务到队列
  - `dequeueTask()` - 从队列取消任务
  - `getStatus()` - 获取队列状态
- [x] 创建测试脚本 `scripts/test-queue-service.ts`
- [x] 运行验证: `npm run test:queue-service`

**验证标准**: 队列操作正常，任务能正确加入和取消

**验证结果**: ✅ 通过 - 所有测试用例通过（使用MOCK模式）
- 队列状态查询：正常流程
- 添加任务到队列：正常流程 + 并发控制
- 批量添加任务：验证队列并发处理
- 取消队列任务：正常流程（任务已完成时取消失败是预期行为）
- 压力测试：验证队列满时的行为
- 错误处理：队列操作错误正确处理

---

### ✅ 步骤4: 重构API路由层 (30分钟) - 已完成

**目标**: 简化所有API路由，只保留HTTP协议处理

**任务清单**:
- [x] 重构 `app/api/tasks/route.ts`
- [x] 重构 `app/api/tasks/[id]/route.ts`
- [x] 重构 `app/api/tasks/[id]/cancel/route.ts`
- [x] 重构 `app/api/queue/status/route.ts`
- [x] 重构 `app/api/tasks/[id]/images/route.ts`
- [x] 重构 `app/api/tasks/[id]/model/route.ts`
- [x] 运行验证: `npm run test:api`
- [x] 运行验证: `npm run test:workspace`

**验证标准**: 所有API测试通过，行为与重构前完全一致

**验证结果**: ✅ 通过
- API测试: 所有7个测试用例通过
- 工作区集成测试: 所有验证点通过
- 任务创建 → 图片生成 → 图片选择完整流程正常

---

### ✅ 步骤5: 添加Zod验证（可选）(20分钟) - 已完成

**目标**: 使用Zod提供类型安全的请求验证

**任务清单**:
- [x] 安装依赖: `npm install zod`
- [x] 创建 `lib/validators/task-validators.ts`
- [x] 定义以下schemas:
  - `createTaskSchema`
  - `updateTaskSchema`
  - `listTasksQuerySchema`
  - `addImageSchema`
  - `createModelSchema`
- [x] 更新API路由层使用Zod验证
- [x] 测试验证错误提示
- [x] 创建测试脚本 `scripts/test-zod-validation.ts`
- [x] 创建测试脚本 `scripts/test-list-query-validation.ts`
- [x] 运行验证: `npm run test:zod-validation`

**验证标准**: 验证错误提示友好且准确

**验证结果**: ✅ 通过 - 所有Zod验证测试通过
- 创建任务验证：正常情况 + 空提示词 + 提示词过长
- 更新任务验证：正常情况 + 无效状态
- 任务列表查询验证：正常情况 + 限制值转换
- 添加图片验证：正常情况 + 无效URL
- 创建模型验证：正常情况 + 空名称
- 特别修复了查询参数为null时的处理问题

---

### ✅ 步骤6: 重组目录结构（可选）(30分钟) - 已完成

**目标**: 优化目录组织，提升代码可维护性

**任务清单**:
- [x] 创建目录结构:
  ```
  lib/
  ├── services/
  ├── providers/
  ├── utils/
  └── validators/
  ```
- [x] 移动文件:
  - `lib/aliyun-image.ts` → `lib/providers/aliyun-image.ts`
  - `lib/storage.ts` → `lib/providers/storage.ts`
- [x] 更新所有import路径
- [x] 运行验证: `npm run build`
- [x] 运行验证: `npm run dev`
- [x] 运行验证: `npm run test:api`
- [x] 运行验证: `npm run test:workspace`

**验证标准**: 构建成功，所有功能正常

**验证结果**: ✅ 通过
- 构建成功：Next.js生产构建完成
- API测试：所有7个测试用例通过
- 工作区集成测试：完整流程验证通过

---

## 📊 改造前后对比

| 指标 | 改造前 | 改造后 |
|------|-------|-------|
| **API路由代码行数** | 130行 | 30行 (-77%) |
| **业务逻辑位置** | 分散在各路由 | 集中在Service层 |
| **错误处理** | 重复的try-catch | 统一的错误转换 |
| **可测试性** | 依赖HTTP请求 | Service层可单元测试 |
| **类型安全** | 运行时错误 | Zod编译时+运行时 |

---

## 🔑 核心原则

1. **三层架构足够**: API路由 → Service → Database
2. **错误统一**: 自定义AppError + 统一转换函数
3. **验证集中**: Zod schemas放在validators/
4. **函数优先**: Service层使用纯函数，不需要类
5. **渐进优化**: 先重构关键路径，再扩展到其他模块

---

## 📝 进度追踪

- 开始时间: 2025-10-06
- 当前步骤: 步骤5 - 添加Zod验证
- 预计完成: 2025-10-06
- 实际完成: 2025-10-06

---

## 🎯 最终目标目录结构

```
lib/
├── services/              # 业务逻辑层
│   ├── task-service.ts
│   ├── image-service.ts
│   └── queue-service.ts
│
├── providers/             # 外部API封装
│   ├── aliyun-image.ts
│   ├── storage.ts
│   └── aliyun-oss.ts (未来)
│
├── validators/            # 请求验证
│   └── task-validators.ts
│
├── utils/                 # 工具函数
│   ├── errors.ts
│   └── async.ts
│
├── db/                    # 数据库
│   └── prisma.ts
│
├── constants.ts
└── task-queue.ts (待迁移到services/)

app/api/                   # API路由（薄适配层）
└── tasks/
    └── route.ts           # 仅调用Service层
```
