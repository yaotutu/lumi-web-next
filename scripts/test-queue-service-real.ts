/**
 * Queue Service 真实环境测试脚本
 * 使用真实的阿里云API密钥测试队列功能
 */
import * as QueueService from "../lib/services/queue-service";
import * as TaskService from "../lib/services/task-service";
import { MOCK_USER } from "../lib/constants";

console.log("🧪 测试 Queue Service (真实环境)\n");

async function runTests() {
  const createdTaskIds: string[] = [];

  try {
    // 设置环境变量禁用MOCK模式
    process.env.NEXT_PUBLIC_MOCK_MODE = "false";

    console.log("环境变量设置:");
    console.log("- NEXT_PUBLIC_MOCK_MODE:", process.env.NEXT_PUBLIC_MOCK_MODE);
    console.log("- ALIYUN_IMAGE_API_KEY:", process.env.ALIYUN_IMAGE_API_KEY ? "已配置" : "未配置");
    console.log();

    // ============================================
    // 测试1: 获取队列状态
    // ============================================
    console.log("测试1: 获取队列状态");
    const initialStatus = QueueService.getStatus();
    console.log("  ✅ 队列状态查询成功:", initialStatus);

    // ============================================
    // 测试2: 添加任务到队列 - 正常流程
    // ============================================
    console.log("\n测试2: 添加任务到队列 - 正常流程");
    const task1 = await TaskService.createTask(MOCK_USER.id, "一只可爱的小猫在花园里玩耍");
    createdTaskIds.push(task1.id);

    await QueueService.enqueueTask(task1.id, task1.prompt);
    console.log("  ✅ 任务已加入队列:", task1.id);

    // 验证队列状态变化
    const statusAfterEnqueue = QueueService.getStatus();
    console.log("  队列状态:", statusAfterEnqueue);

    // ============================================
    // 测试3: 等待任务处理完成
    // ============================================
    console.log("\n测试3: 等待任务处理完成");
    console.log("  等待10秒，观察任务处理...");

    // 等待足够时间让任务处理完成（真实API调用需要时间）
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const statusAfterWait = QueueService.getStatus();
    console.log("  ✅ 等待后队列状态:", statusAfterWait);

    // 检查任务状态
    const taskAfterProcessing = await TaskService.getTaskById(task1.id);
    console.log("  任务状态:", taskAfterProcessing.status);
    console.log("  生成图片数:", taskAfterProcessing.images.length);

    // ============================================
    // 测试4: 批量添加任务
    // ============================================
    console.log("\n测试4: 批量添加任务到队列");
    const task2 = await TaskService.createTask(MOCK_USER.id, "一个现代风格的客厅设计");
    const task3 = await TaskService.createTask(MOCK_USER.id, "一只金毛犬在海边奔跑");
    createdTaskIds.push(task2.id, task3.id);

    await QueueService.enqueueTask(task2.id, task2.prompt);
    await QueueService.enqueueTask(task3.id, task3.prompt);

    console.log("  ✅ 批量添加成功");

    // ============================================
    // 测试5: 等待批量任务处理
    // ============================================
    console.log("\n测试5: 等待批量任务处理");
    console.log("  等待15秒，观察批量任务处理...");
    await new Promise((resolve) => setTimeout(resolve, 15000));

    const finalStatus = QueueService.getStatus();
    console.log("  ✅ 最终队列状态:", finalStatus);

    // 检查批量任务状态
    const task2AfterProcessing = await TaskService.getTaskById(task2.id);
    const task3AfterProcessing = await TaskService.getTaskById(task3.id);
    console.log("  任务2状态:", task2AfterProcessing.status, `(${task2AfterProcessing.images.length}张图片)`);
    console.log("  任务3状态:", task3AfterProcessing.status, `(${task3AfterProcessing.images.length}张图片)`);

    // ============================================
    // 测试6: 并发控制测试
    // ============================================
    console.log("\n测试6: 并发控制测试");
    const concurrentTasks = [];
    for (let i = 0; i < 5; i++) {
      const task = await TaskService.createTask(
        MOCK_USER.id,
        `并发测试任务${i + 1} - 一个美丽的风景画`
      );
      createdTaskIds.push(task.id);
      concurrentTasks.push(task);
    }

    // 快速添加多个任务到队列
    console.log("  快速添加5个任务到队列...");
    for (const task of concurrentTasks) {
      try {
        await QueueService.enqueueTask(task.id, task.prompt);
        console.log(`    任务${task.id}已加入队列`);
      } catch (error: any) {
        console.log(`    任务${task.id}加入队列失败:`, error.message);
      }
    }

    // 等待并发任务处理
    console.log("  等待20秒，观察并发任务处理...");
    await new Promise((resolve) => setTimeout(resolve, 20000));

    const finalConcurrentStatus = QueueService.getStatus();
    console.log("  ✅ 并发测试后队列状态:", finalConcurrentStatus);

    // 检查并发任务状态
    for (const task of concurrentTasks) {
      try {
        const taskStatus = await TaskService.getTaskById(task.id);
        console.log(`    任务${task.id.substring(0, 8)}...状态:`, taskStatus.status, `(${taskStatus.images.length}张图片)`);
      } catch (error) {
        console.log(`    任务${task.id.substring(0, 8)}...查询失败:`, error);
      }
    }

    // ============================================
    // 清理测试数据
    // ============================================
    console.log("\n清理测试数据...");
    for (const taskId of createdTaskIds) {
      try {
        await TaskService.deleteTask(taskId);
      } catch (error) {
        // 忽略删除错误（任务可能不存在）
      }
    }
    console.log("  ✅ 清理完成");

    // ============================================
    // 测试完成
    // ============================================
    console.log("\n🎉 所有真实环境测试完成!");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);

    // 清理测试数据
    console.log("\n清理测试数据...");
    for (const taskId of createdTaskIds) {
      try {
        await TaskService.deleteTask(taskId);
      } catch (e) {
        // 忽略清理错误
      }
    }

    process.exit(1);
  }
}

// 执行测试
runTests();
