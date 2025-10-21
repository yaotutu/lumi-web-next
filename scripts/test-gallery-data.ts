/**
 * 测试脚本：创建模型画廊测试数据
 */

import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("开始创建测试数据...");

  // 1. 创建测试用户
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "测试用户",
    },
  });
  console.log("✅ 创建用户:", user.name);

  // 2. 创建公开的 UserAsset 测试数据
  const assets = await Promise.all([
    prisma.userAsset.create({
      data: {
        userId: user.id,
        source: "AI_GENERATED",
        name: "可爱的小猫咪模型",
        description: "一只可爱的小猫咪 3D 模型，适合用于游戏和动画。",
        modelUrl: "https://example.com/models/cat.obj",
        previewImageUrl: "/gallery/bat-bunny.webp",
        format: "OBJ",
        fileSize: 2500000, // 2.5 MB
        faceCount: 15000,
        vertexCount: 7500,
        quality: "高",
        visibility: "PUBLIC",
        publishedAt: new Date(),
        viewCount: 123,
        likeCount: 45,
        downloadCount: 12,
      },
    }),
    prisma.userAsset.create({
      data: {
        userId: user.id,
        source: "AI_GENERATED",
        name: "科幻飞船模型",
        description: "未来科幻风格的宇宙飞船，细节丰富。",
        modelUrl: "https://example.com/models/spaceship.glb",
        previewImageUrl: "/gallery/bat-bunny.webp",
        format: "GLB",
        fileSize: 3800000, // 3.8 MB
        faceCount: 25000,
        vertexCount: 12500,
        quality: "高",
        visibility: "PUBLIC",
        publishedAt: new Date(),
        viewCount: 256,
        likeCount: 89,
        downloadCount: 34,
      },
    }),
    prisma.userAsset.create({
      data: {
        userId: user.id,
        source: "USER_UPLOADED",
        name: "现代建筑模型",
        description: "简约现代风格的建筑设计模型。",
        modelUrl: "https://example.com/models/building.obj",
        previewImageUrl: "/gallery/bat-bunny.webp",
        format: "OBJ",
        fileSize: 4500000, // 4.5 MB
        faceCount: 35000,
        vertexCount: 17500,
        quality: "超高",
        visibility: "PUBLIC",
        publishedAt: new Date(),
        viewCount: 189,
        likeCount: 67,
        downloadCount: 23,
      },
    }),
  ]);

  console.log(`✅ 创建了 ${assets.length} 个公开模型`);

  // 3. 查询统计
  const totalPublic = await prisma.userAsset.count({
    where: {
      visibility: "PUBLIC",
      publishedAt: { not: null },
    },
  });

  console.log(`\n📊 统计结果:`);
  console.log(`- 公开模型总数: ${totalPublic}`);
  console.log(`- 测试数据创建完成！\n`);
}

main()
  .catch((e) => {
    console.error("❌ 创建测试数据失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
