async function debugZodErrors() {
  console.log("🔍 详细调试Zod验证错误...\n");

  try {
    // 测试1: 不带任何参数
    console.log("Test 1: 不带任何参数");
    const res1 = await fetch("http://localhost:3001/api/tasks");
    const data1 = await res1.json();
    console.log("响应状态:", res1.status);
    console.log("响应数据:", JSON.stringify(data1, null, 2));

    // 测试2: 带limit参数但不带status参数
    console.log("\nTest 2: 带limit参数但不带status参数");
    const res2 = await fetch("http://localhost:3001/api/tasks?limit=5");
    const data2 = await res2.json();
    console.log("响应状态:", res2.status);
    console.log("响应数据:", JSON.stringify(data2, null, 2));

    // 测试3: 带status参数
    console.log("\nTest 3: 带status参数");
    const res3 = await fetch("http://localhost:3001/api/tasks?status=PENDING");
    const data3 = await res3.json();
    console.log("响应状态:", res3.status);
    console.log("响应数据:", JSON.stringify(data3, null, 2));

    // 测试4: 带无效status参数
    console.log("\nTest 4: 带无效status参数");
    const res4 = await fetch("http://localhost:3001/api/tasks?status=INVALID");
    const data4 = await res4.json();
    console.log("响应状态:", res4.status);
    console.log("响应数据:", JSON.stringify(data4, null, 2));

    console.log("\n✅ 所有调试完成!");
  } catch (error) {
    console.error("❌ 调试失败:", error);
  }
}

debugZodErrors();