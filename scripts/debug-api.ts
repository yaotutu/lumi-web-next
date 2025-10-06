async function debugAPI() {
  console.log("🔍 调试API响应结构...\n");

  try {
    // 创建任务
    console.log("Test 1: 创建任务");
    const createRes = await fetch("http://localhost:3001/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "调试测试" }),
    });
    const createData = await createRes.json();
    console.log("创建响应:", JSON.stringify(createData, null, 2));

    const taskId = createData.data.id;

    // 更新任务
    console.log("\nTest 2: 更新任务");
    const updateRes = await fetch(`http://localhost:3001/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "GENERATING_IMAGES" }),
    });
    const updateData = await updateRes.json();
    console.log("更新响应:", JSON.stringify(updateData, null, 2));
    if (!updateData.success) {
      console.log("错误详情:", updateData.details);
      // 如果没有details字段，尝试输出整个响应
      if (!updateData.details) {
        console.log("完整响应:", updateData);
      }
    }

    // 清理：删除任务
    console.log("\n清理: 删除任务");
    await fetch(`http://localhost:3001/api/tasks/${taskId}`, {
      method: "DELETE",
    });

  } catch (error) {
    console.error("❌ 调试失败:", error);
  }
}

debugAPI();