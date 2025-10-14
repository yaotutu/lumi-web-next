/**
 * Worker统一启动入口
 *
 * 职责：在应用启动时自动启动所有后台Worker
 */

import { startWorker as startModel3DWorker } from "./model3d-worker";
import { createLogger } from "@/lib/logger";

const log = createLogger("WorkerManager");

/**
 * 启动所有Worker
 */
export function startAllWorkers(): void {
  log.info("startAllWorkers", "正在启动所有Worker...");

  try {
    // 启动3D模型生成Worker
    startModel3DWorker();

    // 未来可以在这里添加更多Worker
    // startImageWorker();
    // startNotificationWorker();

    log.info("startAllWorkers", "所有Worker已启动");
  } catch (error) {
    log.error("startAllWorkers", "Worker启动失败", error);
    throw error;
  }
}
