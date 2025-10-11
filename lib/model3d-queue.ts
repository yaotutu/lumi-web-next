/**
 * 3D模型生成任务处理器
 * 核心功能：
 * 1. 监听 IMAGES_READY 状态的任务（已选择图片）
 * 2. 自动提交腾讯云3D生成任务
 * 3. 轮询腾讯云状态直到完成
 * 4. 并发控制（最多1个3D任务同时生成）
 */

import { prisma } from "@/lib/db/prisma";
import { createLogger, timer } from "@/lib/logger";
import {
  submitModelGenerationJob,
  queryModelTaskStatus,
} from "@/lib/providers/tencent-ai3d";
import type { ModelStatus } from "@prisma/client";

// 创建日志器
const log = createLogger("Model3DQueue");

// ============================================
// 配置
// ============================================
const CONFIG = {
  MAX_CONCURRENT: 1, // 最大并发3D任务数（腾讯云Rapid版本默认1个并发）
  POLL_INTERVAL: 5000, // 轮询腾讯云状态间隔（5秒）
  MAX_POLL_TIME: 600000, // 最大轮询时间（10分钟）
} as const;

// ============================================
// 状态管理
// ============================================

// 当前正在运行的3D任务数
let runningCount = 0;

// 正在处理的任务ID集合（避免重复处理）
const processingTasks = new Set<string>();

// ============================================
// 核心函数
// ============================================

/**
 * 处理单个3D模型生成任务
 * @param taskId 任务ID
 */
async function processModel3DTask(taskId: string): Promise<void> {
  const t = timer();
  log.info("processModel3DTask", "开始处理3D模型生成", { taskId });

  // 防止重复处理
  if (processingTasks.has(taskId)) {
    log.warn("processModel3DTask", "任务正在处理中，跳过", { taskId });
    return;
  }

  processingTasks.add(taskId);

  try {
    // 1. 查询任务和已选择的图片
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        images: {
          orderBy: { index: "asc" },
        },
        model: true,
      },
    });

    // 验证任务存在
    if (!task) {
      log.error("processModel3DTask", "任务不存在", null, { taskId });
      return;
    }

    // 验证任务状态必须是IMAGES_READY
    if (task.status !== "IMAGES_READY") {
      log.warn("processModel3DTask", "任务状态不是IMAGES_READY，跳过", {
        taskId,
        currentStatus: task.status,
      });
      return;
    }

    // 验证必须已选择图片
    if (
      task.selectedImageIndex === null ||
      task.selectedImageIndex === undefined
    ) {
      log.warn("processModel3DTask", "未选择图片，跳过", { taskId });
      return;
    }

    // 验证不能已有模型记录（防止重复生成）
    if (task.model) {
      log.warn("processModel3DTask", "已有模型记录，跳过", {
        taskId,
        modelId: task.model.id,
        modelStatus: task.model.status,
      });
      return;
    }

    // 获取选中的图片
    const selectedImage = task.images[task.selectedImageIndex];
    if (!selectedImage) {
      log.error("processModel3DTask", "选中的图片不存在", null, {
        taskId,
        selectedIndex: task.selectedImageIndex,
        totalImages: task.images.length,
      });
      return;
    }

    log.info("processModel3DTask", "验证通过，准备提交腾讯云任务", {
      taskId,
      selectedImageIndex: task.selectedImageIndex,
      imageUrl: selectedImage.url,
    });

    // 2. 提交腾讯云3D生成任务
    const tencentResponse = await submitModelGenerationJob({
      imageUrl: selectedImage.url,
      // prompt: task.prompt, // 传递原始提示词（可选）
    });

    log.info("processModel3DTask", "腾讯云任务提交成功", {
      taskId,
      jobId: tencentResponse.JobId,
      requestId: tencentResponse.RequestId,
    });

    // 3. 创建本地TaskModel记录
    const model = await prisma.taskModel.create({
      data: {
        taskId,
        name: `${task.prompt.slice(0, 30)} - 3D模型`,
        status: "GENERATING",
        progress: 0,
        apiTaskId: tencentResponse.JobId,
        apiRequestId: tencentResponse.RequestId,
      },
    });

    log.info("processModel3DTask", "本地模型记录创建成功", {
      taskId,
      modelId: model.id,
    });

    // 4. 更新任务状态为GENERATING_MODEL
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "GENERATING_MODEL",
        modelGenerationStartedAt: new Date(),
      },
    });

    // 5. 开始轮询腾讯云状态
    await pollTencentCloudStatus(taskId, tencentResponse.JobId);

    log.info("processModel3DTask", "3D模型生成完成", {
      taskId,
      duration: t(),
    });
  } catch (error) {
    // 处理错误
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    log.error("processModel3DTask", "3D模型生成失败", error, { taskId });

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

    throw error;
  } finally {
    processingTasks.delete(taskId);
  }
}

/**
 * 轮询腾讯云任务状态直到完成
 * @param taskId 本地任务ID
 * @param jobId 腾讯云JobId
 */
async function pollTencentCloudStatus(
  taskId: string,
  jobId: string,
): Promise<void> {
  const startTime = Date.now();
  let pollCount = 0;

  log.info("pollTencentCloudStatus", "开始轮询腾讯云状态", {
    taskId,
    jobId,
  });

  while (true) {
    pollCount++;
    const elapsed = Date.now() - startTime;

    // 检查是否超时
    if (elapsed > CONFIG.MAX_POLL_TIME) {
      throw new Error(
        `轮询超时：已等待${Math.floor(elapsed / 1000)}秒，超过最大限制`,
      );
    }

    // 查询腾讯云状态
    const tencentStatus = await queryModelTaskStatus(jobId);

    log.info("pollTencentCloudStatus", "腾讯云状态查询", {
      taskId,
      jobId,
      status: tencentStatus.Status,
      pollCount,
      elapsedSeconds: Math.floor(elapsed / 1000),
    });

    // 计算进度
    let progress = 0;
    if (tencentStatus.Status === "WAIT") progress = 0;
    else if (tencentStatus.Status === "RUN") progress = 50;
    else if (tencentStatus.Status === "DONE") progress = 100;
    else if (tencentStatus.Status === "FAIL") progress = 0;

    // 更新本地模型进度
    await prisma.taskModel.update({
      where: { taskId },
      data: { progress },
    });

    // 处理完成状态
    if (tencentStatus.Status === "DONE") {
      // 提取GLB文件URL
      const glbFile = tencentStatus.ResultFile3Ds?.find(
        (file) => file.Type?.toUpperCase() === "GLB",
      );

      if (!glbFile?.Url) {
        throw new Error("腾讯云返回的结果中没有GLB文件");
      }

      log.info("pollTencentCloudStatus", "3D模型生成成功", {
        taskId,
        jobId,
        modelUrl: glbFile.Url,
      });

      // TODO: 下载模型文件到本地/OSS（可选）
      // const localUrl = await downloadAndSaveModel(glbFile.Url, taskId);

      // 更新模型状态为COMPLETED
      await prisma.taskModel.update({
        where: { taskId },
        data: {
          status: "COMPLETED",
          progress: 100,
          modelUrl: glbFile.Url, // TODO: 改为 localUrl
          completedAt: new Date(),
        },
      });

      // 更新任务状态为COMPLETED
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          modelGenerationCompletedAt: new Date(),
          completedAt: new Date(),
        },
      });

      log.info("pollTencentCloudStatus", "任务完成", { taskId, jobId });
      return;
    }

    // 处理失败状态
    if (tencentStatus.Status === "FAIL") {
      const errorMsg =
        tencentStatus.ErrorMessage || "3D模型生成失败（腾讯云返回失败状态）";

      log.error("pollTencentCloudStatus", "腾讯云任务失败", null, {
        taskId,
        jobId,
        errorCode: tencentStatus.ErrorCode,
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

    // 等待后继续轮询（WAIT或RUN状态）
    await sleep(CONFIG.POLL_INTERVAL);
  }
}

/**
 * 延迟函数
 * @param ms 延迟时间（毫秒）
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// 导出的公共API
// ============================================

/**
 * 添加3D模型生成任务（带并发控制）
 * @param taskId 任务ID
 */
export async function addModel3DTask(taskId: string): Promise<void> {
  // 等待直到有空闲槽位
  while (runningCount >= CONFIG.MAX_CONCURRENT) {
    log.warn("addModel3DTask", "达到最大并发数，等待空闲槽位", {
      running: runningCount,
      maxConcurrent: CONFIG.MAX_CONCURRENT,
    });
    await sleep(1000); // 每1秒检查一次
  }

  runningCount++;
  log.info("addModel3DTask", "3D任务加入处理队列", {
    taskId,
    running: runningCount,
    maxConcurrent: CONFIG.MAX_CONCURRENT,
  });

  try {
    await processModel3DTask(taskId);
  } finally {
    runningCount--;
    log.info("addModel3DTask", "3D任务处理完成", {
      taskId,
      running: runningCount,
      maxConcurrent: CONFIG.MAX_CONCURRENT,
    });
  }
}

/**
 * 获取3D队列状态
 */
export function getModel3DQueueStatus() {
  return {
    running: runningCount,
    maxConcurrent: CONFIG.MAX_CONCURRENT,
  };
}
