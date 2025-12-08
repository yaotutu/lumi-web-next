#!/usr/bin/env tsx

/**
 * 清理孤立的历史数据脚本（简化版）
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('CleanupOrphanedDataSimple');
const prisma = new PrismaClient();

async function main() {
  try {
    log.info('开始检查孤立的历史数据...');

    // 1. 检查云端模型相关的 GenerationRequest
    const cloudModelRequests = await prisma.$queryRaw`
      SELECT DISTINCT gr.id, gr.prompt, gr.createdAt
      FROM GenerationRequest gr
      JOIN Model m ON gr.id = m.requestId
      WHERE m.modelUrl LIKE '%cos.ap-guangzhou.myqcloud.com%' OR m.modelUrl LIKE '%tencentcos%'
    ` as any[];

    log.info(`发现 ${cloudModelRequests.length} 个包含云端模型的生成请求`);

    // 2. 检查云端图片相关的 GenerationRequest
    const cloudImageRequests = await prisma.$queryRaw`
      SELECT DISTINCT gr.id, gr.prompt, gr.createdAt
      FROM GenerationRequest gr
      JOIN GeneratedImage gi ON gr.id = gi.requestId
      WHERE gi.imageUrl LIKE '%cos.ap-guangzhou.myqcloud.com%' OR gi.imageUrl LIKE '%tencentcos%'
    ` as any[];

    log.info(`发现 ${cloudImageRequests.length} 个包含云端图片的生成请求`);

    // 合并去重
    const requestIdsToDelete = [
      ...cloudModelRequests.map(r => r.id),
      ...cloudImageRequests.map(r => r.id)
    ].filter((id, index, arr) => arr.indexOf(id) === index);

    log.info(`需要删除的生成请求总数: ${requestIdsToDelete.length}`);

    if (requestIdsToDelete.length === 0) {
      log.info('没有发现需要清理的孤立数据，退出。');
      return;
    }

    // 3. 显示将要删除的数据
    log.info('将要删除的生成请求：');
    requestIdsToDelete.forEach(id => {
      log.info(`- 请求ID: ${id}`);
    });

    // 4. 按步骤删除（严格按照外键依赖顺序）
    for (const requestId of requestIdsToDelete) {
      log.info(`处理请求: ${requestId}`);

      // 4.1 获取相关图片和模型ID
      const images = await prisma.generatedImage.findMany({
        where: { requestId },
        select: { id: true, imageUrl: true }
      });

      const models = await prisma.model.findMany({
        where: { requestId },
        select: { id: true, modelUrl: true }
      });

      const imageIds = images.map(i => i.id);
      const modelIds = models.map(m => m.id);

      // 4.2 删除Job记录（最底层，无依赖）
      if (imageIds.length > 0) {
        const imageJobCount = await prisma.imageGenerationJob.deleteMany({
          where: { imageId: { in: imageIds } }
        });
        log.info(`删除了 ${imageJobCount.count} 个图片任务记录`);
      }

      if (modelIds.length > 0) {
        const modelJobCount = await prisma.modelGenerationJob.deleteMany({
          where: { modelId: { in: modelIds } }
        });
        log.info(`删除了 ${modelJobCount.count} 个模型任务记录`);
      }

      // 4.3 删除模型交互记录
      if (modelIds.length > 0) {
        const interactionCount = await prisma.modelInteraction.deleteMany({
          where: { modelId: { in: modelIds } }
        });
        log.info(`删除了 ${interactionCount.count} 个模型交互记录`);
      }

      // 4.4 删除图片记录（依赖于GenerationRequest，需要先删除）
      if (images.length > 0) {
        const imageCount = await prisma.generatedImage.deleteMany({
          where: { requestId }
        });
        log.info(`删除了 ${imageCount.count} 个图片记录`);
      }

      // 4.5 删除模型记录
      if (models.length > 0) {
        const modelCount = await prisma.model.deleteMany({
          where: { requestId }
        });
        log.info(`删除了 ${modelCount.count} 个模型记录`);
      }

      // 4.6 最后删除生成请求记录（最顶层）
      await prisma.generationRequest.delete({
        where: { id: requestId }
      });
      log.info(`删除生成请求记录: ${requestId}`);
    }

    log.info(`✅ 清理完成！删除了 ${requestIdsToDelete.length} 个云端相关的请求及其历史数据`);

  } catch (error) {
    log.error('清理过程中出现错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行清理
main();