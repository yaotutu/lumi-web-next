/**
 * Storage Provider 工厂函数
 *
 * 职责：根据环境变量自动选择合适的 Storage Provider
 *
 * 优先级：
 * 1. 阿里云 OSS (ALIYUN_OSS_ACCESS_KEY_ID)
 * 2. 腾讯云 COS (TENCENT_COS_SECRET_ID)
 * 3. 本地文件系统 (默认)
 */

import { createLogger } from "@/lib/logger";
import { AliyunOSSAdapter } from "./adapters/aliyun-oss";
import { LocalStorageAdapter } from "./adapters/local";
import { TencentCOSAdapter } from "./adapters/tencent-cos";
import type { StorageProvider, StorageProviderType } from "./types";

const log = createLogger("StorageProviderFactory");

/**
 * 获取当前应该使用的 Storage Provider 类型
 */
export function getStorageProviderType(): StorageProviderType {
  // 1. 检查阿里云 OSS
  if (
    process.env.ALIYUN_OSS_ACCESS_KEY_ID &&
    process.env.ALIYUN_OSS_ACCESS_KEY_SECRET
  ) {
    log.info("getStorageProviderType", "使用阿里云 OSS Storage Provider");
    return "aliyun-oss";
  }

  // 2. 检查腾讯云 COS
  if (process.env.TENCENT_COS_SECRET_ID && process.env.TENCENT_COS_SECRET_KEY) {
    log.info("getStorageProviderType", "使用腾讯云 COS Storage Provider");
    return "tencent-cos";
  }

  // 3. 默认使用本地文件系统
  log.info("getStorageProviderType", "使用本地文件系统 Storage Provider");
  return "local";
}

/**
 * 创建 Storage Provider 实例
 *
 * @returns StorageProvider 实例
 */
export function createStorageProvider(): StorageProvider {
  const providerType = getStorageProviderType();

  switch (providerType) {
    case "aliyun-oss":
      return new AliyunOSSAdapter();

    case "tencent-cos":
      return new TencentCOSAdapter();

    case "local":
      return new LocalStorageAdapter();

    default:
      throw new Error(`不支持的 Storage Provider 类型: ${providerType}`);
  }
}
