async function testImprovedLogging() {
  console.log("🔍 测试改进的日志格式...\n");

  try {
    // 创建任务来触发日志
    console.log("创建任务以触发改进的日志...");
    const createRes = await fetch("http://localhost:3001/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "测试改进日志" }),
    });
    const createData = await createRes.json();
    console.log("任务创建响应:", createData.success ? "成功" : "失败");

    // 等待一段时间让任务处理完成
    console.log("\n等待任务处理完成...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("\n✅ 日志格式改进测试完成！");
    console.log("请查看开发服务器控制台输出，确认日志格式是否更清晰易懂。");

  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

testImprovedLogging();