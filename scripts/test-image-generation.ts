const API_BASE = "http://localhost:3000/api";

async function testImageGeneration() {
  console.log("🧪 Testing Image Generation API with Task System...\n");

  try {
    // 1. 创建任务
    console.log("Step 1: Creating task...");
    const taskRes = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "A cute robot toy" }),
    });
    const taskData = await taskRes.json();
    const taskId = taskData.data.id;
    console.log(`  ✅ Task created: ${taskId}`);
    console.log(`  Status: ${taskData.data.status}\n`);

    // 2. 调用图片生成 API（流式）
    console.log("Step 2: Generating images (streaming)...");
    const response = await fetch(`${API_BASE}/generate-images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        prompt: "A cute robot toy",
        count: 4,
        stream: true,
      }),
    });

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));

          if (data.type === "image") {
            console.log(`  ✅ Image ${data.index}: ${data.url}`);
          } else if (data.type === "done") {
            console.log(`\n✅ All ${data.total} images generated!`);
          } else if (data.type === "error") {
            console.error(`❌ Error: ${data.message}`);
          }
        }
      }
    }

    // 3. 验证任务状态
    console.log("\nStep 3: Verifying task status...");
    const checkRes = await fetch(`${API_BASE}/tasks/${taskId}`);
    const checkData = await checkRes.json();
    console.log(`  ✅ Task status: ${checkData.data.status}`);
    console.log(`  ✅ Images saved: ${checkData.data.images.length}`);

    // 4. 验证图片记录
    console.log("\nStep 4: Verifying image records...");
    checkData.data.images.forEach((img: any) => {
      console.log(`  ✅ Image ${img.index}: ${img.url}`);
    });

    // 5. 清理：删除测试任务
    console.log("\nStep 5: Cleaning up...");
    await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: "DELETE",
    });
    console.log(`  ✅ Test task deleted`);

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testImageGeneration();
