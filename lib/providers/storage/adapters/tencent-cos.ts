/**
 * 腾讯云 COS Storage 适配器
 *
 * 文档: https://cloud.tencent.com/document/product/436/8629
 *
 * 特性：
 * - 高可用、可扩展的对象存储
 * - 支持 CDN 加速
 * - 适合生产环境大规模部署
 *
 * 环境变量：
 * - TENCENT_COS_SECRET_ID: 腾讯云 Secret ID
 * - TENCENT_COS_SECRET_KEY: 腾讯云 Secret Key
 * - TENCENT_COS_BUCKET: 存储桶名称（如：your-bucket-1234567890）
 * - TENCENT_COS_REGION: 存储桶区域（默认: ap-beijing）
 */

import COS from "cos-nodejs-sdk-v5";
import { BaseStorageProvider } from "../base";
import type { FileInfo, SaveImageParams, SaveModelParams } from "../types";

/**
 * 腾讯云 COS Storage 适配器
 *
 * 实现基于 cos-nodejs-sdk-v5
 */
export class TencentCOSAdapter extends BaseStorageProvider {
  private client: COS; // COS 客户端实例
  private bucket: string; // 存储桶名称
  private region: string; // 存储桶区域

  constructor() {
    super();

    // 验证必需的环境变量
    if (!process.env.TENCENT_COS_SECRET_ID) {
      throw new Error("缺少环境变量: TENCENT_COS_SECRET_ID");
    }
    if (!process.env.TENCENT_COS_SECRET_KEY) {
      throw new Error("缺少环境变量: TENCENT_COS_SECRET_KEY");
    }
    if (!process.env.TENCENT_COS_BUCKET) {
      throw new Error("缺少环境变量: TENCENT_COS_BUCKET");
    }

    // 初始化 COS 客户端
    this.client = new COS({
      SecretId: process.env.TENCENT_COS_SECRET_ID,
      SecretKey: process.env.TENCENT_COS_SECRET_KEY,
    });

    // 配置存储桶信息
    this.bucket = process.env.TENCENT_COS_BUCKET;
    this.region = process.env.TENCENT_COS_REGION || "ap-beijing";

    this.log.info(
      "constructor",
      `腾讯云 COS 初始化成功 - Bucket: ${this.bucket}, Region: ${this.region}`,
    );
  }

  getName(): string {
    return "TencentCOSStorageProvider";
  }

  /**
   * 保存任务的图片到 COS
   */
  protected async saveTaskImageImpl(params: SaveImageParams): Promise<string> {
    const key = `images/${params.taskId}/${params.index}.png`;

    // 处理不同格式的图片数据
    let buffer: Buffer;
    if (typeof params.imageData === "string") {
      // Base64 字符串转 Buffer
      const base64Data = params.imageData.replace(
        /^data:image\/\w+;base64,/,
        "",
      );
      buffer = Buffer.from(base64Data, "base64");
    } else {
      // 已经是 Buffer
      buffer = params.imageData;
    }

    // 上传到 COS
    await this.putObject(key, buffer, "image/png");

    // 返回可访问的 URL
    return this.getObjectUrl(key);
  }

  /**
   * 保存 3D 模型到 COS
   */
  protected async saveTaskModelImpl(params: SaveModelParams): Promise<string> {
    const format = params.format || "glb";
    const key = `models/${params.taskId}.${format}`;

    // 根据格式设置 Content-Type
    const contentType = this.getModelContentType(format);

    // 上传到 COS
    await this.putObject(key, params.modelData, contentType);

    // 返回可访问的 URL
    return this.getObjectUrl(key);
  }

  /**
   * 保存通用文件到 COS (MTL、纹理等)
   */
  protected async saveFileImpl(params: SaveFileParams): Promise<string> {
    // 构建文件路径: models/{taskId}/{fileName}
    const key = `models/${params.taskId}/${params.fileName}`;

    // 根据文件扩展名猜测 Content-Type
    const extension = params.fileName.split(".").pop()?.toLowerCase() || "";
    const contentType = params.contentType || this.guessContentType(extension);

    // 上传到 COS
    await this.putObject(key, params.fileData, contentType);

    // 返回可访问的 URL
    return this.getObjectUrl(key);
  }

  /**
   * 删除任务的所有资源
   */
  protected async deleteTaskResourcesImpl(taskId: string): Promise<void> {
    // 列出任务的所有图片
    const imagePrefix = `images/${taskId}/`;
    const imageObjects = await this.listObjects(imagePrefix);

    // 列出任务的所有模型（尝试常见格式）
    const modelKeys: string[] = [];
    for (const format of ["obj", "glb", "gltf", "fbx"]) {
      const modelKey = `models/${taskId}.${format}`;
      const exists = await this.objectExists(modelKey);
      if (exists) {
        modelKeys.push(modelKey);
      }
    }

    // 批量删除所有对象
    const allKeys = [...imageObjects, ...modelKeys];
    if (allKeys.length > 0) {
      await this.deleteObjects(allKeys);
      this.log.info(
        "deleteTaskResourcesImpl",
        `删除了 ${allKeys.length} 个文件`,
        {
          taskId,
          keys: allKeys,
        },
      );
    } else {
      this.log.info("deleteTaskResourcesImpl", "没有找到需要删除的文件", {
        taskId,
      });
    }
  }

  /**
   * 获取文件信息
   */
  protected async getFileInfoImpl(url: string): Promise<FileInfo> {
    try {
      // 从 URL 提取 Key
      const key = this.extractKeyFromUrl(url);

      // 查询对象元数据
      const result = await this.headObject(key);

      return {
        url,
        size: result.headers?.["content-length"]
          ? Number.parseInt(result.headers["content-length"] as string, 10)
          : 0,
        exists: true,
      };
    } catch (error) {
      this.log.warn("getFileInfoImpl", "文件不存在或获取失败", { url, error });
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
      const key = this.extractKeyFromUrl(url);
      return await this.objectExists(key);
    } catch (_error) {
      return false;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 上传对象到 COS
   */
  private async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: body,
          ContentType: contentType,
        },
        (err, _data) => {
          if (err) {
            this.log.error("putObject", "上传文件失败", err, { key });
            reject(
              new Error(`上传文件到 COS 失败: ${err.message || String(err)}`),
            );
          } else {
            this.log.info("putObject", "上传文件成功", { key });
            resolve();
          }
        },
      );
    });
  }

  /**
   * 列出指定前缀的所有对象
   */
  private async listObjects(prefix: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.client.getBucket(
        {
          Bucket: this.bucket,
          Region: this.region,
          Prefix: prefix,
        },
        (err, data) => {
          if (err) {
            this.log.error("listObjects", "列出对象失败", err, { prefix });
            reject(new Error(`列出对象失败: ${err.message || String(err)}`));
          } else {
            const keys =
              data.Contents?.map((item: { Key: string }) => item.Key) || [];
            resolve(keys);
          }
        },
      );
    });
  }

  /**
   * 批量删除对象
   */
  private async deleteObjects(keys: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.deleteMultipleObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Objects: keys.map((key) => ({ Key: key })),
        },
        (err, _data) => {
          if (err) {
            this.log.error("deleteObjects", "批量删除对象失败", err, { keys });
            reject(
              new Error(`批量删除对象失败: ${err.message || String(err)}`),
            );
          } else {
            resolve();
          }
        },
      );
    });
  }

  /**
   * 查询对象元数据
   */
  private async headObject(key: string): Promise<COS.HeadObjectResult> {
    return new Promise((resolve, reject) => {
      this.client.headObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        },
      );
    });
  }

  /**
   * 检查对象是否存在
   */
  private async objectExists(key: string): Promise<boolean> {
    try {
      await this.headObject(key);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * 生成对象的访问 URL
   */
  private getObjectUrl(key: string): string {
    return `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
  }

  /**
   * 从 URL 提取对象 Key
   */
  private extractKeyFromUrl(url: string): string {
    // 如果是完整 URL，提取 Key 部分
    if (url.startsWith("https://") || url.startsWith("http://")) {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // 移除开头的 '/'
    }

    // 如果是相对路径，直接返回
    return url.replace(/^\/+/, ""); // 移除开头的 '/'
  }

  /**
   * 根据文件格式获取 Content-Type
   */
  private getModelContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      glb: "model/gltf-binary",
      gltf: "model/gltf+json",
      fbx: "application/octet-stream",
      obj: "model/obj",
    };

    return contentTypes[format.toLowerCase()] || "application/octet-stream";
  }

  /**
   * 根据文件扩展名猜测 Content-Type
   */
  private guessContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      // 模型文件
      obj: "text/plain",
      mtl: "text/plain",
      glb: "model/gltf-binary",
      gltf: "model/gltf+json",
      fbx: "application/octet-stream",
      // 图片文件
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      // 其他
      txt: "text/plain",
      json: "application/json",
    };

    return contentTypes[extension] || "application/octet-stream";
  }
}
