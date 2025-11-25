/**
 * 应用全局初始化
 *
 * 职责：在服务端启动时执行一次性初始化操作
 */

import { createLogger } from "./logger";
import { startAllWorkers } from "./workers";

const log = createLogger("AppInit");

// 标记是否已初始化（防止热重载时重复初始化）
let isInitialized = false;

/**
 * 初始化应用
 */
export function initializeApp(): void {
  // 只在服务端执行
  if (typeof window !== "undefined") {
    return;
  }

  // 防止重复初始化
  if (isInitialized) {
    log.info("initializeApp", "应用已初始化，跳过");
    return;
  }

  log.info("initializeApp", "开始初始化应用...");

  try {
    // 启动所有后台Worker
    startAllWorkers();

    // 未来可以在这里添加更多初始化逻辑
    // initializeDatabase();
    // initializeCache();
    // initializeMetrics();

    isInitialized = true;
    log.info("initializeApp", "应用初始化完成");
  } catch (error) {
    log.error("initializeApp", "应用初始化失败", error);
    throw error;
  }
}

// 自动执行初始化（当模块被导入时）
initializeApp();
