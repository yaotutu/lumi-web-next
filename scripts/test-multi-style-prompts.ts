/**
 * 测试多风格提示词生成功能
 * 使用方式: npx tsx scripts/test-multi-style-prompts.ts
 */

import { generateMultiStylePrompts } from "@/lib/services/prompt-optimizer";

// 测试用例
const testCases = ["一只猫", "一个花瓶", "一个机器人", "一只狗"];

async function testMultiStylePrompts() {
  console.log("🧪 开始测试多风格提示词生成功能\n");
  console.log("=".repeat(80));

  for (const testCase of testCases) {
    console.log(`\n📝 测试用例: "${testCase}"`);
    console.log("-".repeat(80));

    try {
      const variants = await generateMultiStylePrompts(testCase);

      console.log(`✅ 生成成功！共 ${variants.length} 个变体:\n`);

      variants.forEach((variant, index) => {
        console.log(`\n【变体 ${index + 1}】`);
        console.log(variant);
        console.log(`长度: ${variant.length} 字符`);
      });
    } catch (error) {
      console.error(`❌ 生成失败:`, error);
    }

    console.log("\n" + "=".repeat(80));
  }

  console.log("\n✨ 测试完成！");
}

// 执行测试
testMultiStylePrompts().catch((error) => {
  console.error("💥 测试失败:", error);
  process.exit(1);
});
