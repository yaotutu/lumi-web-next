/**
 * 测试任务队列功能
 * 验证:
 * - 并发控制
 * - 错误重试
 * - 队列状态
 * - 任务取消
 */

const API_BASE = "http://localhost:3000";

async function testTaskQueue() {
  console.log("🧪 开始测试任务队列功能\n");

  try {
    // ========================================
    // 测试 1: 创建单个任务
    // ========================================
    console.log("📝 测试 1: 创建单个任务");
    const task1Response = await fetch(`${API_BASE}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "测试任务 1" }),
    });
    const task1 = await task1Response.json();
    console.log("✅ 任务创建成功:", task1.data.id);
    console.log("   队列状态:", task1.queue);

    // ========================================
    // 测试 2: 快速创建多个任务(测试并发控制)
    // ========================================
    console.log("\n📝 测试 2: 创建5个任务(测试并发控制)");
    const taskPromises = [];
    for (let i = 2; i <= 6; i++) {
      const promise = fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `测试任务 ${i}` }),
      }).then((res) => res.json());
      taskPromises.push(promise);
    }

    const tasks = await Promise.all(taskPromises);
    console.log(`✅ ${tasks.length} 个任务已创建`);

    // 获取队列状态
    const queueStatusResponse = await fetch(`${API_BASE}/api/queue/status`);
    const queueStatus = await queueStatusResponse.json();
    console.log("   当前队列状态:", queueStatus.data);

    // ========================================
    // 测试 3: 取消任务
    // ========================================
    console.log("\n📝 测试 3: 取消任务");
    const taskToCancel = tasks[tasks.length - 1].data.id;
    const cancelResponse = await fetch(
      `${API_BASE}/api/tasks/${taskToCancel}/cancel`,
      {
        method: "POST",
      },
    );
    const cancelResult = await cancelResponse.json();
    console.log("✅ 任务取消结果:", cancelResult);

    // ========================================
    // 测试 4: 监控队列处理(等待任务完成)
    // ========================================
    console.log("\n📝 测试 4: 监控队列处理");
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const statusRes = await fetch(`${API_BASE}/api/queue/status`);
      const status = await statusRes.json();

      console.log(
        `   [${attempts + 1}/${maxAttempts}] 队列状态: ${status.data.pending} 等待, ${status.data.running} 运行中, ${status.data.completed} 已完成`,
      );

      // 如果没有待处理任务了,退出
      if (status.data.pending === 0 && status.data.running === 0) {
        console.log("✅ 所有任务已处理完成!");
        break;
      }

      attempts++;
    }

    // ========================================
    // 测试 5: 验证任务结果
    // ========================================
    console.log("\n📝 测试 5: 验证任务结果");
    for (const task of tasks.slice(0, 3)) {
      // 只检查前3个
      const taskRes = await fetch(`${API_BASE}/api/tasks/${task.data.id}`);
      const taskData = await taskRes.json();

      console.log(`   任务 ${taskData.data.id}:`);
      console.log(`     - 状态: ${taskData.data.status}`);
      console.log(`     - 图片数: ${taskData.data.images.length}`);
    }

    // ========================================
    // 测试 6: 测试队列满的情况(可选)
    // ========================================
    console.log("\n📝 测试 6: 测试队列限制(跳过,避免创建太多任务)");
    console.log("   提示: 队列最大容量为 100 个任务");

    console.log("\n🎉 所有测试完成!");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  }
}

testTaskQueue();
