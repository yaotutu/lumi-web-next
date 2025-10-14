/**
 * 测试"粉色残暴公牛"的提示词生成
 * 使用方式: npx tsx scripts/test-bull-prompt.ts
 */

import { generateMultiStylePrompts } from "@/lib/services/prompt-optimizer";

async function testBull() {
  console.log("🧪 测试优化后的提示词：粉色残暴公牛\n");

  const testInput = "一只粉色的残暴公牛，暴怒的表情";
  console.log(`📝 测试输入: "${testInput}"\n`);

  try {
    const variants = await generateMultiStylePrompts(testInput);

    console.log(`✅ 生成成功！共 ${variants.length} 个变体:\n`);

    variants.forEach((variant, index) => {
      console.log(`【变体 ${index + 1}】`);
      console.log(variant);
      console.log(`长度: ${variant.length} 字符`);

      // 检查问题关键词
      const issues = [];
      if (variant.includes("火焰") && !variant.includes("避免"))
        issues.push("❌ 包含火焰");
      if (variant.includes("尖锐") && !variant.includes("避免"))
        issues.push("❌ 包含尖锐");
      if (variant.includes("牙齿") && !variant.includes("无"))
        issues.push("❌ 包含牙齿");
      if (variant.includes("爪")) issues.push("❌ 包含爪子");
      if (variant.includes("嵌入")) issues.push("❌ 包含嵌入设计");
      if (variant.includes("装甲") && !variant.includes("避免"))
        issues.push("❌ 包含装甲");
      if (variant.includes("缝隙")) issues.push("❌ 包含缝隙");

      if (issues.length > 0) {
        console.log("⚠️  潜在问题:", issues.join(", "));
      } else {
        console.log("✅ 无明显3D打印问题");
      }
      console.log();
    });
  } catch (error) {
    console.error(`❌ 生成失败:`, error);
  }
}

testBull().catch((error) => {
  console.error("💥 测试失败:", error);
  process.exit(1);
});
