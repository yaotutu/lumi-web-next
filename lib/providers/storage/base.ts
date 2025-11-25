/**
 * Storage Provider 抽象基类
 *
 * 职责：
 * - 定义统一的接口和公共逻辑
 * - 提供日志记录
 * - 提供 Mock 数据生成
 */

import { createLogger } from "@/lib/logger";
import type {
  FileInfo,
  SaveFileParams,
  SaveImageParams,
  SaveModelParams,
  StorageProvider,
} from "./types";

/**
 * Storage Provider 抽象基类
 *
 * 子类需要实现：
 * - getName(): 返回存储类型名称
 * - saveTaskImageImpl(): 保存图片的具体实现
 * - saveTaskModelImpl(): 保存模型的具体实现
 * - deleteRequestResourcesImpl(): 删除资源的具体实现
 * - getFileInfoImpl(): 获取文件信息的具体实现
 * - fileExistsImpl(): 检查文件存在性的具体实现
 */
export abstract class BaseStorageProvider implements StorageProvider {
  protected readonly log = createLogger(this.getName());

  /**
   * 获取 Provider 名称（子类实现）
   */
  abstract getName(): string;

  /**
   * 保存图片的具体实现（子类实现）
   */
  protected abstract saveTaskImageImpl(
    params: SaveImageParams,
  ): Promise<string>;

  /**
   * 保存模型的具体实现（子类实现）
   */
  protected abstract saveTaskModelImpl(
    params: SaveModelParams,
  ): Promise<string>;

  /**
   * 保存通用文件的具体实现（子类实现）
   */
  protected abstract saveFileImpl(params: SaveFileParams): Promise<string>;

  /**
   * 删除资源的具体实现（子类实现）
   */
  protected abstract deleteRequestResourcesImpl(
    requestId: string,
  ): Promise<void>;

  /**
   * 获取文件信息的具体实现（子类实现）
   */
  protected abstract getFileInfoImpl(url: string): Promise<FileInfo>;

  /**
   * 检查文件存在性的具体实现（子类实现）
   */
  protected abstract fileExistsImpl(url: string): Promise<boolean>;

  /**
   * 保存任务的图片 - 公共实现
   */
  async saveTaskImage(params: SaveImageParams): Promise<string> {
    this.log.info("saveTaskImage", "开始保存图片", {
      requestId: params.requestId,
      index: params.index,
      dataType: typeof params.imageData === "string" ? "base64" : "buffer",
    });

    try {
      const url = await this.saveTaskImageImpl(params);

      this.log.info("saveTaskImage", "图片保存成功", {
        requestId: params.requestId,
        index: params.index,
        url,
      });

      return url;
    } catch (error) {
      this.log.error("saveTaskImage", "图片保存失败", error, {
        requestId: params.requestId,
        index: params.index,
      });
      throw error;
    }
  }

  /**
   * 保存 3D 模型文件 - 公共实现
   */
  async saveTaskModel(params: SaveModelParams): Promise<string> {
    this.log.info("saveTaskModel", "开始保存模型", {
      modelId: params.modelId,
      format: params.format || "glb",
      dataSize: params.modelData.length,
    });

    try {
      const url = await this.saveTaskModelImpl(params);

      this.log.info("saveTaskModel", "模型保存成功", {
        modelId: params.modelId,
        url,
      });

      return url;
    } catch (error) {
      this.log.error("saveTaskModel", "模型保存失败", error, {
        modelId: params.modelId,
      });
      throw error;
    }
  }

  /**
   * 保存通用文件 - 公共实现
   */
  async saveFile(params: SaveFileParams): Promise<string> {
    this.log.info("saveFile", "开始保存文件", {
      modelId: params.modelId,
      fileName: params.fileName,
      dataSize: params.fileData.length,
    });

    try {
      const url = await this.saveFileImpl(params);

      this.log.info("saveFile", "文件保存成功", {
        modelId: params.modelId,
        fileName: params.fileName,
        url,
      });

      return url;
    } catch (error) {
      this.log.error("saveFile", "文件保存失败", error, {
        modelId: params.modelId,
        fileName: params.fileName,
      });
      throw error;
    }
  }

  /**
   * 删除请求的所有资源 - 公共实现
   */
  async deleteRequestResources(requestId: string): Promise<void> {
    this.log.info("deleteRequestResources", "开始删除请求资源", { requestId });

    try {
      await this.deleteRequestResourcesImpl(requestId);

      this.log.info("deleteRequestResources", "请求资源删除成功", {
        requestId,
      });
    } catch (error) {
      this.log.error("deleteRequestResources", "请求资源删除失败", error, {
        requestId,
      });
      throw error;
    }
  }

  /**
   * 获取文件信息 - 公共实现
   */
  async getFileInfo(url: string): Promise<FileInfo> {
    try {
      return await this.getFileInfoImpl(url);
    } catch (error) {
      this.log.error("getFileInfo", "获取文件信息失败", error, { url });
      // 返回默认值而不是抛出错误
      return {
        url,
        size: 0,
        exists: false,
      };
    }
  }

  /**
   * 检查文件是否存在 - 公共实现
   */
  async fileExists(url: string): Promise<boolean> {
    try {
      return await this.fileExistsImpl(url);
    } catch (error) {
      this.log.error("fileExists", "检查文件存在性失败", error, { url });
      return false;
    }
  }

  /**
   * 生成 Mock 图片 - 默认实现
   */
  async saveMockImage(requestId: string, index: number): Promise<string> {
    this.log.info("saveMockImage", "生成 Mock 图片", { requestId, index });

    // 创建一个简单的 1x1 PNG (透明像素)
    const mockImageBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    return this.saveTaskImage({
      requestId,
      index,
      imageData: mockImageBase64,
    });
  }

  /**
   * 生成 Mock 3D 模型 - 默认实现
   */
  async saveMockModel(modelId: string): Promise<string> {
    this.log.info("saveMockModel", "生成 Mock 模型", { modelId });

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

    return this.saveTaskModel({
      modelId,
      modelData: mockModelBuffer,
      format: "glb",
    });
  }
}
