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
 * TODO: 需要安装依赖
 * npm install cos-nodejs-sdk-v5
 *
 * 环境变量：
 * - TENCENT_COS_SECRET_ID
 * - TENCENT_COS_SECRET_KEY
 * - TENCENT_COS_BUCKET
 * - TENCENT_COS_REGION (默认: ap-beijing)
 */

import { BaseStorageProvider } from "../base";
import type { FileInfo, SaveImageParams, SaveModelParams } from "../types";

/**
 * 腾讯云 COS Storage 适配器
 *
 * 注意：当前为占位实现，需要安装 cos-nodejs-sdk-v5 后才能使用
 */
export class TencentCOSAdapter extends BaseStorageProvider {
  getName(): string {
    return "TencentCOSStorageProvider";
  }

  protected async saveTaskImageImpl(_params: SaveImageParams): Promise<string> {
    throw new Error(
      "腾讯云 COS 适配器尚未实现，请先安装 cos-nodejs-sdk-v5 或使用本地存储",
    );
  }

  protected async saveTaskModelImpl(_params: SaveModelParams): Promise<string> {
    throw new Error(
      "腾讯云 COS 适配器尚未实现，请先安装 cos-nodejs-sdk-v5 或使用本地存储",
    );
  }

  protected async deleteTaskResourcesImpl(_taskId: string): Promise<void> {
    throw new Error(
      "腾讯云 COS 适配器尚未实现，请先安装 cos-nodejs-sdk-v5 或使用本地存储",
    );
  }

  protected async getFileInfoImpl(_url: string): Promise<FileInfo> {
    throw new Error(
      "腾讯云 COS 适配器尚未实现，请先安装 cos-nodejs-sdk-v5 或使用本地存储",
    );
  }

  protected async fileExistsImpl(_url: string): Promise<boolean> {
    throw new Error(
      "腾讯云 COS 适配器尚未实现，请先安装 cos-nodejs-sdk-v5 或使用本地存储",
    );
  }
}

// TODO: 完整实现示例
// import COS from 'cos-nodejs-sdk-v5';
//
// export class TencentCOSAdapter extends BaseStorageProvider {
//   private client: COS;
//
//   constructor() {
//     super();
//     this.client = new COS({
//       SecretId: process.env.TENCENT_COS_SECRET_ID!,
//       SecretKey: process.env.TENCENT_COS_SECRET_KEY!,
//     });
//   }
//
//   protected async saveTaskImageImpl(params: SaveImageParams): Promise<string> {
//     const bucket = process.env.TENCENT_COS_BUCKET!;
//     const region = process.env.TENCENT_COS_REGION || 'ap-beijing';
//     const key = `images/${params.taskId}/${params.index}.png`;
//     const buffer = typeof params.imageData === 'string'
//       ? Buffer.from(params.imageData.replace(/^data:image\/\w+;base64,/, ''), 'base64')
//       : params.imageData;
//
//     await this.client.putObject({
//       Bucket: bucket,
//       Region: region,
//       Key: key,
//       Body: buffer,
//     });
//
//     return `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
//   }
//
//   // ... 其他方法类似实现
// }
