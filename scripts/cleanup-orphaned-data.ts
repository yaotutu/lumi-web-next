#!/usr/bin/env tsx

/**
 * 清理孤立的历史数据脚本
 *
 * 删除与已删除云端模型相关的 GenerationRequest 和 GeneratedImage 记录
 * 这些记录指向不存在的云端资源，会导致工作台显示不完整
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('CleanupOrphanedData');
const prisma = new PrismaClient();

async function main() {
  try {
    log.info('开始清理孤立的历史数据...');

    // 1. 查找所有生成请求
    const allRequests = await prisma.generationRequest.findMany({
      include: {
        models: true,
        images: true,
      },
    });

    log.info(`数据库中共有 ${allRequests.length} 个生成请求`);

    // 2. 识别需要删除的请求（包含云端模型或云端图片的）
    const requestsToDelete = allRequests.filter(request => {
      const hasCloudModels = request.models.some(model =>
        model.modelUrl && (
          model.modelUrl.includes('cos.ap-guangzhou.myqcloud.com') ||
          model.modelUrl.includes('tencentcos.cn')
        )
      );

      const hasCloudImages = request.images.some(image =>
        image.imageUrl && (
          image.imageUrl.includes('cos.ap-guangzhou.myqcloud.com') ||
          image.imageUrl.includes('tencentcos.cn')
        )
      );

      return hasCloudModels || hasCloudImages;
    });

    log.info(`发现 ${requestsToDelete.length} 个包含云端数据的请求需要删除`);

    if (requestsToDelete.length === 0) {
      log.info('没有发现需要清理的孤立数据，退出。');
      return;
    }

    // 3. 显示将要删除的数据
    log.info('将要删除的请求详情：');
    requestsToDelete.forEach(request => {
      const cloudModels = request.models.filter(m =>
        m.modelUrl && (m.modelUrl.includes('cos') || m.modelUrl.includes('tencentcos'))
      );
      const cloudImages = request.images.filter(i =>
        i.imageUrl && (i.imageUrl.includes('cos') || i.imageUrl.includes('tencentcos'))
      );

      log.info(`- 请求ID: ${request.id}`);
      log.info(`  提示词: ${request.prompt}`);
      log.info(`  云端模型: ${cloudModels.length} 个`);
      log.info(`  云端图片: ${cloudImages.length} 个`);
      log.info(`  创建时间: ${request.createdAt}`);
    });

    // 4. 删除相关数据（按外键依赖顺序）
    log.info('开始删除相关数据...');

    for (const request of requestsToDelete) {
      log.info(`处理请求: ${request.prompt} (${request.id})`);

      // 4.1 删除相关的 ModelGenerationJob 记录
      const modelJobIds = request.models.map(m => m.id).filter(Boolean);
      if (modelJobIds.length > 0) {
        const jobCount = await prisma.modelGenerationJob.deleteMany({
          where: { modelId: { in: modelJobIds } }
        });
        log.info(`删除了 ${jobCount.count} 个模型生成任务记录`);
      }

      // 4.2 删除模型记录
      if (modelJobIds.length > 0) {
        const modelCount = await prisma.model.deleteMany({
          where: { id: { in: modelJobIds } }
        });
        log.info(`删除了 ${modelCount.count} 个模型记录`);
      }

      // 4.3 删除相关的 ImageGenerationJob 记录
      const imageJobIds = request.images.map(i => i.id).filter(Boolean);
      if (imageJobIds.length > 0) {
        const imageJobCount = await prisma.imageGenerationJob.deleteMany({
          where: { imageId: { in: imageJobIds } }
        });
        log.info(`删除了 ${imageJobCount.count} 个图片生成任务记录`);
      }

      // 4.4 删除图片记录
      if (imageJobIds.length > 0) {
        const imageCount = await prisma.generatedImage.deleteMany({
          where: { id: { in: imageJobIds } }
        });
        log.info(`删除了 ${imageCount.count} 个图片记录`);
      }

      // 4.5 删除生成请求记录
      await prisma.generationRequest.delete({
        where: { id: request.id }
      });
      log.info(`删除生成请求记录: ${request.prompt}`);
    }

    log.info(`✅ 清理完成！删除了 ${requestsToDelete.length} 个云端相关的请求及其历史数据`);

  } catch (error) {
    log.error('清理过程中出现错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行清理
main();