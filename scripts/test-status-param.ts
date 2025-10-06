async function testStatusParam() {
  console.log("🔍 测试status参数处理...\n");

  try {
    // 测试1: 不带任何参数
    console.log("Test 1: 不带任何参数");
    const res1 = await fetch("http://localhost:3001/api/tasks");
    const data1 = await res1.json();
    console.log("响应状态:", res1.status);
    console.log("响应数据长度:", data1.data?.length || 0);

    // 测试2: 带limit参数但不带status参数
    console.log("\nTest 2: 带limit参数但不带status参数");
    const res2 = await fetch("http://localhost:3001/api/tasks?limit=5");
    const data2 = await res2.json();
    console.log("响应状态:", res2.status);
    console.log("响应数据长度:", data2.data?.length || 0);

    // 测试3: 带status参数
    console.log("\nTest 3: 带status参数");
    const res3 = await fetch("http://localhost:3001/api/tasks?status=PENDING");
    const data3 = await res3.json();
    console.log("响应状态:", res3.status);
    console.log("响应数据长度:", data3.data?.length || 0);

    // 测试4: 带无效status参数
    console.log("\nTest 4: 带无效status参数");
    const res4 = await fetch("http://localhost:3001/api/tasks?status=INVALID");
    const data4 = await res4.json();
    console.log("响应状态:", res4.status);
    if (res4.status === 400) {
      console.log("错误信息:", data4.error);
    } else {
      console.log("响应数据长度:", data4.data?.length || 0);
    }

    console.log("\n✅ 所有测试完成!");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

testStatusParam();