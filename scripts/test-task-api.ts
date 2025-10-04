const API_BASE = "http://localhost:3000/api";

async function testTaskAPI() {
  console.log("🧪 Testing Task Management API...\n");

  let taskId: string;

  try {
    // 测试 1: 创建任务
    console.log("Test 1: Creating a task...");
    const createRes = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Test prompt for API testing" }),
    });
    const createData = await createRes.json();
    taskId = createData.data.id;
    console.log(`  ✅ Task created: ${taskId}`);
    console.log(`  Status: ${createData.data.status}`);

    // 测试 2: 获取任务详情
    console.log("\nTest 2: Fetching task details...");
    const getRes = await fetch(`${API_BASE}/tasks/${taskId}`);
    const getData = await getRes.json();
    console.log(`  ✅ Task fetched: ${getData.data.prompt}`);

    // 测试 3: 更新任务状态
    console.log("\nTest 3: Updating task status...");
    const updateRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "GENERATING_IMAGES" }),
    });
    const updateData = await updateRes.json();
    console.log(`  ✅ Task updated: ${updateData.data.status}`);

    // 测试 4: 添加图片记录
    console.log("\nTest 4: Adding image records...");
    for (let i = 0; i < 4; i++) {
      const imageRes = await fetch(`${API_BASE}/tasks/${taskId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `/generated/images/${taskId}/${i}.png`,
          index: i,
        }),
      });
      const imageData = await imageRes.json();
      console.log(`  ✅ Image ${i} added: ${imageData.data.url}`);
    }

    // 测试 5: 创建模型记录
    console.log("\nTest 5: Creating model record...");
    const modelRes = await fetch(`${API_BASE}/tasks/${taskId}/model`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Model" }),
    });
    const modelData = await modelRes.json();
    console.log(`  ✅ Model created: ${modelData.data.name}`);

    // 测试 6: 获取任务列表
    console.log("\nTest 6: Fetching task list...");
    const listRes = await fetch(`${API_BASE}/tasks`);
    const listData = await listRes.json();
    console.log(`  ✅ Tasks found: ${listData.count}`);

    // 测试 7: 删除任务
    console.log("\nTest 7: Deleting task...");
    const deleteRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: "DELETE",
    });
    const deleteData = await deleteRes.json();
    console.log(`  ✅ ${deleteData.message}`);

    console.log("\n✅ All API tests passed!");
  } catch (error) {
    console.error("❌ API test failed:", error);
    process.exit(1);
  }
}

testTaskAPI();
