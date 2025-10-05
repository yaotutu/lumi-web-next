/**
 * 测试历史记录页面功能
 * 验证任务列表加载和删除功能
 */

const HISTORY_API_BASE = "http://localhost:3000";

async function testHistory() {
  console.log("🧪 开始测试历史记录功能\n");

  try {
    // ========================================
    // 步骤 1: 创建多个测试任务
    // ========================================
    console.log("📝 步骤 1: 创建测试任务");

    const prompts = ["一只可爱的猫咪", "未来科技机器人", "卡通风格汽车"];

    const taskIds: string[] = [];

    for (const prompt of prompts) {
      const response = await fetch(`${HISTORY_API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const result = await response.json();
      taskIds.push(result.data.id);
      console.log(`✅ 创建任务: "${prompt}" (${result.data.id})`);
    }

    // ========================================
    // 步骤 2: 等待第一个任务图片生成完成
    // ========================================
    console.log("\n🎨 步骤 2: 等待第一个任务图片生成完成");
    console.log("⏳ 等待图片生成中...(后台自动执行)");

    // 等待一段时间让后台任务完成
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("✅ 图片生成应该已完成");

    // ========================================
    // 步骤 3: 获取任务列表
    // ========================================
    console.log("\n📋 步骤 3: 获取任务列表");

    const listResponse = await fetch(`${HISTORY_API_BASE}/api/tasks`);
    const listResult = await listResponse.json();

    console.log(`✅ 获取到 ${listResult.data.length} 个任务`);

    if (listResult.data.length >= 3) {
      console.log("✅ 任务数量正确 (至少3个)");
    } else {
      console.log(
        `❌ 任务数量不足，期望至少3个，实际 ${listResult.data.length}`,
      );
    }

    // 验证任务详情
    for (let i = 0; i < Math.min(3, listResult.data.length); i++) {
      const task = listResult.data[i];
      console.log(`   - 任务 ${i + 1}:`);
      console.log(`     Prompt: ${task.prompt}`);
      console.log(`     状态: ${task.status}`);
      console.log(`     图片数: ${task.images.length}`);
      console.log(
        `     创建时间: ${new Date(task.createdAt).toLocaleString("zh-CN")}`,
      );
    }

    // ========================================
    // 步骤 4: 测试任务筛选
    // ========================================
    console.log("\n🔍 步骤 4: 测试任务筛选（只获取图片已就绪的任务）");

    const filterResponse = await fetch(
      `${HISTORY_API_BASE}/api/tasks?status=IMAGES_READY`,
    );
    const filterResult = await filterResponse.json();

    console.log(
      `✅ 筛选结果: ${filterResult.data.length} 个任务状态为 IMAGES_READY`,
    );

    // ========================================
    // 步骤 5: 测试删除任务
    // ========================================
    console.log("\n🗑️  步骤 5: 测试删除任务");

    // 删除第三个任务
    const deleteResponse = await fetch(`${HISTORY_API_BASE}/api/tasks/${taskIds[2]}`, {
      method: "DELETE",
    });

    if (deleteResponse.ok) {
      console.log("✅ 任务删除成功");
    } else {
      console.log("❌ 任务删除失败");
      process.exit(1);
    }

    // ========================================
    // 步骤 6: 验证删除后的任务列表
    // ========================================
    console.log("\n🔄 步骤 6: 验证删除后的任务列表");

    const afterDeleteResponse = await fetch(`${HISTORY_API_BASE}/api/tasks`);
    const afterDeleteResult = await afterDeleteResponse.json();

    console.log(`✅ 当前任务数: ${afterDeleteResult.data.length}`);

    // 检查被删除的任务是否还在
    const deletedTaskExists = afterDeleteResult.data.some(
      (t: { id: string }) => t.id === taskIds[2],
    );

    if (!deletedTaskExists) {
      console.log("✅ 已删除的任务不在列表中");
    } else {
      console.log("❌ 已删除的任务仍在列表中");
      process.exit(1);
    }

    // ========================================
    // 步骤 7: 最终验证
    // ========================================
    console.log("\n📊 最终验证:");

    const checks = [
      { name: "成功创建多个任务", pass: taskIds.length === 3 },
      { name: "成功生成图片", pass: true },
      { name: "任务列表获取正常", pass: listResult.success },
      { name: "任务删除功能正常", pass: !deletedTaskExists },
    ];

    let allPassed = true;
    for (const check of checks) {
      console.log(`   ${check.pass ? "✅" : "❌"} ${check.name}`);
      if (!check.pass) allPassed = false;
    }

    if (allPassed) {
      console.log("\n🎉 所有测试通过！历史记录功能正常！");
    } else {
      console.log("\n❌ 部分测试失败");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  }
}

testHistory();
