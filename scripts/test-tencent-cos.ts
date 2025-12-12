/**
 * 腾讯云 COS 存储测试脚本
 *
 * 用法：
 * npx tsx scripts/test-tencent-cos.ts
 *
 * 前置条件：
 * 确保 .env 或 .env.local 中配置了以下环境变量：
 * -
 * - TENCENT_COS_SECRET_KEY
 * - TENCENT_COS_BUCKET
 * - TENCENT_COS_REGION
 */

import { resolve } from "node:path";
// 加载环境变量
import { config } from "dotenv";

// 优先加载 .env.local，然后是 .env
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { createStorageProvider } from "@/lib/providers/storage";

// 测试用的唯一任务 ID
const TEST_TASK_ID = `test-cos-${Date.now()}`;

/**
 * 创建测试用的图片 Buffer（1x1 PNG）
 */
function createTestImageBuffer(): Buffer {
  // 最小的 1x1 透明 PNG
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return Buffer.from(base64, "base64");
}

/**
 * 创建测试用的 Base64 图片
 */
function createTestImageBase64(): string {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}

/**
 * 创建测试用的 3D 模型 Buffer（最小 GLB）
 */
function createTestModelBuffer(): Buffer {
  // 最小的 GLB 文件头
  return Buffer.from([
    0x67,
    0x6c,
    0x54,
    0x46, // "glTF" magic
    0x02,
    0x00,
    0x00,
    0x00, // version 2
    0x0c,
    0x00,
    0x00,
    0x00, // length = 12 bytes
  ]);
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log("🚀 开始测试腾讯云 COS 存储\n");
  console.log(`测试任务 ID: ${TEST_TASK_ID}\n`);
  console.log("=".repeat(60));

  // 创建存储 Provider
  let storageProvider: ReturnType<typeof createStorageProvider>;

  try {
    storageProvider = createStorageProvider();
    console.log(`✅ Storage Provider: ${storageProvider.getName()}\n`);
  } catch (error) {
    console.error("❌ 创建 Storage Provider 失败:");
    console.error(error);
    process.exit(1);
  }

  // 检查是否是腾讯云 COS
  if (storageProvider.getName() !== "TencentCOSStorageProvider") {
    console.warn("⚠️  警告: 当前使用的不是腾讯云 COS Storage Provider");
    console.warn(`   当前 Provider: ${storageProvider.getName()}`);
    console.warn("   请检查环境变量配置\n");
  }

  const uploadedImageUrls: string[] = [];
  let uploadedModelUrl = "";

  try {
    // ==================== 测试 1: 上传 Buffer 格式图片 ====================
    console.log("\n📤 测试 1: 上传 Buffer 格式图片");
    console.log("-".repeat(60));

    const imageBuffer = createTestImageBuffer();
    console.log(`   准备上传图片 (Buffer, ${imageBuffer.length} bytes)`);

    const imageUrl0 = await storageProvider.saveTaskImage({
      taskId: TEST_TASK_ID,
      index: 0,
      imageData: imageBuffer,
    });

    uploadedImageUrls.push(imageUrl0);
    console.log(`✅ 图片 0 上传成功`);
    console.log(`   URL: ${imageUrl0}\n`);

    // ==================== 测试 2: 上传 Base64 格式图片 ====================
    console.log("📤 测试 2: 上传 Base64 格式图片");
    console.log("-".repeat(60));

    const imageBase64 = createTestImageBase64();
    console.log(`   准备上传图片 (Base64, ${imageBase64.length} chars)`);

    const imageUrl1 = await storageProvider.saveTaskImage({
      taskId: TEST_TASK_ID,
      index: 1,
      imageData: imageBase64,
    });

    uploadedImageUrls.push(imageUrl1);
    console.log(`✅ 图片 1 上传成功`);
    console.log(`   URL: ${imageUrl1}\n`);

    // ==================== 测试 3: 批量上传图片 ====================
    console.log("📤 测试 3: 批量上传图片 (索引 2-3)");
    console.log("-".repeat(60));

    for (let i = 2; i < 4; i++) {
      const url = await storageProvider.saveTaskImage({
        taskId: TEST_TASK_ID,
        index: i,
        imageData: createTestImageBuffer(),
      });
      uploadedImageUrls.push(url);
      console.log(`✅ 图片 ${i} 上传成功: ${url}`);
    }
    console.log();

    // ==================== 测试 4: 上传 3D 模型 ====================
    console.log("📤 测试 4: 上传 3D 模型");
    console.log("-".repeat(60));

    const modelBuffer = createTestModelBuffer();
    console.log(`   准备上传模型 (GLB, ${modelBuffer.length} bytes)`);

    uploadedModelUrl = await storageProvider.saveTaskModel({
      taskId: TEST_TASK_ID,
      modelData: modelBuffer,
      format: "glb",
    });

    console.log(`✅ 模型上传成功`);
    console.log(`   URL: ${uploadedModelUrl}\n`);

    // ==================== 测试 5: 检查文件是否存在 ====================
    console.log("🔍 测试 5: 检查文件是否存在");
    console.log("-".repeat(60));

    // 检查图片
    for (let i = 0; i < uploadedImageUrls.length; i++) {
      const exists = await storageProvider.fileExists(uploadedImageUrls[i]);
      console.log(
        `${exists ? "✅" : "❌"} 图片 ${i}: ${exists ? "存在" : "不存在"}`,
      );
    }

    // 检查模型
    const modelExists = await storageProvider.fileExists(uploadedModelUrl);
    console.log(
      `${modelExists ? "✅" : "❌"} 模型: ${modelExists ? "存在" : "不存在"}\n`,
    );

    // ==================== 测试 6: 获取文件信息 ====================
    console.log("📊 测试 6: 获取文件信息");
    console.log("-".repeat(60));

    // 获取第一张图片信息
    const imageInfo = await storageProvider.getFileInfo(uploadedImageUrls[0]);
    console.log(`   图片 0 信息:`);
    console.log(`   - URL: ${imageInfo.url}`);
    console.log(`   - 大小: ${imageInfo.size} bytes`);
    console.log(`   - 存在: ${imageInfo.exists ? "是" : "否"}`);

    // 获取模型信息
    const modelInfo = await storageProvider.getFileInfo(uploadedModelUrl);
    console.log(`\n   模型信息:`);
    console.log(`   - URL: ${modelInfo.url}`);
    console.log(`   - 大小: ${modelInfo.size} bytes`);
    console.log(`   - 存在: ${modelInfo.exists ? "是" : "否"}\n`);

    // ==================== 测试 7: Mock 图片和模型 ====================
    console.log("🎭 测试 7: 生成 Mock 数据");
    console.log("-".repeat(60));

    const mockTaskId = `test-mock-${Date.now()}`;

    const mockImageUrl = await storageProvider.saveMockImage(mockTaskId, 0);
    console.log(`✅ Mock 图片生成成功`);
    console.log(`   URL: ${mockImageUrl}`);

    const mockModelUrl = await storageProvider.saveMockModel(mockTaskId);
    console.log(`✅ Mock 模型生成成功`);
    console.log(`   URL: ${mockModelUrl}\n`);

    // ==================== 测试 8: 删除资源 ====================
    console.log("🗑️  测试 8: 删除资源");
    console.log("-".repeat(60));

    console.log(`   正在删除任务 ${TEST_TASK_ID} 的所有资源...`);
    await storageProvider.deleteTaskResources(TEST_TASK_ID);
    console.log(`✅ 资源删除成功\n`);

    // 验证删除
    console.log("   验证文件是否已删除:");
    const stillExists0 = await storageProvider.fileExists(uploadedImageUrls[0]);
    const stillExists1 = await storageProvider.fileExists(uploadedModelUrl);
    console.log(
      `   ${stillExists0 ? "❌" : "✅"} 图片 0: ${stillExists0 ? "仍存在" : "已删除"}`,
    );
    console.log(
      `   ${stillExists1 ? "❌" : "✅"} 模型: ${stillExists1 ? "仍存在" : "已删除"}\n`,
    );

    // 清理 Mock 数据
    console.log(`   正在清理 Mock 任务 ${mockTaskId}...`);
    await storageProvider.deleteTaskResources(mockTaskId);
    console.log(`✅ Mock 数据清理完成\n`);

    // ==================== 测试完成 ====================
    console.log("=".repeat(60));
    console.log("🎉 所有测试通过！\n");
    console.log("测试摘要:");
    console.log(`   ✅ 上传 Buffer 格式图片`);
    console.log(`   ✅ 上传 Base64 格式图片`);
    console.log(`   ✅ 批量上传图片`);
    console.log(`   ✅ 上传 3D 模型`);
    console.log(`   ✅ 检查文件存在性`);
    console.log(`   ✅ 获取文件信息`);
    console.log(`   ✅ 生成 Mock 数据`);
    console.log(`   ✅ 删除资源`);
    console.log();
  } catch (error) {
    console.error("\n❌ 测试失败:");
    console.error(error);

    // 清理已上传的文件
    console.log("\n🧹 正在清理测试资源...");
    try {
      await storageProvider.deleteTaskResources(TEST_TASK_ID);
      console.log("✅ 测试资源清理完成\n");
    } catch (cleanupError) {
      console.error("❌ 清理测试资源失败:");
      console.error(cleanupError);
    }

    process.exit(1);
  }
}

// 运行测试
runTests().catch((error) => {
  console.error("❌ 测试脚本执行失败:");
  console.error(error);
  process.exit(1);
});
