#!/usr/bin/env node

/**
 * 测试模型可见性设置
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 检查最新的模型记录...\n");

  // 获取最新的模型记录
  const latestModel = await prisma.model.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!latestModel) {
    console.log("❌ 没有找到模型记录");
    return;
  }

  console.log("📋 最新模型信息:");
  console.log(`  ID: ${latestModel.id}`);
  console.log(`  名称: ${latestModel.name}`);
  console.log(`  来源: ${latestModel.source}`);
  console.log(`  可见性: ${latestModel.visibility}`);
  console.log(`  创建时间: ${latestModel.createdAt.toISOString()}`);
  console.log(
    `  发布时间: ${latestModel.publishedAt?.toISOString() || "未设置"}`,
  );
  console.log(
    `  完成时间: ${latestModel.completedAt?.toISOString() || "未完成"}`,
  );
  console.log(`  创建者: ${latestModel.user.name}`);
  console.log(`  模型URL: ${latestModel.modelUrl || "未生成"}`);

  // 检查是否符合预期
  const isAIGenerated = latestModel.source === "AI_GENERATED";
  const isPublic = latestModel.visibility === "PUBLIC";
  const hasPublishedAt = !!latestModel.publishedAt;

  console.log("\n✅ 验证结果:");
  console.log(`  AI生成模型: ${isAIGenerated ? "✅" : "❌"}`);
  console.log(`  公开可见: ${isPublic ? "✅" : "❌"}`);
  console.log(`  有发布时间: ${hasPublishedAt ? "✅" : "❌"}`);

  if (isAIGenerated && isPublic && hasPublishedAt) {
    console.log("\n🎉 新模型将会出现在模型广场中！");
  } else {
    console.log("\n⚠️ 模型设置可能有问题，请检查。");
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
