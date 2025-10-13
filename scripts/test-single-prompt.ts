/**
 * 测试单个多风格提示词生成
 * 使用方式: npx tsx scripts/test-single-prompt.ts
 */

import { generateMultiStylePrompts } from "@/lib/services/prompt-optimizer";

async function testSingle() {
  console.log("🧪 测试多风格提示词生成功能\n");

  const testInput = "一只猫";
  console.log(`📝 测试输入: "${testInput}"\n`);

  try {
    const variants = await generateMultiStylePrompts(testInput);

    console.log(`✅ 生成成功！共 ${variants.length} 个变体:\n`);

    variants.forEach((variant, index) => {
      console.log(`【变体 ${index + 1}】`);
      console.log(variant);
      console.log(`长度: ${variant.length} 字符\n`);
    });
  } catch (error) {
    console.error(`❌ 生成失败:`, error);
  }
}

testSingle().catch((error) => {
  console.error("💥 测试失败:", error);
  process.exit(1);
});
