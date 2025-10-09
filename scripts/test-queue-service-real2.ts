/**
 * Queue Service 真实环境测试脚本 (直接加载环境变量)
 * 使用真实的阿里云API密钥测试队列功能
 */
import * as dotenv from "dotenv";
import { MOCK_USER } from "../lib/constants";
import * as QueueService from "../lib/services/queue-service";
import * as TaskService from "../lib/services/task-service";

// 直接加载环境变量
dotenv.config({ path: ".env.local" });

console.log("🧪 测试 Queue Service (真实环境 - 直接加载环境变量)\n");

async function runTests() {
  const createdTaskIds: string[] = [];

  try {
    console.log("环境变量设置:");
    console.log("- NEXT_PUBLIC_MOCK_MODE:", process.env.NEXT_PUBLIC_MOCK_MODE);
    console.log(
      "- ALIYUN_IMAGE_API_KEY:",
      process.env.ALIYUN_IMAGE_API_KEY ? "已配置" : "未配置",
    );
    console.log(
      "- API密钥长度:",
      process.env.ALIYUN_IMAGE_API_KEY?.length || 0,
    );
    console.log();

    // 验证API密钥是否存在
    if (!process.env.ALIYUN_IMAGE_API_KEY) {
      console.error("❌ 错误: 未找到阿里云API密钥");
      console.error("请确保.env.local文件中配置了ALIYUN_IMAGE_API_KEY");
      process.exit(1);
    }

    // 设置环境变量禁用MOCK模式
    process.env.NEXT_PUBLIC_MOCK_MODE = "false";

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
    const task1 = await TaskService.createTask(
      MOCK_USER.id,
      "一只可爱的小猫在花园里玩耍",
    );
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
    console.log("  等待15秒，观察任务处理...");

    // 等待足够时间让任务处理完成（真实API调用需要时间）
    await new Promise((resolve) => setTimeout(resolve, 15000));

    const statusAfterWait = QueueService.getStatus();
    console.log("  ✅ 等待后队列状态:", statusAfterWait);

    // 检查任务状态
    const taskAfterProcessing = await TaskService.getTaskById(task1.id);
    console.log("  任务状态:", taskAfterProcessing.status);
    console.log("  生成图片数:", taskAfterProcessing.images.length);

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
    console.log("\n🎉 真实环境测试完成!");
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
