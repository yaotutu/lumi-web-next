async function comprehensiveImageAPITest() {
  console.log("🔍 全面测试图片API功能...\n");

  try {
    // 1. 创建任务
    console.log("Test 1: 创建任务");
    const createRes = await fetch("http://localhost:3001/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "全面测试" }),
    });
    const createData = await createRes.json();
    console.log("✓ 任务创建成功:", createData.data.id);

    const taskId = createData.data.id;

    // 2. 添加多张图片
    console.log("\nTest 2: 添加多张图片");
    for (let i = 0; i < 3; i++) {
      const imageRes = await fetch(`http://localhost:3001/api/tasks/${taskId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `http://localhost:3001/generated/images/${taskId}/${i}.png`,
          index: i,
        }),
      });
      const imageData = await imageRes.json();

      if (imageData.success) {
        console.log(`✓ 图片 ${i} 添加成功`);
      } else {
        console.log(`✗ 图片 ${i} 添加失败:`, imageData.error);
      }
    }

    // 3. 尝试添加重复索引的图片
    console.log("\nTest 3: 尝试添加重复索引的图片");
    const duplicateRes = await fetch(`http://localhost:3001/api/tasks/${taskId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `http://localhost:3001/generated/images/${taskId}/1_duplicate.png`,
        index: 1, // 重复索引
      }),
    });
    const duplicateData = await duplicateRes.json();

    if (!duplicateData.success && duplicateData.code === "INVALID_STATE") {
      console.log("✓ 成功阻止重复图片添加:", duplicateData.error);
    } else {
      console.log("✗ 未能正确处理重复图片");
    }

    // 4. 获取任务详情，验证图片数据
    console.log("\nTest 4: 验证任务图片数据");
    const taskRes = await fetch(`http://localhost:3001/api/tasks/${taskId}`);
    const taskData = await taskRes.json();

    if (taskData.success && taskData.data.images.length === 3) {
      console.log("✓ 任务图片数据正确，共", taskData.data.images.length, "张图片");
      taskData.data.images.forEach((img: any, idx: number) => {
        console.log(`  图片${idx}: 索引${img.index}, URL: ${img.url}`);
      });
    } else {
      console.log("✗ 任务图片数据不正确");
    }

    // 5. 尝试为不存在的任务添加图片
    console.log("\nTest 5: 尝试为不存在的任务添加图片");
    const invalidTaskRes = await fetch(`http://localhost:3001/api/tasks/invalid_task_id/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `http://localhost:3001/generated/images/invalid/0.png`,
        index: 0,
      }),
    });
    const invalidTaskData = await invalidTaskRes.json();

    if (!invalidTaskData.success && invalidTaskData.code === "NOT_FOUND") {
      console.log("✓ 成功处理不存在任务的图片添加:", invalidTaskData.error);
    } else {
      console.log("✗ 未能正确处理不存在任务的图片添加");
    }

    // 清理：删除任务
    console.log("\n清理: 删除任务");
    await fetch(`http://localhost:3001/api/tasks/${taskId}`, {
      method: "DELETE",
    });
    console.log("✓ 测试完成，任务已清理");

  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

comprehensiveImageAPITest();