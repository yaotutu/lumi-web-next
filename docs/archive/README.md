# 📦 归档文档

此文件夹包含已完成或过时的项目文档，仅供历史参考。

---

## 归档文档列表

### 1. TASK_STATUS_REFERENCE.md
- **归档时间**：2025-10-28
- **归档原因**：描述的 TaskStatus 枚举（IMAGE_PENDING, MODEL_PENDING 等）与当前架构不匹配
- **当前实现**：使用 ImageStatus + JobStatus 分离设计
- **参考文档**：查看 [ARCHITECTURE.md](../ARCHITECTURE.md) 了解当前架构

### 2. REFACTOR_TASK_STATUS.md
- **归档时间**：2025-10-28
- **归档原因**：重构计划文档，描述的目标状态与实际实现方案不同
- **当前实现**：采用了不同的架构方案（以图像为中心 + Job-Based）
- **参考文档**：查看 [ARCHITECTURE.md](../ARCHITECTURE.md) 和 [COMPLETE_WORKFLOW.md](../COMPLETE_WORKFLOW.md)

### 3. TASK_LOGIC_FLOW_OLD.md
- **归档时间**：2025-10-28
- **归档原因**：旧的任务逻辑流程文档，已被新架构替代
- **当前实现**：Job-Based 架构 + 三层任务处理（超时检测、重试调度、新任务执行）
- **参考文档**：查看 [COMPLETE_WORKFLOW.md](../COMPLETE_WORKFLOW.md)

### 4. REFACTORING_PLAN.md
- **归档时间**：2025-10-28
- **归档原因**：后端架构重构计划已全部完成
- **完成状态**：所有步骤（步骤 1-6）已完成并验证通过
- **成果**：
  - ✅ 统一错误处理（AppError + withErrorHandler）
  - ✅ Service 层封装（task-service, queue-service, etc.）
  - ✅ Zod 验证
  - ✅ 目录结构重组（lib/services, lib/providers, lib/validators）

---

## 如何使用归档文档

1. **历史参考**：了解项目架构的演变过程
2. **设计决策**：理解为什么选择当前的架构方案
3. **避免重复**：避免重新实现已经尝试过但被替代的方案

---

## 最新文档

最新的项目文档请查看 `docs/` 根目录：

- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - 当前系统架构
- **[COMPLETE_WORKFLOW.md](../COMPLETE_WORKFLOW.md)** - 完整工作流程
- **[CLAUDE.md](../../CLAUDE.md)** - 开发指南和文档索引

---

**注意**：归档文档中的内容可能与当前代码库不一致，仅供参考，不建议用于实际开发。
