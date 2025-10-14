/**
 * Model3D Provider 工厂函数
 *
 * 职责：根据环境变量自动选择合适的 Model3D Provider
 *
 * 优先级：
 * 1. Mock 模式（NEXT_PUBLIC_MOCK_MODE=true）
 * 2. 腾讯云混元 3D（TENCENTCLOUD_SECRET_ID）
 */

import { createLogger } from "@/lib/logger";
import type { Model3DProvider, Model3DProviderType } from "./types";
import { TencentModel3DAdapter } from "./adapters/tencent";
import { MockModel3DAdapter } from "./adapters/mock";

const log = createLogger("Model3DProviderFactory");

/**
 * 获取当前应该使用的 Model3D Provider 类型
 */
export function getModel3DProviderType(): Model3DProviderType {
  // 1. 检查 Mock 模式
  if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") {
    log.info("getModel3DProviderType", "使用 Mock Model3D Provider");
    return "mock";
  }

  // 2. 检查腾讯云
  if (
    process.env.TENCENTCLOUD_SECRET_ID &&
    process.env.TENCENTCLOUD_SECRET_KEY
  ) {
    log.info("getModel3DProviderType", "使用腾讯云混元 3D Provider");
    return "tencent";
  }

  // 3. 未配置任何渠道
  throw new Error(
    "未配置 3D 模型生成渠道，请设置 TENCENTCLOUD_SECRET_ID 和 TENCENTCLOUD_SECRET_KEY",
  );
}

/**
 * 创建 Model3D Provider 实例
 *
 * @returns Model3DProvider 实例
 */
export function createModel3DProvider(): Model3DProvider {
  const providerType = getModel3DProviderType();

  switch (providerType) {
    case "mock":
      return new MockModel3DAdapter();

    case "tencent":
      return new TencentModel3DAdapter();

    default:
      throw new Error(`不支持的 Model3D Provider 类型: ${providerType}`);
  }
}
