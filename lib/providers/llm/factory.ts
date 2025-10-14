/**
 * LLM Provider 工厂函数
 *
 * 职责：根据环境变量自动选择合适的 LLM Provider
 *
 * 优先级：
 * 1. Mock 模式（NEXT_PUBLIC_MOCK_MODE=true）
 * 2. SiliconFlow（SILICONFLOW_LLM_API_KEY）
 * 3. 阿里云通义千问（QWEN_API_KEY）
 */

import { createLogger } from "@/lib/logger";
import type { LLMProvider, LLMProviderType } from "./types";
import { QwenLLMAdapter } from "./adapters/qwen";
import { SiliconFlowLLMAdapter } from "./adapters/siliconflow";
import { MockLLMAdapter } from "./adapters/mock";

const log = createLogger("LLMProviderFactory");

/**
 * 获取当前应该使用的 LLM Provider 类型
 */
export function getLLMProviderType(): LLMProviderType {
  // 1. 检查 Mock 模式
  if (process.env.NEXT_PUBLIC_MOCK_MODE === "true") {
    log.info("getLLMProviderType", "使用 Mock LLM Provider");
    return "mock";
  }

  // 2. 检查 SiliconFlow
  if (process.env.SILICONFLOW_LLM_API_KEY) {
    log.info("getLLMProviderType", "使用 SiliconFlow (DeepSeek-V3) Provider");
    return "siliconflow";
  }

  // 3. 检查阿里云通义千问
  if (process.env.QWEN_API_KEY) {
    log.info("getLLMProviderType", "使用阿里云通义千问 (Qwen) Provider");
    return "qwen";
  }

  // 4. 未配置任何渠道
  throw new Error(
    "未配置 LLM 渠道，请设置 SILICONFLOW_LLM_API_KEY 或 QWEN_API_KEY",
  );
}

/**
 * 创建 LLM Provider 实例
 *
 * @returns LLMProvider 实例
 */
export function createLLMProvider(): LLMProvider {
  const providerType = getLLMProviderType();

  switch (providerType) {
    case "mock":
      return new MockLLMAdapter();

    case "siliconflow":
      return new SiliconFlowLLMAdapter();

    case "qwen":
      return new QwenLLMAdapter();

    default:
      throw new Error(`不支持的 LLM Provider 类型: ${providerType}`);
  }
}
