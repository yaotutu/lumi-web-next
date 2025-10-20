/**
 * Worker统一启动入口
 *
 * 职责：在应用启动时自动启动所有后台Worker
 */

import { startWorker as startImageWorker } from "./image-worker";
import { startWorker as startModel3DWorker } from "./model3d-worker";
import { createLogger } from "@/lib/logger";

const log = createLogger("WorkerManager");

/**
 * 启动所有Worker（异步）
 */
export async function startAllWorkers(): Promise<void> {
  log.info("startAllWorkers", "正在启动所有Worker...");

  try {
    // 启动图片生成Worker（异步，需要初始化 WorkerConfigManager）
    await startImageWorker();

    // 启动3D模型生成Worker（异步）
    await startModel3DWorker();

    // 未来可以在这里添加更多Worker
    // await startNotificationWorker();
    // await startEmailWorker();

    log.info("startAllWorkers", "所有Worker已启动");
  } catch (error) {
    log.error("startAllWorkers", "Worker启动失败", error);
    throw error;
  }
}
