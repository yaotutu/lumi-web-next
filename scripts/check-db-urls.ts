#!/usr/bin/env npx tsx

/**
 * 检查数据库中的URL格式
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUrls() {
  try {
    console.log('检查图片URLs:');
    const images = await prisma.generatedImage.findMany({
      where: { imageUrl: { not: null } },
      take: 5
    });

    images.forEach((img, index) => {
      console.log(`${index + 1}. ${img.imageUrl}`);
      console.log(`   是本地路径: ${img.imageUrl?.startsWith('/generated/')}`);
    });

    console.log('\n检查模型URLs:');
    const models = await prisma.model.findMany({
      where: { modelUrl: { not: null } },
      take: 3
    });

    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.modelUrl}`);
      console.log(`   是本地路径: ${model.modelUrl?.startsWith('/generated/')}`);
      console.log(`   预览图: ${model.previewImageUrl}`);
      console.log(`   预览图是本地路径: ${model.previewImageUrl?.startsWith('/generated/')}`);
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUrls();