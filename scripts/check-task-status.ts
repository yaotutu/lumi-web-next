/**
 * 临时脚本：检查任务状态
 *
 * 查看指定任务的完整状态信息
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 从命令行获取 taskId
  const taskId = process.argv[2];

  if (!taskId) {
    console.error("❌ 请提供 taskId");
    console.log("用法: npx tsx scripts/check-task-status.ts <taskId>");
    process.exit(1);
  }

  console.log(`\n🔍 检查任务: ${taskId}\n`);

  const request = await prisma.generationRequest.findUnique({
    where: { id: taskId },
    include: {
      images: {
        orderBy: { index: "asc" },
        select: {
          id: true,
          index: true,
          imageStatus: true,
          imageUrl: true,
          completedAt: true,
        },
      },
      model: {
        select: {
          id: true,
          name: true,
          modelUrl: true,
          format: true,
          sourceImageId: true,
          completedAt: true,
          failedAt: true,
          errorMessage: true,
          generationJob: {
            select: {
              id: true,
              status: true,
              progress: true,
            },
          },
        },
      },
    },
  });

  if (!request) {
    console.error(`❌ 任务不存在: ${taskId}`);
    process.exit(1);
  }

  console.log("📋 任务信息:");
  console.log(`  ID: ${request.id}`);
  console.log(`  Prompt: ${request.prompt}`);
  console.log(`  Status: ${request.status}`);
  console.log(`  Phase: ${request.phase}`);
  console.log(`  Selected Image Index: ${request.selectedImageIndex}`);
  console.log(`  Created At: ${request.createdAt}`);
  console.log(`  Completed At: ${request.completedAt}`);

  console.log(`\n🖼️  图片列表 (${request.images.length}):`);
  request.images.forEach((img) => {
    console.log(
      `  [${img.index}] ${img.imageStatus} ${img.imageUrl ? "✓" : "✗"} ${img.completedAt ? `(${img.completedAt.toISOString()})` : ""}`,
    );
  });

  console.log(`\n🎨 模型信息:`);
  if (request.model) {
    const model = request.model;
    console.log(`  ID: ${model.id}`);
    console.log(`  Name: ${model.name || "未命名"}`);
    console.log(`  Format: ${model.format}`);
    console.log(`  Source Image ID: ${model.sourceImageId}`);
    console.log(`  Model URL: ${model.modelUrl || "null"}`);
    console.log(`  Completed At: ${model.completedAt || "null"}`);
    console.log(`  Failed At: ${model.failedAt || "null"}`);
    console.log(`  Error: ${model.errorMessage || "null"}`);

    if (model.generationJob) {
      console.log(`\n  📊 Job 状态:`);
      console.log(`    ID: ${model.generationJob.id}`);
      console.log(`    Status: ${model.generationJob.status}`);
      console.log(`    Progress: ${model.generationJob.progress}%`);
    }
  } else {
    console.log(`  ❌ 无模型`);
  }

  console.log("\n");
}

main()
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
