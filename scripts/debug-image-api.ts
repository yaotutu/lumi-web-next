async function debugImageAPI() {
  console.log("🔍 调试图片API响应结构...\n");

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

    // 添加图片
    console.log("\nTest 2: 添加图片");
    const imageRes = await fetch(`http://localhost:3001/api/tasks/${taskId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `http://localhost:3001/generated/images/${taskId}/4.png`,
        index: 4,
      }),
    });
    const imageData = await imageRes.json();
    console.log("图片响应:", JSON.stringify(imageData, null, 2));

    // 清理：删除任务
    console.log("\n清理: 删除任务");
    await fetch(`http://localhost:3001/api/tasks/${taskId}`, {
      method: "DELETE",
    });

  } catch (error) {
    console.error("❌ 调试失败:", error);
  }
}

debugImageAPI();