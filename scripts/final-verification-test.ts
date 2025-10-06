async function finalVerificationTest() {
  console.log("🔍 最终验证测试...\n");

  try {
    // 1. 创建任务
    console.log("1. 创建任务");
    const createRes = await fetch("http://localhost:3001/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "最终验证" }),
    });
    const createData = await createRes.json();
    const taskId = createData.data.id;
    console.log("✓ 任务创建成功:", taskId);

    // 2. 添加几张不同的图片
    console.log("\n2. 添加不同的图片");
    for (let i = 0; i < 3; i++) {
      const imageRes = await fetch(
        `http://localhost:3001/api/tasks/${taskId}/images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: `http://localhost:3001/generated/images/${taskId}/${i}.png`,
            index: i,
          }),
        },
      );
      const imageData = await imageRes.json();

      if (imageData.success) {
        console.log(`✓ 图片 ${i} 添加成功`);
      } else {
        console.log(`✗ 图片 ${i} 添加失败:`, imageData.error);
      }
    }

    // 3. 尝试添加重复索引的图片
    console.log("\n3. 尝试添加重复索引的图片");
    const duplicateRes = await fetch(
      `http://localhost:3001/api/tasks/${taskId}/images`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `http://localhost:3001/generated/images/${taskId}/1_duplicate.png`,
          index: 1, // 重复索引
        }),
      },
    );
    const duplicateData = await duplicateRes.json();

    if (!duplicateData.success && duplicateData.code === "INVALID_STATE") {
      console.log("✓ 成功阻止重复图片添加:", duplicateData.error);
    } else {
      console.log("✗ 未能正确处理重复图片");
    }

    // 4. 获取任务详情，验证图片数据
    console.log("\n4. 验证任务图片数据");
    const taskRes = await fetch(`http://localhost:3001/api/tasks/${taskId}`);
    const taskData = await taskRes.json();

    if (taskData.success) {
      console.log("✓ 任务数据获取成功");
      console.log("  图片数量:", taskData.data.images.length);
      taskData.data.images.forEach((img: any) => {
        console.log(`  图片索引${img.index}: ${img.url}`);
      });
    } else {
      console.log("✗ 任务数据获取失败");
    }

    // 5. 尝试为不存在的任务添加图片
    console.log("\n5. 尝试为不存在的任务添加图片");
    const invalidTaskRes = await fetch(
      `http://localhost:3001/api/tasks/invalid_task_id/images`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `http://localhost:3001/generated/images/invalid/0.png`,
          index: 0,
        }),
      },
    );
    const invalidTaskData = await invalidTaskRes.json();

    if (!invalidTaskData.success && invalidTaskData.code === "NOT_FOUND") {
      console.log("✓ 成功处理不存在任务的图片添加:", invalidTaskData.error);
    } else {
      console.log("✗ 未能正确处理不存在任务的图片添加");
    }

    // 6. 清理：删除任务
    console.log("\n6. 清理任务");
    const deleteRes = await fetch(`http://localhost:3001/api/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (deleteRes.ok) {
      console.log("✓ 任务已清理");
    } else {
      console.log("✗ 任务清理失败");
    }

    console.log("\n🎉 所有测试完成！");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

finalVerificationTest();
