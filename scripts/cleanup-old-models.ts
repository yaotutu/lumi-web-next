#!/usr/bin/env tsx

/**
 * 清理旧模型数据脚本
 *
 * 删除不符合本地文件格式的模型数据：
 * - Model 表中 modelUrl 不以 /generated/models/ 开头的记录
 * - 相关的 ModelGenerationJob 和 ModelInteraction 记录
 *
 * 运行方式：
 * npx tsx scripts/cleanup-old-models.ts
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('CleanupOldModels');
const prisma = new PrismaClient();

async function main() {
  try {
    log.info('开始清理旧模型数据...');

    // 1. 查找所有模型数据
    const allModels = await prisma.model.findMany({
      select: {
        id: true,
        name: true,
        modelUrl: true,
        source: true,
        createdAt: true,
      },
    });

    log.info(`数据库中共有 ${allModels.length} 个模型记录`);

    // 2. 显示所有模型数据用于调试
    log.info('所有模型数据详情：');
    allModels.forEach(model => {
      log.info(`- ID: ${model.id}, 名称: ${model.name}, URL: ${model.modelUrl}, 来源: ${model.source}`);
    });

    // 3. 识别需要删除的旧数据（云端模型）
    const oldModels = allModels.filter(model => {
      // 删除条件：modelUrl 是腾讯云 COS 的 URL
      return model.modelUrl && model.modelUrl.includes('cos.ap-guangzhou.myqcloud.com');
    });

    log.info(`发现 ${oldModels.length} 个旧模型记录需要删除`);

    if (oldModels.length === 0) {
      log.info('没有发现需要清理的旧数据，退出。');
      return;
    }

    // 3. 显示将要删除的模型列表
    log.info('将要删除的模型列表：');
    oldModels.forEach(model => {
      log.info(`- ID: ${model.id}, 名称: ${model.name}, URL: ${model.modelUrl}, 创建时间: ${model.createdAt}`);
    });

    // 4. 删除相关数据（按外键依赖顺序）
    log.info('开始删除相关数据...');

    for (const model of oldModels) {
      log.info(`处理模型: ${model.name} (${model.id})`);

      // 4.1 删除模型交互记录
      const interactionCount = await prisma.modelInteraction.deleteMany({
        where: { modelId: model.id }
      });
      log.info(`删除了 ${interactionCount.count} 个交互记录`);

      // 4.2 删除模型生成任务记录
      const jobCount = await prisma.modelGenerationJob.deleteMany({
        where: { modelId: model.id }
      });
      log.info(`删除了 ${jobCount.count} 个生成任务记录`);

      // 4.3 删除模型记录
      await prisma.model.delete({
        where: { id: model.id }
      });
      log.info(`删除模型记录: ${model.name}`);
    }

    log.info(`✅ 清理完成！删除了 ${oldModels.length} 个旧模型及其相关数据`);

  } catch (error) {
    log.error('清理过程中出现错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行清理
main();