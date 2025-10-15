/**
 * 图片存储工具函数
 *
 * 职责：
 * - 从远程 URL 下载图片
 * - 上传到配置的存储服务（本地/OSS/COS）
 * - 返回可访问的 URL
 */

import { createLogger } from "@/lib/logger";
import { createStorageProvider } from "@/lib/providers/storage";

const log = createLogger("ImageStorageUtil");

/**
 * 从远程 URL 下载图片并上传到存储服务
 *
 * @param remoteUrl 远程图片 URL（如：阿里云/SiliconFlow 返回的临时 URL）
 * @param taskId 任务 ID
 * @param index 图片索引 (0-3)
 * @returns 存储后的 URL（本地路径或 COS URL）
 *
 * @throws 如果下载或上传失败
 */
export async function downloadAndUploadImage(
  remoteUrl: string,
  taskId: string,
  index: number,
): Promise<string> {
  log.info("downloadAndUploadImage", "开始下载并上传图片", {
    taskId,
    index,
    remoteUrlPreview: remoteUrl.substring(0, 80) + "...",
  });

  try {
    // 1. 下载图片到 Buffer
    log.info("downloadAndUploadImage", "正在下载图片", { taskId, index });

    const response = await fetch(remoteUrl);

    if (!response.ok) {
      throw new Error(
        `下载图片失败: HTTP ${response.status} ${response.statusText}`,
      );
    }

    // 获取 Content-Type（用于验证）
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.startsWith("image/")) {
      log.warn("downloadAndUploadImage", "响应的 Content-Type 不是图片类型", {
        taskId,
        index,
        contentType,
      });
    }

    // 转换为 Buffer
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    log.info("downloadAndUploadImage", "图片下载成功", {
      taskId,
      index,
      size: imageBuffer.length,
      sizeKB: (imageBuffer.length / 1024).toFixed(2),
    });

    // 2. 上传到存储服务
    const storageProvider = createStorageProvider();

    log.info("downloadAndUploadImage", "正在上传到存储服务", {
      taskId,
      index,
      provider: storageProvider.getName(),
    });

    const storageUrl = await storageProvider.saveTaskImage({
      taskId,
      index,
      imageData: imageBuffer,
    });

    log.info("downloadAndUploadImage", "图片上传成功", {
      taskId,
      index,
      storageUrl,
      provider: storageProvider.getName(),
    });

    return storageUrl;
  } catch (error) {
    log.error("downloadAndUploadImage", "下载或上传图片失败", error, {
      taskId,
      index,
      remoteUrl,
    });
    throw error;
  }
}

/**
 * 批量下载并上传图片
 *
 * @param remoteUrls 远程图片 URL 列表
 * @param taskId 任务 ID
 * @returns 存储后的 URL 列表
 *
 * @throws 如果任何一张图片下载或上传失败
 */
export async function downloadAndUploadImages(
  remoteUrls: string[],
  taskId: string,
): Promise<string[]> {
  log.info("downloadAndUploadImages", "开始批量下载并上传图片", {
    taskId,
    count: remoteUrls.length,
  });

  const storageUrls: string[] = [];

  for (let i = 0; i < remoteUrls.length; i++) {
    const storageUrl = await downloadAndUploadImage(remoteUrls[i], taskId, i);
    storageUrls.push(storageUrl);
  }

  log.info("downloadAndUploadImages", "批量上传完成", {
    taskId,
    count: storageUrls.length,
  });

  return storageUrls;
}

/**
 * 从远程 URL 下载 3D 模型并上传到存储服务
 *
 * @param remoteUrl 远程模型 URL（如：腾讯云返回的临时 URL）
 * @param taskId 任务 ID
 * @param format 模型格式（默认 'glb'）
 * @returns 存储后的 URL（本地路径或 COS URL）
 *
 * @throws 如果下载或上传失败
 */
export async function downloadAndUploadModel(
  remoteUrl: string,
  taskId: string,
  format = "glb",
): Promise<string> {
  log.info("downloadAndUploadModel", "开始下载并上传 3D 模型", {
    taskId,
    format,
    remoteUrlPreview: remoteUrl.substring(0, 80) + "...",
  });

  try {
    // 1. 下载模型到 Buffer
    log.info("downloadAndUploadModel", "正在下载模型", { taskId });

    const response = await fetch(remoteUrl);

    if (!response.ok) {
      throw new Error(
        `下载模型失败: HTTP ${response.status} ${response.statusText}`,
      );
    }

    // 获取 Content-Type（用于验证）
    const contentType = response.headers.get("content-type");
    log.info("downloadAndUploadModel", "响应 Content-Type", {
      taskId,
      contentType,
    });

    // 转换为 Buffer
    const arrayBuffer = await response.arrayBuffer();
    const modelBuffer = Buffer.from(arrayBuffer);

    log.info("downloadAndUploadModel", "模型下载成功", {
      taskId,
      format,
      size: modelBuffer.length,
      sizeMB: (modelBuffer.length / 1024 / 1024).toFixed(2),
    });

    // 2. 上传到存储服务
    const storageProvider = createStorageProvider();

    log.info("downloadAndUploadModel", "正在上传到存储服务", {
      taskId,
      provider: storageProvider.getName(),
    });

    const storageUrl = await storageProvider.saveTaskModel({
      taskId,
      modelData: modelBuffer,
      format,
    });

    log.info("downloadAndUploadModel", "模型上传成功", {
      taskId,
      storageUrl,
      provider: storageProvider.getName(),
    });

    return storageUrl;
  } catch (error) {
    log.error("downloadAndUploadModel", "下载或上传模型失败", error, {
      taskId,
      remoteUrl,
    });
    throw error;
  }
}
