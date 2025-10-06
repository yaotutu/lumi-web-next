async function testDuplicateImageHandling() {
  console.log("🔍 测试重复图片添加的错误处理...\n");

  try {
    // 创建任务
    console.log("Test 1: 创建任务");
    const createRes = await fetch("http://localhost:3001/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "测试重复图片" }),
    });
    const createData = await createRes.json();
    console.log("创建响应:", JSON.stringify(createData, null, 2));

    const taskId = createData.data.id;

    // 添加第一张图片
    console.log("\nTest 2: 添加第一张图片");
    const imageRes1 = await fetch(`http://localhost:3001/api/tasks/${taskId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `http://localhost:3001/generated/images/${taskId}/1.png`,
        index: 1,
      }),
    });
    const imageData1 = await imageRes1.json();
    console.log("第一张图片响应:", JSON.stringify(imageData1, null, 2));

    // 尝试添加重复索引的图片（应该失败）
    console.log("\nTest 3: 尝试添加重复索引的图片");
    const imageRes2 = await fetch(`http://localhost:3001/api/tasks/${taskId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `http://localhost:3001/generated/images/${taskId}/1_duplicate.png`,
        index: 1, // 重复索引
      }),
    });
    const imageData2 = await imageRes2.json();
    console.log("重复图片响应:", JSON.stringify(imageData2, null, 2));

    // 检查是否正确返回了错误
    if (!imageData2.success && imageData2.code === "INVALID_STATE") {
      console.log("\n✅ 成功捕获重复图片错误！");
      console.log("错误信息:", imageData2.error);
    } else {
      console.log("\n❌ 未正确处理重复图片错误");
    }

    // 清理：删除任务
    console.log("\n清理: 删除任务");
    await fetch(`http://localhost:3001/api/tasks/${taskId}`, {
      method: "DELETE",
    });

  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

testDuplicateImageHandling();