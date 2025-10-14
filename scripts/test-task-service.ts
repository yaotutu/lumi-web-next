/**
 * Task Service 测试脚本
 * 测试目标：验证所有任务管理函数的功能和错误处理
 */
import { MOCK_USER } from "../lib/constants";
import * as TaskService from "../lib/services/task-service";

console.log("🧪 测试 Task Service\n");

async function runTests() {
  let testTaskId: string | null = null;

  try {
    // ============================================
    // 测试1: 创建任务 - 正常流程
    // ============================================
    console.log("测试1: 创建任务 - 正常流程");
    const task = await TaskService.createTask(MOCK_USER.id, "测试提示词");
    testTaskId = task.id;

    if (!task.id) {
      throw new Error("任务ID不应为空");
    }
    if (task.prompt !== "测试提示词") {
      throw new Error("任务提示词不匹配");
    }
    if (task.status !== "IMAGE_PENDING") {
      throw new Error("初始状态应该是IMAGE_PENDING");
    }
    console.log("  ✅ 任务创建成功:", task.id);

    // ============================================
    // 测试2: 创建任务 - 验证空提示词
    // ============================================
    console.log("\n测试2: 创建任务 - 验证空提示词");
    try {
      await TaskService.createTask(MOCK_USER.id, "   ");
      console.log("  ❌ 应该抛出VALIDATION_ERROR错误");
      process.exit(1);
    } catch (error: any) {
      if (error.code === "VALIDATION_ERROR") {
        console.log("  ✅ 正确抛出验证错误:", error.message);
      } else {
        throw error;
      }
    }

    // ============================================
    // 测试3: 创建任务 - 验证提示词长度限制
    // ============================================
    console.log("\n测试3: 创建任务 - 验证提示词长度限制");
    const longPrompt = "a".repeat(501);
    try {
      await TaskService.createTask(MOCK_USER.id, longPrompt);
      console.log("  ❌ 应该抛出VALIDATION_ERROR错误");
      process.exit(1);
    } catch (error: any) {
      if (error.code === "VALIDATION_ERROR") {
        console.log("  ✅ 正确抛出长度限制错误:", error.message);
      } else {
        throw error;
      }
    }

    // ============================================
    // 测试4: 获取任务详情
    // ============================================
    console.log("\n测试4: 获取任务详情");
    const fetchedTask = await TaskService.getTaskById(task.id);
    if (fetchedTask.id !== task.id) {
      throw new Error("任务ID不匹配");
    }
    if (fetchedTask.prompt !== "测试提示词") {
      throw new Error("任务提示词不匹配");
    }
    console.log("  ✅ 任务查询成功:", fetchedTask.prompt);

    // ============================================
    // 测试5: 获取不存在的任务
    // ============================================
    console.log("\n测试5: 获取不存在的任务");
    try {
      await TaskService.getTaskById("non-existent-id");
      console.log("  ❌ 应该抛出NOT_FOUND错误");
      process.exit(1);
    } catch (error: any) {
      if (error.code === "NOT_FOUND") {
        console.log("  ✅ 正确抛出NOT_FOUND错误:", error.message);
      } else {
        throw error;
      }
    }

    // ============================================
    // 测试6: 更新任务 - 设置选中图片索引
    // ============================================
    console.log("\n测试6: 更新任务 - 设置选中图片索引");
    const updatedTask = await TaskService.updateTask(task.id, {
      selectedImageIndex: 2,
    });
    if (updatedTask.selectedImageIndex !== 2) {
      throw new Error("选中图片索引不匹配");
    }
    console.log("  ✅ 任务更新成功，选中索引:", updatedTask.selectedImageIndex);

    // ============================================
    // 测试7: 更新任务 - 验证图片索引范围
    // ============================================
    console.log("\n测试7: 更新任务 - 验证图片索引范围");
    try {
      await TaskService.updateTask(task.id, { selectedImageIndex: 5 });
      console.log("  ❌ 应该抛出VALIDATION_ERROR错误");
      process.exit(1);
    } catch (error: any) {
      if (error.code === "VALIDATION_ERROR") {
        console.log("  ✅ 正确抛出索引范围错误:", error.message);
      } else {
        throw error;
      }
    }

    // ============================================
    // 测试8: 获取任务列表
    // ============================================
    console.log("\n测试8: 获取任务列表");
    const tasks = await TaskService.listTasks(MOCK_USER.id, { limit: 5 });
    if (tasks.length === 0) {
      throw new Error("任务列表不应为空");
    }
    const foundTask = tasks.find((t) => t.id === task.id);
    if (!foundTask) {
      throw new Error("应该能找到刚创建的任务");
    }
    console.log("  ✅ 任务列表查询成功，共", tasks.length, "个任务");

    // ============================================
    // 测试9: 按状态筛选任务
    // ============================================
    console.log("\n测试9: 按状态筛选任务");
    const pendingTasks = await TaskService.listTasks(MOCK_USER.id, {
      status: "IMAGE_PENDING",
      limit: 10,
    });
    const allPending = pendingTasks.every((t) => t.status === "IMAGE_PENDING");
    if (!allPending) {
      throw new Error("所有任务状态应该是IMAGE_PENDING");
    }
    console.log("  ✅ 状态筛选成功，共", pendingTasks.length, "个IMAGE_PENDING任务");

    // ============================================
    // 测试10: 取消任务 - 正常流程
    // ============================================
    console.log("\n测试10: 取消任务 - 正常流程");
    const cancelledTask = await TaskService.cancelTask(task.id);
    if (cancelledTask.id !== task.id) {
      throw new Error("取消的任务ID不匹配");
    }
    // 验证任务已标记为失败
    const taskAfterCancel = await TaskService.getTaskById(task.id);
    if (taskAfterCancel.status !== "FAILED") {
      throw new Error("取消后状态应该是FAILED");
    }
    if (taskAfterCancel.errorMessage !== "用户取消") {
      throw new Error("错误消息应该是'用户取消'");
    }
    console.log("  ✅ 任务取消成功");

    // ============================================
    // 测试11: 取消已完成的任务 - 应该失败
    // ============================================
    console.log("\n测试11: 取消已完成的任务 - 应该失败");
    try {
      await TaskService.cancelTask(task.id);
      console.log("  ❌ 应该抛出INVALID_STATE错误");
      process.exit(1);
    } catch (error: any) {
      if (error.code === "INVALID_STATE") {
        console.log("  ✅ 正确抛出INVALID_STATE错误:", error.message);
      } else {
        throw error;
      }
    }

    // ============================================
    // 测试12: 删除任务
    // ============================================
    console.log("\n测试12: 删除任务");
    await TaskService.deleteTask(task.id);
    // 验证任务已被删除
    try {
      await TaskService.getTaskById(task.id);
      console.log("  ❌ 删除后不应该能找到任务");
      process.exit(1);
    } catch (error: any) {
      if (error.code === "NOT_FOUND") {
        console.log("  ✅ 任务删除成功");
      } else {
        throw error;
      }
    }

    // ============================================
    // 测试完成
    // ============================================
    console.log("\n🎉 所有测试通过!");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    // 清理：如果创建了测试任务，尝试删除
    if (testTaskId) {
      try {
        await TaskService.deleteTask(testTaskId);
        console.log("已清理测试任务:", testTaskId);
      } catch (_e) {
        // 忽略清理错误
      }
    }
    process.exit(1);
  }
}

// 执行测试
runTests();
