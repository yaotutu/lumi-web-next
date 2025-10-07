import fs from "node:fs";
import path from "node:path";
import { createLogger } from "@/lib/logger";

// 创建日志器
const log = createLogger("LocalStorage");

const STORAGE_ROOT = path.join(process.cwd(), "public", "generated");

/**
 * 本地文件存储工具类
 * 后期迁移到 OSS 时只需替换此类的实现
 */
export class LocalStorage {
  /**
   * 保存任务的图片
   * @param taskId 任务ID
   * @param index 图片索引 (0-3)
   * @param imageData 图片Buffer或Base64字符串
   * @returns 可访问的URL路径
   */
  static async saveTaskImage(
    taskId: string,
    index: number,
    imageData: Buffer | string,
  ): Promise<string> {
    const dir = path.join(STORAGE_ROOT, "images", taskId);

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `${index}.png`;
    const filepath = path.join(dir, filename);

    // 处理不同格式的图片数据
    let buffer: Buffer;
    if (typeof imageData === "string") {
      // Base64 字符串
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      buffer = Buffer.from(base64Data, "base64");
    } else {
      // Buffer
      buffer = imageData;
    }

    fs.writeFileSync(filepath, buffer);

    // 返回可访问的URL (相对于 public 目录)
    return `/generated/images/${taskId}/${filename}`;
  }

  /**
   * 保存3D模型文件
   * @param taskId 任务ID
   * @param modelData 模型文件Buffer
   * @param format 文件格式 (默认 'glb')
   * @returns 可访问的URL路径
   */
  static async saveTaskModel(
    taskId: string,
    modelData: Buffer,
    format: string = "glb",
  ): Promise<string> {
    const dir = path.join(STORAGE_ROOT, "models");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `${taskId}.${format}`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, modelData);

    return `/generated/models/${filename}`;
  }

  /**
   * 删除任务的所有资源
   * @param taskId 任务ID
   */
  static async deleteTaskResources(taskId: string): Promise<void> {
    // 删除图片目录
    const imageDir = path.join(STORAGE_ROOT, "images", taskId);
    if (fs.existsSync(imageDir)) {
      fs.rmSync(imageDir, { recursive: true, force: true });
    }

    // 删除模型文件（尝试常见格式）
    const formats = ["glb", "gltf", "fbx"];
    for (const format of formats) {
      const modelPath = path.join(
        STORAGE_ROOT,
        "models",
        `${taskId}.${format}`,
      );
      if (fs.existsSync(modelPath)) {
        fs.unlinkSync(modelPath);
      }
    }
  }

  /**
   * 获取文件大小
   * @param url 文件URL (相对路径)
   * @returns 文件大小（字节）
   */
  static getFileSize(url: string): number {
    try {
      const filepath = path.join(process.cwd(), "public", url);
      if (fs.existsSync(filepath)) {
        return fs.statSync(filepath).size;
      }
    } catch (error) {
      log.error("getFileSize", "获取文件大小失败", error, { url });
    }
    return 0;
  }

  /**
   * 检查文件是否存在
   * @param url 文件URL (相对路径)
   */
  static fileExists(url: string): boolean {
    try {
      const filepath = path.join(process.cwd(), "public", url);
      return fs.existsSync(filepath);
    } catch (_error) {
      return false;
    }
  }

  /**
   * 生成 Mock 图片（用于开发测试）
   * @param taskId 任务ID
   * @param index 图片索引
   * @returns URL路径
   */
  static async saveMockImage(taskId: string, index: number): Promise<string> {
    // 创建一个简单的 1x1 PNG (透明像素)
    const mockImageBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    return LocalStorage.saveTaskImage(taskId, index, mockImageBase64);
  }

  /**
   * 生成 Mock 3D模型（用于开发测试）
   * @param taskId 任务ID
   * @returns URL路径
   */
  static async saveMockModel(taskId: string): Promise<string> {
    // 创建一个最小的 GLB 文件头
    const mockModelBuffer = Buffer.from([
      0x67,
      0x6c,
      0x54,
      0x46, // "glTF" magic
      0x02,
      0x00,
      0x00,
      0x00, // version 2
      0x00,
      0x00,
      0x00,
      0x00, // length (placeholder)
    ]);
    return LocalStorage.saveTaskModel(taskId, mockModelBuffer, "glb");
  }
}
