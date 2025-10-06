/**
 * 测试工作台页面任务集成
 * 验证从首页创建任务 → 工作台生成图片 → 选择图片的完整流程
 */

const WORKSPACE_API_BASE = "http://localhost:3004";

async function testWorkspaceIntegration() {
  console.log("🧪 开始测试工作台任务集成\n");

  try {
    // ========================================
    // 步骤 1: 创建任务（模拟从首页跳转，后台自动触发图片生成）
    // ========================================
    console.log("📝 步骤 1: 创建新任务");
    const createResponse = await fetch(`${WORKSPACE_API_BASE}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "一个现代风格的椅子",
      }),
    });

    const createResult = await createResponse.json();
    console.log("✅ 任务创建成功:", createResult.data.id);
    console.log("   - 状态:", createResult.data.status);
    console.log("   - Prompt:", createResult.data.prompt);
    console.log("   ⏳ 后台正在自动生成图片...");

    const taskId = createResult.data.id;

    // ========================================
    // 步骤 2: 轮询任务状态（模拟工作台页面轮询）
    // ========================================
    console.log("\n🔄 步骤 2: 轮询任务状态，等待图片生成完成");
    let attempts = 0;
    const maxAttempts = 20;
    let currentTask = createResult.data;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const loadResponse = await fetch(
        `${WORKSPACE_API_BASE}/api/tasks/${taskId}`,
      );
      const loadResult = await loadResponse.json();
      currentTask = loadResult.data;

      console.log(
        `   [${attempts + 1}/${maxAttempts}] 状态: ${currentTask.status}, 图片数: ${currentTask.images.length}`,
      );

      if (currentTask.status === "IMAGES_READY") {
        console.log("✅ 图片生成完成!");
        break;
      }

      if (currentTask.status === "FAILED") {
        throw new Error("任务失败: " + currentTask.errorMessage);
      }

      attempts++;
    }

    // ========================================
    // 步骤 3: 验证图片已保存
    // ========================================
    console.log("\n📥 步骤 3: 验证图片已保存到数据库");
    console.log("✅ 任务数据:");
    console.log("   - 图片数量:", currentTask.images.length);
    console.log("   - 任务状态:", currentTask.status);

    if (currentTask.images.length === 4) {
      console.log("✅ 图片数量正确 (4张)");
    } else {
      console.log(
        "❌ 图片数量错误，期望 4 张，实际",
        currentTask.images.length,
      );
    }

    // ========================================
    // 步骤 4: 选择图片（模拟用户点击选择）
    // ========================================
    console.log("\n👆 步骤 4: 选择第 2 张图片");
    const selectResponse = await fetch(
      `${WORKSPACE_API_BASE}/api/tasks/${taskId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedImageIndex: 1, // 选择索引 1
        }),
      },
    );

    const selectResult = await selectResponse.json();
    console.log("✅ 图片选择已保存");
    console.log("   - 选中索引:", selectResult.data.selectedImageIndex);

    // ========================================
    // 步骤 5: 验证完整流程
    // ========================================
    console.log("\n🔍 步骤 5: 最终验证");
    const finalResponse = await fetch(
      `${WORKSPACE_API_BASE}/api/tasks/${taskId}`,
    );
    const finalResult = await finalResponse.json();

    console.log("✅ 最终任务状态:");
    console.log("   - ID:", finalResult.data.id);
    console.log("   - 状态:", finalResult.data.status);
    console.log("   - Prompt:", finalResult.data.prompt);
    console.log("   - 图片数量:", finalResult.data.images.length);
    console.log("   - 选中索引:", finalResult.data.selectedImageIndex);

    // 验证结果
    const checks = [
      {
        name: "任务状态为 IMAGES_READY",
        pass: finalResult.data.status === "IMAGES_READY",
      },
      { name: "图片数量为 4", pass: finalResult.data.images.length === 4 },
      { name: "选中索引为 1", pass: finalResult.data.selectedImageIndex === 1 },
    ];

    console.log("\n📊 验证结果:");
    let allPassed = true;
    for (const check of checks) {
      console.log(`   ${check.pass ? "✅" : "❌"} ${check.name}`);
      if (!check.pass) allPassed = false;
    }

    if (allPassed) {
      console.log("\n🎉 所有测试通过！工作台任务集成正常！");
    } else {
      console.log("\n❌ 部分测试失败");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  }
}

testWorkspaceIntegration();
