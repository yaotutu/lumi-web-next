/**
 * 3D模型生成Worker
 *
 * 职责：监听数据库中状态为MODEL_PENDING的任务，执行3D模型生成流程
 *
 * 架构原则：
 * - API层只负责状态变更
 * - Worker层监听状态变化并执行业务逻辑
 * - 解耦API请求和后台任务处理
 */

import type { ModelStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createLogger, timer } from "@/lib/logger";
import type { ModelTaskStatus } from "@/lib/providers/model3d";
import { createModel3DProvider } from "@/lib/providers/model3d";
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from "@/lib/utils/retry";

// 创建日志器
const log = createLogger("Model3DWorker");

// ============================================
// 配置
// ============================================
const CONFIG = {
  POLL_INTERVAL: 2000, // Worker轮询数据库间隔（2秒）
  TENCENT_POLL_INTERVAL: 5000, // 轮询腾讯云状态间隔（5秒）
  MAX_TENCENT_POLL_TIME: 600000, // 最大轮询腾讯云时间（10分钟）
  MAX_CONCURRENT: 1, // 最大并发3D任务数
  // 重试配置（使用统一的重试工具）
  RETRY_CONFIG: {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: 3, // 最大重试3次
    baseDelay: 3000, // 普通错误基础延迟3秒
    rateLimitDelay: 30000, // 并发限制延迟30秒（与图像生成一致）
  },
} as const;

// ============================================
// 状态映射
// ============================================

/**
 * 将 Provider 的技术状态映射为业务状态
 * Provider 状态（技术层）：WAIT/RUN/DONE/FAIL
 * 业务状态（数据库层）：PENDING/GENERATING/COMPLETED/FAILED
 */
const PROVIDER_STATUS_MAP: Record<ModelTaskStatus, ModelStatus> = {
  WAIT: "PENDING", // Provider: 等待处理 → 业务: 等待中
  RUN: "GENERATING", // Provider: 运行中 → 业务: 生成中
  DONE: "COMPLETED", // Provider: 完成 → 业务: 已完成
  FAIL: "FAILED", // Provider: 失败 → 业务: 失败
};

/**
 * 映射 Provider 状态为业务状态
 */
function mapProviderStatus(providerStatus: ModelTaskStatus): ModelStatus {
  return PROVIDER_STATUS_MAP[providerStatus];
}

// ============================================
// 状态管理
// ============================================

// 当前正在处理的任务ID集合（避免重复处理）
const processingTasks = new Set<string>();

// Worker是否正在运行
let isRunning = false;

// ============================================
// 核心业务逻辑
// ============================================

/**
 * 处理单个3D模型生成任务
 * 职责：从提交腾讯云到轮询完成的完整流程
 */
async function processTask(taskId: string): Promise<void> {
  const t = timer();
  log.info("processTask", "开始处理3D模型生成任务", { taskId });

  // 防止重复处理
  if (processingTasks.has(taskId)) {
    log.warn("processTask", "任务正在处理中，跳过", { taskId });
    return;
  }

  processingTasks.add(taskId);

  try {
    // 1. 查询任务详情
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        images: { orderBy: { index: "asc" } },
        model: true,
      },
    });

    // 验证任务存在
    if (!task) {
      log.error("processTask", "任务不存在", null, { taskId });
      return;
    }

    // 验证任务状态（必须是MODEL_PENDING）
    if (task.status !== "MODEL_PENDING") {
      log.warn("processTask", "任务状态已变化，跳过处理", {
        taskId,
        currentStatus: task.status,
      });
      return;
    }

    // 立即更新任务状态为 MODEL_GENERATING
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "MODEL_GENERATING",
        modelGenerationStartedAt: new Date(),
      },
    });

    log.info("processTask", "任务状态已更新为 MODEL_GENERATING", { taskId });

    // 验证必须已选择图片
    if (
      task.selectedImageIndex === null ||
      task.selectedImageIndex === undefined
    ) {
      throw new Error("任务未选择图片");
    }

    // 验证不能已有模型记录
    if (task.model) {
      log.warn("processTask", "已有模型记录，跳过", {
        taskId,
        modelId: task.model.id,
      });
      return;
    }

    // 获取选中的图片
    const selectedImage = task.images[task.selectedImageIndex];
    if (!selectedImage) {
      throw new Error(
        `选中的图片不存在: index=${task.selectedImageIndex}, total=${task.images.length}`,
      );
    }

    log.info("processTask", "验证通过，准备提交腾讯云任务", {
      taskId,
      selectedImageIndex: task.selectedImageIndex,
      imageUrl: selectedImage.url,
    });

    // 2. 提交3D生成任务（使用统一的重试工具）
    const model3DProvider = createModel3DProvider();
    const tencentResponse = await retryWithBackoff(
      async () => {
        return await model3DProvider.submitModelGenerationJob({
          imageUrl: selectedImage.url,
        });
      },
      CONFIG.RETRY_CONFIG,
      taskId,
      "提交3D生成任务",
    );

    log.info("processTask", "3D任务提交成功", {
      taskId,
      jobId: tencentResponse.jobId,
      requestId: tencentResponse.requestId,
    });

    // 3. 创建本地TaskModel记录（初始状态为 PENDING）
    const model = await prisma.taskModel.create({
      data: {
        taskId,
        name: `${task.prompt.slice(0, 30)} - 3D模型`,
        status: "PENDING", // 初始状态为 PENDING，对应 Provider 的 WAIT
        progress: 0,
        apiTaskId: tencentResponse.jobId,
        apiRequestId: tencentResponse.requestId,
      },
    });

    log.info("processTask", "本地模型记录创建成功", {
      taskId,
      modelId: model.id,
      initialStatus: "PENDING",
    });

    // 5. 轮询3D生成状态直到完成
    await pollModel3DStatus(taskId, tencentResponse.jobId);

    log.info("processTask", "3D模型生成完成", {
      taskId,
      duration: t(),
    });
  } catch (error) {
    // 处理错误
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    log.error("processTask", "3D模型生成失败", error, { taskId });

    // 更新任务状态为FAILED
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: errorMsg,
      },
    });

    // 如果已有模型记录，也标记为失败
    const existingModel = await prisma.taskModel.findUnique({
      where: { taskId },
    });

    if (existingModel) {
      await prisma.taskModel.update({
        where: { id: existingModel.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: errorMsg,
        },
      });
    }
  } finally {
    processingTasks.delete(taskId);
  }
}

/**
 * 轮询3D模型生成任务状态直到完成
 */
async function pollModel3DStatus(taskId: string, jobId: string): Promise<void> {
  const startTime = Date.now();
  let pollCount = 0;
  const model3DProvider = createModel3DProvider();

  log.info("pollModel3DStatus", "开始轮询3D生成状态", {
    taskId,
    jobId,
  });

  while (true) {
    pollCount++;
    const elapsed = Date.now() - startTime;

    // 检查是否超时
    if (elapsed > CONFIG.MAX_TENCENT_POLL_TIME) {
      throw new Error(
        `轮询超时：已等待${Math.floor(elapsed / 1000)}秒，超过最大限制`,
      );
    }

    // 等待后查询（避免首次立即查询）
    await sleep(CONFIG.TENCENT_POLL_INTERVAL);

    // 查询3D生成状态
    const status = await model3DProvider.queryModelTaskStatus(jobId);

    log.info("pollModel3DStatus", "3D生成状态查询", {
      taskId,
      jobId,
      status: status.status,
      pollCount,
      elapsedSeconds: Math.floor(elapsed / 1000),
    });

    // 映射 Provider 状态为业务状态
    const businessStatus = mapProviderStatus(status.status);

    // 计算进度
    let progress = 0;
    if (status.status === "WAIT") progress = 0;
    else if (status.status === "RUN") progress = 50;
    else if (status.status === "DONE") progress = 100;
    else if (status.status === "FAIL") progress = 0;

    // 更新本地模型状态和进度
    await prisma.taskModel.update({
      where: { taskId },
      data: {
        status: businessStatus, // 同步更新业务状态
        progress,
      },
    });

    // 处理完成状态
    if (status.status === "DONE") {
      // 提取GLB文件URL
      const glbFile = status.resultFiles?.find(
        (file) => file.type?.toUpperCase() === "GLB",
      );

      if (!glbFile?.url) {
        throw new Error("3D生成返回的结果中没有GLB文件");
      }

      log.info("pollModel3DStatus", "3D模型生成成功", {
        taskId,
        jobId,
        modelUrl: glbFile.url,
      });

      // 更新模型状态为COMPLETED
      await prisma.taskModel.update({
        where: { taskId },
        data: {
          status: "COMPLETED",
          progress: 100,
          modelUrl: glbFile.url,
          completedAt: new Date(),
        },
      });

      // 更新任务状态为MODEL_COMPLETED
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "MODEL_COMPLETED",
          modelGenerationCompletedAt: new Date(),
          completedAt: new Date(),
        },
      });

      log.info("pollModel3DStatus", "任务完成", { taskId, jobId });
      return;
    }

    // 处理失败状态
    if (status.status === "FAIL") {
      const errorMsg = status.errorMessage || "3D模型生成失败（返回失败状态）";

      log.error("pollModel3DStatus", "3D生成任务失败", null, {
        taskId,
        jobId,
        errorCode: status.errorCode,
        errorMessage: errorMsg,
      });

      // 更新模型状态为FAILED
      await prisma.taskModel.update({
        where: { taskId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: errorMsg,
        },
      });

      // 更新任务状态为FAILED
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: errorMsg,
        },
      });

      throw new Error(errorMsg);
    }

    // 继续轮询（WAIT或RUN状态）
  }
}

// ============================================
// Worker主循环
// ============================================

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Worker主循环：持续监听MODEL_PENDING状态的任务
 */
async function workerLoop(): Promise<void> {
  log.info("workerLoop", "Worker启动，开始监听MODEL_PENDING状态任务");

  while (isRunning) {
    try {
      // 查询所有状态为MODEL_PENDING且未被处理的任务
      const tasks = await prisma.task.findMany({
        where: {
          status: "MODEL_PENDING",
          id: {
            notIn: Array.from(processingTasks), // 排除正在处理的任务
          },
        },
        orderBy: {
          updatedAt: "asc", // 优先处理更早的任务
        },
        take: CONFIG.MAX_CONCURRENT, // 限制并发数
      });

      // 处理每个任务（并发执行）
      if (tasks.length > 0) {
        log.info("workerLoop", "发现待处理任务", {
          count: tasks.length,
          taskIds: tasks.map((t) => t.id),
        });

        // 并发处理所有任务（受MAX_CONCURRENT限制）
        await Promise.all(tasks.map((task) => processTask(task.id)));
      }

      // 等待后继续下一轮轮询
      await sleep(CONFIG.POLL_INTERVAL);
    } catch (error) {
      log.error("workerLoop", "Worker循环出错", error);
      // 出错后等待一段时间再继续
      await sleep(5000);
    }
  }

  log.info("workerLoop", "Worker已停止");
}

// ============================================
// 导出的公共API
// ============================================

/**
 * 启动Worker
 */
export function startWorker(): void {
  if (isRunning) {
    log.warn("startWorker", "Worker已在运行中");
    return;
  }

  isRunning = true;
  workerLoop().catch((error) => {
    log.error("startWorker", "Worker崩溃", error);
    isRunning = false;
  });

  log.info("startWorker", "Worker已启动");
}

/**
 * 停止Worker
 */
export function stopWorker(): void {
  if (!isRunning) {
    log.warn("stopWorker", "Worker未在运行");
    return;
  }

  isRunning = false;
  log.info("stopWorker", "Worker停止信号已发送");
}

/**
 * 获取Worker状态
 */
export function getWorkerStatus() {
  return {
    isRunning,
    processingCount: processingTasks.size,
    processingTaskIds: Array.from(processingTasks),
  };
}
