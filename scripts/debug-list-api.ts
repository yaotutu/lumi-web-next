async function debugListAPI() {
  console.log("🔍 调试任务列表API响应结构...\n");

  try {
    // 获取任务列表
    console.log("Test 1: 获取任务列表");
    const listRes = await fetch("http://localhost:3001/api/tasks");
    const listData = await listRes.json();
    console.log("列表响应:", JSON.stringify(listData, null, 2));

  } catch (error) {
    console.error("❌ 调试失败:", error);
  }
}

debugListAPI();