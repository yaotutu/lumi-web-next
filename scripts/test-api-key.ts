/**
 * 测试阿里云API密钥是否有效
 */
import * as dotenv from "dotenv";

// 直接加载环境变量
dotenv.config({ path: ".env.local" });

console.log("🧪 测试阿里云API密钥\n");

console.log("环境变量:");
console.log("- ALIYUN_IMAGE_API_KEY:", process.env.ALIYUN_IMAGE_API_KEY ? "已配置" : "未配置");
console.log("- API_ENDPOINT:", process.env.ALIYUN_IMAGE_API_ENDPOINT || "使用默认值");

if (!process.env.ALIYUN_IMAGE_API_KEY) {
  console.error("❌ 错误: 未找到阿里云API密钥");
  process.exit(1);
}

console.log("✅ API密钥已配置，长度:", process.env.ALIYUN_IMAGE_API_KEY.length);

// 验证API密钥格式
const apiKey = process.env.ALIYUN_IMAGE_API_KEY;
if (!apiKey.startsWith("sk-")) {
  console.error("❌ 警告: API密钥格式可能不正确，应该以'sk-'开头");
} else {
  console.log("✅ API密钥格式正确");
}

console.log("\n🎉 环境变量配置检查完成!");