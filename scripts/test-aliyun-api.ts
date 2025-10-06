/**
 * 测试阿里云API调用
 */
import * as dotenv from "dotenv";
import { generateImages } from "../lib/providers/aliyun-image";

// 直接加载环境变量
dotenv.config({ path: ".env.local" });

console.log("🧪 测试阿里云API调用\n");

async function runTest() {
  try {
    console.log("开始调用阿里云API生成图片...");

    // 使用一个简单的提示词测试API
    const images = await generateImages("一只可爱的小猫", 1);

    console.log("✅ API调用成功!");
    console.log("生成的图片URL:", images[0]);

    console.log("\n🎉 API测试完成!");
  } catch (error) {
    console.error("❌ API调用失败:", error);
    process.exit(1);
  }
}

runTest();