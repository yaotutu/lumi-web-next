/**
 * 日志系统测试脚本
 * 测试所有日志级别和上下文输出
 */

import { createLogger, timer } from "@/lib/logger";

// 创建测试日志器
const log = createLogger("TestLogger");

async function testLogger() {
  console.log("========== 开始测试日志系统 ==========\n");

  // 测试1: 基本日志级别
  log.info("testBasicLevels", "这是一条普通信息");
  log.warn("testBasicLevels", "这是一条警告信息");
  log.debug(
    "testBasicLevels",
    "这是一条调试信息（需要LOG_LEVEL=debug才会显示）",
  );

  // 测试2: 带上下文的日志
  log.info("testWithContext", "创建任务", {
    userId: "user_123",
    taskId: "task_456",
    promptLength: 25,
  });

  // 测试3: 错误日志
  try {
    throw new Error("模拟的数据库连接失败");
  } catch (error) {
    log.error("testError", "数据库操作失败", error, {
      userId: "user_123",
      operation: "createTask",
    });
  }

  // 测试4: 性能计时
  const t = timer();
  await new Promise((resolve) => setTimeout(resolve, 123)); // 模拟异步操作
  log.info("testPerformance", "异步任务完成", {
    duration: t(),
    operation: "fetchData",
  });

  // 测试5: 复杂嵌套对象
  log.info("testComplexObject", "队列状态更新", {
    taskId: "task_789",
    queue: {
      running: 2,
      maxConcurrent: 3,
      pending: 5,
    },
    metadata: {
      retryCount: 1,
      lastError: "timeout",
    },
  });

  console.log("\n========== 测试完成 ==========");
}

testLogger().catch(console.error);
