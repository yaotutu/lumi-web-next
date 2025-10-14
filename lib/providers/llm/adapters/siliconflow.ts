/**
 * SiliconFlow LLM 适配器
 *
 * 文档: https://docs.siliconflow.cn/api-reference/chat-completions/create
 *
 * 特性:
 * - 使用 OpenAI 兼容模式
 * - 支持 DeepSeek-V3 等开源模型
 * - 性价比高，适合大规模使用
 */

import { BaseLLMProvider } from "../base";
import type { LLMConfig } from "../types";

/**
 * SiliconFlow LLM 适配器
 */
export class SiliconFlowLLMAdapter extends BaseLLMProvider {
  getName(): string {
    return "SiliconFlowLLMProvider";
  }

  protected getConfig(): LLMConfig {
    const apiKey = process.env.SILICONFLOW_LLM_API_KEY || "";
    const baseURL =
      process.env.SILICONFLOW_LLM_BASE_URL || "https://api.siliconflow.cn/v1";
    const model =
      process.env.SILICONFLOW_LLM_MODEL || "deepseek-ai/DeepSeek-V3"; // 默认使用 DeepSeek-V3

    return {
      apiKey,
      baseURL,
      model,
    };
  }
}
