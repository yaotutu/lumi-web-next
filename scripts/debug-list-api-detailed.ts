async function debugListAPIDetailed() {
  console.log("🔍 调试任务列表API响应结构（详细）...\n");

  try {
    // 获取任务列表（无参数）
    console.log("Test 1: 获取任务列表（无参数）");
    const listRes1 = await fetch("http://localhost:3001/api/tasks");
    const listData1 = await listRes1.json();
    console.log("列表响应（无参数）:", JSON.stringify(listData1, null, 2));

    // 获取任务列表（带limit参数）
    console.log("\nTest 2: 获取任务列表（带limit参数）");
    const listRes2 = await fetch("http://localhost:3001/api/tasks?limit=10");
    const listData2 = await listRes2.json();
    console.log("列表响应（带limit参数）:", JSON.stringify(listData2, null, 2));

    // 获取任务列表（带status参数）
    console.log("\nTest 3: 获取任务列表（带status参数）");
    const listRes3 = await fetch("http://localhost:3001/api/tasks?status=PENDING");
    const listData3 = await listRes3.json();
    console.log("列表响应（带status参数）:", JSON.stringify(listData3, null, 2));

  } catch (error) {
    console.error("❌ 调试失败:", error);
  }
}

debugListAPIDetailed();