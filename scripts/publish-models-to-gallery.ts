/**
 * 脚本：将现有的 GeneratedModel 发布到模型画廊
 *
 * 功能：
 * 1. 查询所有已完成的 GeneratedModel（有 modelUrl）
 * 2. 为每个 GeneratedModel 创建对应的 UserAsset
 * 3. 设置为 PUBLIC 并发布到模型画廊
 */

import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("🚀 开始发布模型到画廊...\n");

  // 1. 查询所有已完成的 GeneratedModel（有 modelUrl 且没有对应的 UserAsset）
  const models = await prisma.generatedModel.findMany({
    where: {
      modelUrl: {
        not: null,
      },
      userAsset: null, // 还没有创建 UserAsset
    },
    include: {
      request: {
        include: {
          user: true,
        },
      },
      sourceImage: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log(`📊 找到 ${models.length} 个待发布的模型\n`);

  if (models.length === 0) {
    console.log("✅ 所有模型已发布，无需操作");
    return;
  }

  // 2. 为每个 GeneratedModel 创建 UserAsset
  let publishedCount = 0;

  for (const model of models) {
    try {
      // 计算文件大小（如果有）
      let fileSize: number | null = null;
      if (model.modelUrl) {
        // 可以从 URL 获取，或者设置为默认值
        fileSize = 3000000; // 默认 3MB
      }

      // 创建 UserAsset
      const userAsset = await prisma.userAsset.create({
        data: {
          userId: model.request.userId,
          source: "AI_GENERATED",
          generatedModelId: model.id,
          name: model.name || "未命名模型",
          description: `由 AI 生成的 3D 模型，基于提示词：${model.request.prompt}`,
          modelUrl: model.modelUrl!,
          previewImageUrl: model.sourceImage?.imageUrl || null,
          format: model.format || "OBJ",
          fileSize,
          faceCount: model.faceCount,
          vertexCount: model.vertexCount,
          quality: model.quality,
          visibility: "PUBLIC", // 发布为公开
          publishedAt: new Date(),
          viewCount: 0,
          likeCount: 0,
          downloadCount: 0,
        },
      });

      publishedCount++;
      console.log(
        `✅ [${publishedCount}/${models.length}] 发布模型: ${userAsset.name}`,
      );
    } catch (error) {
      console.error(
        `❌ 发布模型失败 (${model.id}): ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  console.log(`\n🎉 发布完成！共发布 ${publishedCount} 个模型到画廊`);

  // 3. 统计最终结果
  const totalPublic = await prisma.userAsset.count({
    where: {
      visibility: "PUBLIC",
      publishedAt: { not: null },
    },
  });

  console.log(`\n📊 最终统计:`);
  console.log(`- 模型画廊公开模型总数: ${totalPublic}`);
}

main()
  .catch((e) => {
    console.error("❌ 脚本执行失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
