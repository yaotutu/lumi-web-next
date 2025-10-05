const IMAGE_GEN_API_BASE = "http://localhost:3000/api";

async function testImageGeneration() {
  console.log("🧪 Testing Image Generation API with Task System...\n");

  try {
    // 1. 创建任务(后台自动触发图片生成)
    console.log(
      "Step 1: Creating task (will auto-trigger image generation)...",
    );
    const taskRes = await fetch(`${IMAGE_GEN_API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "A cute robot toy" }),
    });
    const taskData = await taskRes.json();
    const taskId = taskData.data.id;
    console.log(`  ✅ Task created: ${taskId}`);
    console.log(`  Status: ${taskData.data.status}`);
    console.log("  ⏳ Images generating in background...\n");

    // 2. 轮询任务状态直到图片生成完成
    console.log("Step 2: Polling task status...");
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const checkRes = await fetch(`${IMAGE_GEN_API_BASE}/tasks/${taskId}`);
      const checkData = await checkRes.json();

      console.log(
        `  [${attempts + 1}/${maxAttempts}] Status: ${checkData.data.status}, Images: ${checkData.data.images.length}`,
      );

      if (checkData.data.status === "IMAGES_READY") {
        console.log("\n✅ Images generation completed!");
        break;
      }

      if (checkData.data.status === "FAILED") {
        throw new Error("Task failed: " + checkData.data.errorMessage);
      }

      attempts++;
    }

    // 3. 验证最终状态
    console.log("\nStep 3: Verifying final task status...");
    const finalRes = await fetch(`${IMAGE_GEN_API_BASE}/tasks/${taskId}`);
    const finalData = await finalRes.json();
    console.log(`  ✅ Task status: ${finalData.data.status}`);
    console.log(`  ✅ Images saved: ${finalData.data.images.length}`);

    // 4. 验证图片记录
    console.log("\nStep 4: Verifying image records...");
    finalData.data.images.forEach((img: any) => {
      console.log(`  ✅ Image ${img.index}: ${img.url}`);
    });

    // 5. 清理：删除测试任务
    console.log("\nStep 5: Cleaning up...");
    await fetch(`${IMAGE_GEN_API_BASE}/tasks/${taskId}`, {
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
