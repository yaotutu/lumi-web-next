/**
 * 阿里云 OSS Storage 适配器
 *
 * 文档: https://help.aliyun.com/document_detail/111265.html
 *
 * 特性：
 * - 高可用、可扩展的对象存储
 * - 支持 CDN 加速
 * - 适合生产环境大规模部署
 *
 * TODO: 需要安装依赖
 * npm install ali-oss
 *
 * 环境变量：
 * - ALIYUN_OSS_ACCESS_KEY_ID
 * - ALIYUN_OSS_ACCESS_KEY_SECRET
 * - ALIYUN_OSS_BUCKET
 * - ALIYUN_OSS_REGION (默认: oss-cn-beijing)
 * - ALIYUN_OSS_ENDPOINT (可选)
 */

import { BaseStorageProvider } from "../base";
import type {
  FileInfo,
  SaveFileParams,
  SaveImageParams,
  SaveModelParams,
} from "../types";

/**
 * 阿里云 OSS Storage 适配器
 *
 * 注意：当前为占位实现，需要安装 ali-oss SDK 后才能使用
 */
export class AliyunOSSAdapter extends BaseStorageProvider {
  getName(): string {
    return "AliyunOSSStorageProvider";
  }

  protected async saveTaskImageImpl(_params: SaveImageParams): Promise<string> {
    throw new Error(
      "阿里云 OSS 适配器尚未实现，请先安装 ali-oss SDK 或使用本地存储",
    );
  }

  protected async saveTaskModelImpl(_params: SaveModelParams): Promise<string> {
    throw new Error(
      "阿里云 OSS 适配器尚未实现，请先安装 ali-oss SDK 或使用本地存储",
    );
  }

  protected async saveFileImpl(_params: SaveFileParams): Promise<string> {
    throw new Error(
      "阿里云 OSS 适配器尚未实现，请先安装 ali-oss SDK 或使用本地存储",
    );
  }

  protected async deleteRequestResourcesImpl(
    _requestId: string,
  ): Promise<void> {
    throw new Error(
      "阿里云 OSS 适配器尚未实现，请先安装 ali-oss SDK 或使用本地存储",
    );
  }

  protected async getFileInfoImpl(_url: string): Promise<FileInfo> {
    throw new Error(
      "阿里云 OSS 适配器尚未实现，请先安装 ali-oss SDK 或使用本地存储",
    );
  }

  protected async fileExistsImpl(_url: string): Promise<boolean> {
    throw new Error(
      "阿里云 OSS 适配器尚未实现，请先安装 ali-oss SDK 或使用本地存储",
    );
  }
}

// TODO: 完整实现示例
// import OSS from 'ali-oss';
//
// export class AliyunOSSAdapter extends BaseStorageProvider {
//   private client: OSS;
//
//   constructor() {
//     super();
//     this.client = new OSS({
//       accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
//       accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
//       bucket: process.env.ALIYUN_OSS_BUCKET!,
//       region: process.env.ALIYUN_OSS_REGION || 'oss-cn-beijing',
//     });
//   }
//
//   protected async saveTaskImageImpl(params: SaveImageParams): Promise<string> {
//     const objectName = `images/${params.taskId}/${params.index}.png`;
//     const buffer = typeof params.imageData === 'string'
//       ? Buffer.from(params.imageData.replace(/^data:image\/\w+;base64,/, ''), 'base64')
//       : params.imageData;
//
//     await this.client.put(objectName, buffer);
//     return this.client.signatureUrl(objectName);
//   }
//
//   // ... 其他方法类似实现
// }
