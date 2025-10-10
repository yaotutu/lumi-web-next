/**
 * 统一日志工具
 * 基于 pino 实现的轻量级日志系统
 *
 * 特性：
 * - 自动记录模块名和函数名，快速定位代码位置
 * - 结构化日志，便于查询和分析
 * - 开发环境通过命令行管道美化输出，生产环境 JSON 格式
 */

import pino from "pino";
import type { LogContext } from "./types";

// 创建 pino 实例
// 使用最简配置，开发时通过命令行管道自动美化
const pinoInstance = pino({
  level: process.env.LOG_LEVEL || "info",
});

/**
 * 创建带模块名的日志器
 * @param module 模块名（如 "TaskService"、"QueueService"）
 * @returns 日志方法集合
 *
 * @example
 * const log = createLogger("TaskService");
 * log.info("createTask", "创建任务", { userId, taskId });
 * log.error("createTask", "创建失败", error, { userId });
 */
export function createLogger(module: string) {
  return {
    /**
     * 记录普通信息
     * @param fn 函数名
     * @param msg 日志消息
     * @param ctx 上下文数据
     */
    info(fn: string, msg: string, ctx?: LogContext) {
      pinoInstance.info({ module, fn, ...ctx }, msg);
    },

    /**
     * 记录警告信息
     * @param fn 函数名
     * @param msg 日志消息
     * @param ctx 上下文数据
     */
    warn(fn: string, msg: string, ctx?: LogContext) {
      pinoInstance.warn({ module, fn, ...ctx }, msg);
    },

    /**
     * 记录错误信息
     * @param fn 函数名
     * @param msg 日志消息
     * @param error 错误对象
     * @param ctx 上下文数据
     */
    error(fn: string, msg: string, error: unknown, ctx?: LogContext) {
      pinoInstance.error(
        {
          module,
          fn,
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  stack: error.stack,
                  name: error.name,
                }
              : String(error),
          ...ctx,
        },
        msg,
      );
    },

    /**
     * 调试日志（仅在 LOG_LEVEL=debug 时输出）
     * @param fn 函数名
     * @param msg 日志消息
     * @param ctx 上下文数据
     */
    debug(fn: string, msg: string, ctx?: LogContext) {
      pinoInstance.debug({ module, fn, ...ctx }, msg);
    },
  };
}

/**
 * 性能计时工具
 * @returns 计时器，调用返回值可获取已过时间（毫秒）
 *
 * @example
 * const t = timer();
 * await someAsyncWork();
 * log.info("work", "完成", { duration: t() });
 */
export function timer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
