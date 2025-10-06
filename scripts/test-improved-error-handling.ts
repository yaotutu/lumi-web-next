async function testImprovedErrorHandling() {
  console.log("🔍 测试改进的错误处理...\n");

  try {
    // 创建任务
    console.log("1. 创建任务");
    const createRes = await fetch("http://localhost:3001/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "测试改进错误处理" }),
    });
    const createData = await createRes.json();
    const taskId = createData.data.id;
    console.log("✓ 任务创建成功:", taskId);

    // 添加一张图片
    console.log("\n2. 添加第一张图片");
    const imageRes1 = await fetch(`http://localhost:3001/api/tasks/${taskId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `http://localhost:3001/generated/images/${taskId}/0.png`,
        index: 0,
      }),
    });
    const imageData1 = await imageRes1.json();
    console.log("第一张图片响应:", imageData1.success ? "成功" : "失败");

    // 等待一下确保数据库写入完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 尝试添加重复索引的图片
    console.log("\n3. 尝试添加重复索引的图片");
    const imageRes2 = await fetch(`http://localhost:3001/api/tasks/${taskId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `http://localhost:3001/generated/images/${taskId}/0_duplicate.png`,
        index: 0, // 重复索引
      }),
    });
    const imageData2 = await imageRes2.json();
    console.log("重复图片响应状态:", imageRes2.status);
    console.log("重复图片响应:", JSON.stringify(imageData2, null, 2));

    // 验证错误处理是否正确
    if (!imageData2.success && imageData2.code === "INVALID_STATE") {
      console.log("\n✅ 成功！重复图片被正确阻止，返回了预期的错误");
      console.log("错误信息:", imageData2.error);
    } else {
      console.log("\n❌ 失败！重复图片未被正确处理");
    }

    // 清理：删除任务
    console.log("\n4. 清理任务");
    await fetch(`http://localhost:3001/api/tasks/${taskId}`, {
      method: "DELETE",
    });
    console.log("✓ 任务已清理");

  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

testImprovedErrorHandling();