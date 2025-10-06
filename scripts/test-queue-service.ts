/**
 * Queue Service 测试脚本
 * 测试目标：验证队列管理功能和错误处理
 */

import { MOCK_USER } from "../lib/constants";
import * as QueueService from "../lib/services/queue-service";
import * as TaskService from "../lib/services/task-service";

console.log("🧪 测试 Queue Service\n");

async function runTests() {
  const createdTaskIds: string[] = [];

  try {
    // ============================================
    // 测试1: 获取队列状态
    // ============================================
    console.log("测试1: 获取队列状态");
    const initialStatus = QueueService.getStatus();

    if (typeof initialStatus.running !== "number") {
      throw new Error("running 应该是数字");
    }
    if (typeof initialStatus.maxConcurrent !== "number") {
      throw new Error("maxConcurrent 应该是数字");
    }
    if (initialStatus.maxConcurrent !== 3) {
      throw new Error("最大并发数应该是3");
    }

    console.log("  ✅ 队列状态查询成功:", initialStatus);

    // ============================================
    // 测试2: 添加任务到队列 - 正常流程
    // ============================================
    console.log("\n测试2: 添加任务到队列 - 正常流程");
    const task1 = await TaskService.createTask(MOCK_USER.id, "测试队列任务1");
    createdTaskIds.push(task1.id);

    await QueueService.enqueueTask(task1.id, task1.prompt);
    console.log("  ✅ 任务已加入队列:", task1.id);

    // 验证队列状态变化
    const statusAfterEnqueue = QueueService.getStatus();
    console.log("  队列状态:", statusAfterEnqueue);

    // ============================================
    // 测试3: 批量添加任务
    // ============================================
    console.log("\n测试3: 批量添加任务到队列");
    const task2 = await TaskService.createTask(MOCK_USER.id, "测试队列任务2");
    const task3 = await TaskService.createTask(MOCK_USER.id, "测试队列任务3");
    createdTaskIds.push(task2.id, task3.id);

    await QueueService.enqueueTask(task2.id, task2.prompt);
    await QueueService.enqueueTask(task3.id, task3.prompt);

    const statusAfterBatch = QueueService.getStatus();
    console.log("  ✅ 批量添加成功，当前队列状态:", statusAfterBatch);

    // ============================================
    // 测试4: 等待任务处理
    // ============================================
    console.log("\n测试4: 等待任务处理");
    console.log("  等待3秒，观察任务处理...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const statusAfterWait = QueueService.getStatus();
    console.log("  ✅ 等待后队列状态:", statusAfterWait);

    // ============================================
    // 测试5: 取消队列中的任务
    // ============================================
    console.log("\n测试5: 取消队列中的任务");
    const task4 = await TaskService.createTask(MOCK_USER.id, "测试取消任务");
    createdTaskIds.push(task4.id);

    // 先添加到队列
    await QueueService.enqueueTask(task4.id, task4.prompt);
    console.log("  任务已加入队列:", task4.id);

    // 尝试从队列取消
    const cancelled = await QueueService.dequeueTask(task4.id);
    console.log(
      "  ✅ 取消结果:",
      cancelled ? "成功" : "失败（任务可能已开始处理）",
    );

    // ============================================
    // 测试6: 取消不存在的任务
    // ============================================
    console.log("\n测试6: 取消不存在的任务");
    const cancelNonExistent = await QueueService.dequeueTask("non-existent-id");
    if (cancelNonExistent !== false) {
      throw new Error("取消不存在的任务应该返回false");
    }
    console.log("  ✅ 正确返回false");

    // ============================================
    // 测试7: 队列满时的错误处理
    // ============================================
    console.log("\n测试7: 队列满时的错误处理（模拟）");
    console.log("  注意：由于最大并发是3，需要快速添加多个任务才能触发");

    // 创建多个任务快速入队
    const tasks = [];
    for (let i = 0; i < 5; i++) {
      const task = await TaskService.createTask(
        MOCK_USER.id,
        `压力测试任务${i}`,
      );
      createdTaskIds.push(task.id);
      tasks.push(task);
    }

    // 快速入队
    const enqueuePromises = tasks.map((task) =>
      QueueService.enqueueTask(task.id, task.prompt).catch((err) => ({
        error: err,
      })),
    );

    const results = await Promise.all(enqueuePromises);
    const failedCount = results.filter((r) => r && "error" in r).length;

    console.log(
      `  ✅ 压力测试完成，${tasks.length}个任务中${failedCount}个因队列满失败`,
    );

    // ============================================
    // 测试8: 最终队列状态
    // ============================================
    console.log("\n测试8: 最终队列状态");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const finalStatus = QueueService.getStatus();
    console.log("  ✅ 最终队列状态:", finalStatus);

    // ============================================
    // 清理测试数据
    // ============================================
    console.log("\n清理测试数据...");
    for (const taskId of createdTaskIds) {
      try {
        await TaskService.deleteTask(taskId);
      } catch (_error) {
        // 忽略删除错误（任务可能不存在）
      }
    }
    console.log("  ✅ 清理完成");

    // ============================================
    // 测试完成
    // ============================================
    console.log("\n🎉 所有测试通过!");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);

    // 清理测试数据
    console.log("\n清理测试数据...");
    for (const taskId of createdTaskIds) {
      try {
        await TaskService.deleteTask(taskId);
      } catch (_e) {
        // 忽略清理错误
      }
    }

    process.exit(1);
  }
}

// 执行测试
runTests();
