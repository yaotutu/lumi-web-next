/**
 * 临时脚本：修复 Request 状态
 *
 * 用途：检查所有请求，如果图片都完成了但 Request 状态还是 IMAGE_PENDING/IMAGE_GENERATING，
 *       则更新为 IMAGE_COMPLETED / AWAITING_SELECTION
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 开始检查需要修复的请求...\n");

  // 查询所有处于图片生成阶段的请求
  const requests = await prisma.generationRequest.findMany({
    where: {
      phase: "IMAGE_GENERATION",
    },
    include: {
      images: {
        select: {
          imageStatus: true,
          imageUrl: true,
        },
      },
    },
  });

  console.log(`找到 ${requests.length} 个处于图片生成阶段的请求\n`);

  let fixedCount = 0;

  for (const request of requests) {
    console.log(`检查请求: ${request.id}`);
    console.log(`  当前状态: ${request.status}`);
    console.log(`  当前阶段: ${request.phase}`);

    // 检查所有图片的状态
    const allCompleted = request.images.every(
      (img) => img.imageStatus === "COMPLETED" && img.imageUrl !== null,
    );

    if (allCompleted) {
      console.log(`  ✅ 所有图片已完成，需要更新状态`);

      // 更新请求状态
      await prisma.generationRequest.update({
        where: { id: request.id },
        data: {
          status: "IMAGE_COMPLETED",
          phase: "AWAITING_SELECTION",
        },
      });

      console.log(`  ✨ 已更新为: IMAGE_COMPLETED / AWAITING_SELECTION\n`);
      fixedCount++;
    } else {
      const completedCount = request.images.filter(
        (img) => img.imageStatus === "COMPLETED",
      ).length;
      console.log(
        `  ⏳ 图片未全部完成 (${completedCount}/${request.images.length})\n`,
      );
    }
  }

  console.log(`\n✅ 修复完成！共修复 ${fixedCount} 个请求`);
}

main()
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
