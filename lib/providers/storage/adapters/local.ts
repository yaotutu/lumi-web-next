/**
 * 本地文件系统 Storage 适配器
 *
 * 特性：
 * - 存储到 public/generated 目录
 * - 适合开发和小规模部署
 * - 无需额外配置
 *
 * 注意：
 * - 文件存储在服务器本地，不适合多实例部署
 * - 生产环境建议使用 OSS/COS
 */

import fs from "node:fs";
import path from "node:path";
import { BaseStorageProvider } from "../base";
import type {
  FileInfo,
  SaveImageParams,
  SaveModelParams,
  SaveFileParams,
} from "../types";

// 存储根目录
const STORAGE_ROOT = path.join(process.cwd(), "public", "generated");

/**
 * 本地文件系统 Storage 适配器
 */
export class LocalStorageAdapter extends BaseStorageProvider {
  getName(): string {
    return "LocalStorageProvider";
  }

  /**
   * 保存图片到本地文件系统
   */
  protected async saveTaskImageImpl(params: SaveImageParams): Promise<string> {
    const dir = path.join(STORAGE_ROOT, "images", params.requestId);

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `${params.index}.png`;
    const filepath = path.join(dir, filename);

    // 处理不同格式的图片数据
    let buffer: Buffer;
    if (typeof params.imageData === "string") {
      // Base64 字符串
      const base64Data = params.imageData.replace(
        /^data:image\/\w+;base64,/,
        "",
      );
      buffer = Buffer.from(base64Data, "base64");
    } else {
      // Buffer
      buffer = params.imageData;
    }

    fs.writeFileSync(filepath, buffer);

    // 返回可访问的 URL (相对于 public 目录)
    return `/generated/images/${params.requestId}/${filename}`;
  }

  /**
   * 保存模型到本地文件系统
   */
  protected async saveTaskModelImpl(params: SaveModelParams): Promise<string> {
    const dir = path.join(STORAGE_ROOT, "models");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const format = params.format || "glb";
    const filename = `${params.modelId}.${format}`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, params.modelData);

    return `/generated/models/${filename}`;
  }

  /**
   * 保存通用文件到本地文件系统
   */
  protected async saveFileImpl(params: SaveFileParams): Promise<string> {
    const dir = path.join(STORAGE_ROOT, "models", params.modelId);

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filepath = path.join(dir, params.fileName);
    fs.writeFileSync(filepath, params.fileData);

    return `/generated/models/${params.modelId}/${params.fileName}`;
  }

  /**
   * 删除请求的所有资源
   */
  protected async deleteRequestResourcesImpl(requestId: string): Promise<void> {
    // 删除图片目录
    const imageDir = path.join(STORAGE_ROOT, "images", requestId);
    if (fs.existsSync(imageDir)) {
      fs.rmSync(imageDir, { recursive: true, force: true });
    }

    // 注意：模型文件现在使用 modelId 而非 requestId，需要分开处理
    // 模型文件的删除应该在 Model 删除时处理
  }

  /**
   * 获取文件信息
   */
  protected async getFileInfoImpl(url: string): Promise<FileInfo> {
    try {
      const filepath = path.join(process.cwd(), "public", url);
      const exists = fs.existsSync(filepath);

      if (exists) {
        const stats = fs.statSync(filepath);
        return {
          url,
          size: stats.size,
          exists: true,
        };
      }

      return {
        url,
        size: 0,
        exists: false,
      };
    } catch (error) {
      this.log.error("getFileInfoImpl", "获取文件信息失败", error, { url });
      return {
        url,
        size: 0,
        exists: false,
      };
    }
  }

  /**
   * 检查文件是否存在
   */
  protected async fileExistsImpl(url: string): Promise<boolean> {
    try {
      const filepath = path.join(process.cwd(), "public", url);
      return fs.existsSync(filepath);
    } catch (_error) {
      return false;
    }
  }
}
