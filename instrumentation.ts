/**
 * Next.js Instrumentation Hook
 *
 * 职责：在 Next.js 服务端启动时执行一次性初始化
 *
 * 特性：
 * - 仅在服务端执行（客户端不会加载此文件）
 * - 在所有路由和中间件加载之前执行
 * - 适合启动后台 Worker、初始化数据库连接等
 *
 * 文档：https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { createLogger } from "@/lib/logger";

const log = createLogger("Instrumentation");

/**
 * 服务端启动时自动调用
 *
 * 注意：此函数仅在 Node.js 运行时执行（不在 Edge Runtime）
 */
export async function register() {
  // 确保只在 Node.js 环境运行（不在 Edge Runtime）
  if (process.env.NEXT_RUNTIME === "nodejs") {
    log.info("register", "Next.js 服务端启动，开始初始化...");

    try {
      // 动态导入以避免在其他运行时加载
      const { startAllWorkers } = await import("@/lib/workers");

      // 启动所有后台 Worker（异步）
      await startAllWorkers();

      log.info("register", "服务端初始化完成");
    } catch (error) {
      log.error("register", "服务端初始化失败", error);
      throw error;
    }
  }
}
