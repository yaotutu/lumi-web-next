#!/usr/bin/env npx tsx

/**
 * OSS对象存储本地化迁移脚本
 *
 * 功能：
 * 1. 扫描数据库中的外部OSS URL
 * 2. 下载文件到本地storage目录
 * 3. 更新数据库中的URL路径为本地路径
 * 4. 支持断点续传和进度追踪
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 类型定义
interface MigrationStats {
  totalImages: number;
  totalModels: number;
  migratedImages: number;
  migratedModels: number;
  failedImages: number;
  failedModels: number;
  skippedImages: number;  // 已经是本地路径
  skippedModels: number;
}

interface LocalPath {
  imageUrl: string;
  modelUrl: string;
  previewImageUrl: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  // 本地存储根目录
  storageRoot: path.join(process.cwd(), 'storage'),
  imagesDir: path.join(process.cwd(), 'storage', 'images'),
  modelsDir: path.join(process.cwd(), 'storage', 'models'),

  // COS域名识别
  cosDomains: [
    '.myqcloud.com',
    '.tencentcos.cn',
    '.aliyuncs.com',
    '.siliconflow.cn'
  ],

  // 本地路径前缀（数据库中存储的路径）
  localImagePath: '/generated/images/',
  localModelPath: '/generated/models/'
};

// 工具函数
class Logger {
  private prefix = '[迁移脚本]';

  info(message: string, ...args: any[]) {
    console.log(`\x1b[36m${this.prefix} [INFO]\x1b[0m ${message}`, ...args);
  }

  success(message: string, ...args: any[]) {
    console.log(`\x1b[32m${this.prefix} [SUCCESS]\x1b[0m ${message}`, ...args);
  }

  warn(message: string, ...args: any[]) {
    console.log(`\x1b[33m${this.prefix} [WARN]\x1b[0m ${message}`, ...args);
  }

  error(message: string, ...args: any[]) {
    console.log(`\x1b[31m${this.prefix} [ERROR]\x1b[0m ${message}`, ...args);
  }

  progress(current: number, total: number, type: string) {
    const percentage = ((current / total) * 100).toFixed(1);
    process.stdout.write(`\r${this.prefix} [进度] ${type}: ${current}/${total} (${percentage}%)`);
  }
}

const log = new Logger();

// 初始化目录
function ensureDirectories() {
  const dirs = [CONFIG.storageRoot, CONFIG.imagesDir, CONFIG.modelsDir];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.info(`创建目录: ${dir}`);
    }
  });
}

// 判断是否为外部OSS URL
function isExternalUrl(url: string | null): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    return CONFIG.cosDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

// 判断是否已经是本地路径
function isLocalPath(url: string | null): boolean {
  if (!url) return false;
  return url.startsWith(CONFIG.localImagePath) || url.startsWith(CONFIG.localModelPath);
}

// 从URL提取文件扩展名
function getFileExtension(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const ext = path.extname(pathname);
    return ext || '.png'; // 默认扩展名
  } catch {
    return '.png';
  }
}

// 生成本地文件路径
function generateLocalPath(url: string, requestId: string, index: number, type: 'image' | 'model'): string {
  if (type === 'image') {
    return `${CONFIG.localImagePath}${requestId}/${index}${getFileExtension(url)}`;
  } else {
    // model类型：从URL提取文件名或使用ID
    const ext = getFileExtension(url);
    return `${CONFIG.localModelPath}${requestId}${ext}`;
  }
}

// 将数据库URL转换为实际文件系统路径
function toFileSystemPath(dbPath: string): string {
  if (dbPath.startsWith(CONFIG.localImagePath)) {
    const relativePath = dbPath.replace(CONFIG.localImagePath, '');
    return path.join(CONFIG.imagesDir, relativePath);
  } else if (dbPath.startsWith(CONFIG.localModelPath)) {
    const relativePath = dbPath.replace(CONFIG.localModelPath, '');
    return path.join(CONFIG.modelsDir, relativePath);
  }
  throw new Error(`无效的本地路径格式: ${dbPath}`);
}

// 下载文件
async function downloadFile(url: string, localPath: string): Promise<void> {
  try {
    log.info(`下载文件: ${url}`);

    // 确保目录存在
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 如果文件已存在，跳过下载
    if (fs.existsSync(localPath)) {
      log.warn(`文件已存在，跳过: ${localPath}`);
      return;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(localPath, Buffer.from(buffer));

    log.success(`下载完成: ${localPath}`);
  } catch (error) {
    log.error(`下载失败: ${url} -> ${localPath}`, error);
    throw error;
  }
}

// 主迁移函数
async function migrate(): Promise<void> {
  const prisma = new PrismaClient();
  const stats: MigrationStats = {
    totalImages: 0,
    totalModels: 0,
    migratedImages: 0,
    migratedModels: 0,
    failedImages: 0,
    failedModels: 0,
    skippedImages: 0,
    skippedModels: 0
  };

  try {
    log.info('开始OSS对象存储本地化迁移...');
    ensureDirectories();

    // 迁移GeneratedImage表
    log.info('开始迁移图片数据...');
    const images = await prisma.generatedImage.findMany({
      where: {
        imageUrl: {
          not: null
        }
      }
    });

    stats.totalImages = images.length;
    log.info(`找到 ${stats.totalImages} 张图片需要处理`);

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      try {
        if (isLocalPath(image.imageUrl)) {
          log.warn(`图片已经是本地路径，跳过: ${image.imageUrl}`);
          stats.skippedImages++;
          continue;
        }

        if (!isExternalUrl(image.imageUrl)) {
          log.warn(`图片URL不是外部OSS链接，跳过: ${image.imageUrl}`);
          stats.skippedImages++;
          continue;
        }

        // 生成本地路径
        const localDbPath = generateLocalPath(image.imageUrl, image.requestId, image.index, 'image');
        const localFilePath = toFileSystemPath(localDbPath);

        // 下载文件
        await downloadFile(image.imageUrl, localFilePath);

        // 更新数据库
        await prisma.generatedImage.update({
          where: { id: image.id },
          data: { imageUrl: localDbPath }
        });

        stats.migratedImages++;
        log.success(`图片迁移完成: ${image.id}`);

      } catch (error) {
        log.error(`图片迁移失败: ${image.id}`, error);
        stats.failedImages++;
      }

      log.progress(i + 1, images.length, '图片');
    }

    console.log(); // 换行

    // 迁移Model表
    log.info('开始迁移模型数据...');
    const models = await prisma.model.findMany({
      where: {
        OR: [
          { modelUrl: { not: null } },
          { previewImageUrl: { not: null } }
        ]
      }
    });

    stats.totalModels = models.length;
    log.info(`找到 ${stats.totalModels} 个模型需要处理`);

    for (let i = 0; i < models.length; i++) {
      const model = models[i];

      try {
        let needsUpdate = false;
        const updateData: Partial<Model> = {};

        // 处理modelUrl
        if (model.modelUrl && !isLocalPath(model.modelUrl) && isExternalUrl(model.modelUrl)) {
          const localDbPath = generateLocalPath(model.modelUrl, model.id, 0, 'model');
          const localFilePath = toFileSystemPath(localDbPath);

          await downloadFile(model.modelUrl, localFilePath);
          updateData.modelUrl = localDbPath;
          needsUpdate = true;
        } else if (model.modelUrl && isLocalPath(model.modelUrl)) {
          stats.skippedModels++;
        }

        // 处理previewImageUrl
        if (model.previewImageUrl && !isLocalPath(model.previewImageUrl) && isExternalUrl(model.previewImageUrl)) {
          const localDbPath = generateLocalPath(model.previewImageUrl, model.id, '_preview', 'image');
          const localFilePath = toFileSystemPath(localDbPath);

          await downloadFile(model.previewImageUrl, localFilePath);
          updateData.previewImageUrl = localDbPath;
          needsUpdate = true;
        } else if (model.previewImageUrl && isLocalPath(model.previewImageUrl)) {
          stats.skippedModels++;
        }

        // 更新数据库
        if (needsUpdate) {
          await prisma.model.update({
            where: { id: model.id },
            data: updateData
          });
          stats.migratedModels++;
          log.success(`模型迁移完成: ${model.id}`);
        }

      } catch (error) {
        log.error(`模型迁移失败: ${model.id}`, error);
        stats.failedModels++;
      }

      log.progress(i + 1, models.length, '模型');
    }

    console.log(); // 换行

    // 输出统计结果
    log.info('迁移完成！统计结果：');
    log.info(`图片：总计 ${stats.totalImages}，成功 ${stats.migratedImages}，失败 ${stats.failedImages}，跳过 ${stats.skippedImages}`);
    log.info(`模型：总计 ${stats.totalModels}，成功 ${stats.migratedModels}，失败 ${stats.failedModels}，跳过 ${stats.skippedModels}`);

    if (stats.failedImages > 0 || stats.failedModels > 0) {
      log.warn('存在失败的迁移记录，请检查错误日志');
    }

  } catch (error) {
    log.error('迁移过程中发生错误', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 主程序入口
async function main() {
  log.info('OSS对象存储本地化迁移脚本启动');
  log.info(`存储目录: ${CONFIG.storageRoot}`);

  try {
    await migrate();
    log.success('迁移脚本执行完成');
  } catch (error) {
    log.error('迁移脚本执行失败', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}