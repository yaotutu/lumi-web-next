/**
 * 图片生成服务 - 工厂函数
 *
 * 职责：根据环境变量自动选择合适的图片生成 Provider
 *
 * 优先级：
 * 1. Mock 模式（NEXT_PUBLIC_MOCK_MODE=true）
 * 2. SiliconFlow（SILICONFLOW_API_KEY）
 * 3. 阿里云（ALIYUN_IMAGE_API_KEY）
 */

import { createLogger } from "@/lib/logger";
import type { ImageGenerationProvider, ImageProviderType } from "./types";
import { AliyunImageAdapter } from "./adapters/aliyun";
import { SiliconFlowImageAdapter } from "./adapters/siliconflow";
import { MockImageAdapter } from "./adapters/mock";

const log = createLogger("ImageProviderFactory");

/**
 * 获取当前应该使用的 Provider 类型
 */
export function getImageProviderType(): ImageProviderType {
  // 1. 检查 Mock 模式
  if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") {
    log.info("getImageProviderType", "使用 Mock Provider");
    return "mock";
  }

  // 2. 检查 SiliconFlow
  if (process.env.SILICONFLOW_API_KEY) {
    log.info("getImageProviderType", "使用 SiliconFlow Provider");
    return "siliconflow";
  }

  // 3. 检查阿里云
  if (
    process.env.ALIYUN_IMAGE_API_KEY ||
    process.env.NEXT_PUBLIC_ALIYUN_IMAGE_API_KEY
  ) {
    log.info("getImageProviderType", "使用阿里云 Provider");
    return "aliyun";
  }

  // 4. 未配置任何渠道
  throw new Error(
    "未配置图片生成渠道，请设置 SILICONFLOW_API_KEY 或 ALIYUN_IMAGE_API_KEY",
  );
}

/**
 * 创建图片生成 Provider 实例
 *
 * @returns ImageGenerationProvider 实例
 */
export function createImageProvider(): ImageGenerationProvider {
  const providerType = getImageProviderType();

  switch (providerType) {
    case "mock":
      return new MockImageAdapter();

    case "siliconflow":
      return new SiliconFlowImageAdapter();

    case "aliyun":
      return new AliyunImageAdapter();

    default:
      throw new Error(`不支持的 Provider 类型: ${providerType}`);
  }
}
