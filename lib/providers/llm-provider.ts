/**
 * 统一LLM Provider接口
 *
 * 职责：提供统一的大语言模型调用接口，支持多个LLM渠道
 *
 * 支持的渠道：
 * - Qwen (阿里云通义千问) - OpenAI兼容模式
 * - SiliconFlow (DeepSeek-V3) - OpenAI兼容
 *
 * 渠道优先级：SILICONFLOW_LLM_API_KEY > QWEN_API_KEY
 */

import OpenAI from "openai";
import { createLogger } from "@/lib/logger";

// 创建日志器
const log = createLogger("LLMProvider");

// ============================================
// LLM渠道配置
// ============================================

/**
 * LLM渠道枚举
 */
export type LLMProvider = "qwen" | "siliconflow";

/**
 * LLM渠道配置
 */
interface LLMConfig {
  baseURL: string; // API基础URL
  model: string; // 模型名称
  apiKey: string; // API密钥
}

/**
 * 获取当前使用的LLM渠道
 * 优先级: SILICONFLOW_LLM_API_KEY > QWEN_API_KEY
 */
export function getLLMProvider(): LLMProvider {
  const siliconflowKey = process.env.SILICONFLOW_LLM_API_KEY;
  const qwenKey = process.env.QWEN_API_KEY;

  // 如果配置了 SiliconFlow，优先使用
  if (siliconflowKey) {
    log.info("getLLMProvider", "使用 SiliconFlow (DeepSeek-V3) 作为LLM渠道");
    return "siliconflow";
  }

  // 否则使用阿里云通义千问
  if (qwenKey) {
    log.info("getLLMProvider", "使用阿里云通义千问 (Qwen) 作为LLM渠道");
    return "qwen";
  }

  // 如果都没有配置，抛出错误
  throw new Error(
    "未配置LLM渠道，请设置 SILICONFLOW_LLM_API_KEY 或 QWEN_API_KEY",
  );
}

/**
 * 根据渠道获取对应的配置
 */
function getLLMConfig(provider: LLMProvider): LLMConfig {
  switch (provider) {
    case "siliconflow": {
      const apiKey = process.env.SILICONFLOW_LLM_API_KEY || "";
      if (!apiKey) {
        throw new Error("缺少 SiliconFlow LLM API密钥配置");
      }
      return {
        baseURL:
          process.env.SILICONFLOW_LLM_BASE_URL ||
          "https://api.siliconflow.cn/v1",
        model: process.env.SILICONFLOW_LLM_MODEL || "deepseek-ai/DeepSeek-V3",
        apiKey,
      };
    }
    case "qwen": {
      const apiKey = process.env.QWEN_API_KEY || "";
      if (!apiKey) {
        throw new Error("缺少 Qwen API密钥配置");
      }
      return {
        baseURL:
          process.env.QWEN_BASE_URL ||
          "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model: process.env.QWEN_MODEL || "qwen-max",
        apiKey,
      };
    }
    default:
      throw new Error(`不支持的LLM渠道: ${provider}`);
  }
}

/**
 * 创建OpenAI客户端实例
 */
function createLLMClient(provider: LLMProvider): OpenAI {
  const config = getLLMConfig(provider);

  log.info("createLLMClient", "创建LLM客户端", {
    provider,
    baseURL: config.baseURL,
    model: config.model,
  });

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

// ============================================
// 统一的LLM调用接口
// ============================================

/**
 * 聊天补全请求参数
 */
export interface ChatCompletionRequest {
  systemPrompt: string; // 系统提示词
  userPrompt: string; // 用户提示词
  temperature?: number; // 温度参数，默认0.7
  responseFormat?: "text" | "json"; // 响应格式，默认text
}

/**
 * 调用LLM进行聊天补全
 *
 * @param request 聊天补全请求参数
 * @returns LLM响应内容
 */
export async function chatCompletion(
  request: ChatCompletionRequest,
): Promise<string> {
  const provider = getLLMProvider();
  const client = createLLMClient(provider);
  const config = getLLMConfig(provider);

  log.info("chatCompletion", "开始调用LLM", {
    provider,
    model: config.model,
    userPromptLength: request.userPrompt.length,
  });

  try {
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content: request.systemPrompt,
        },
        {
          role: "user",
          content: request.userPrompt,
        },
      ],
      temperature: request.temperature ?? 0.7,
      ...(request.responseFormat === "json" && {
        response_format: { type: "json_object" },
      }),
    });

    const content = response.choices[0]?.message?.content || "";

    if (!content) {
      throw new Error("LLM返回空内容");
    }

    log.info("chatCompletion", "LLM调用成功", {
      provider,
      model: config.model,
      responseLength: content.length,
      usage: response.usage,
    });

    return content;
  } catch (error) {
    log.error("chatCompletion", "LLM调用失败", error, {
      provider,
      model: config.model,
    });
    throw error;
  }
}

/**
 * 生成提示词变体（专门用于图片生成的提示词优化）
 *
 * @param userPrompt 用户原始提示词
 * @param systemPrompt 系统提示词（定义生成规则）
 * @returns 提示词变体数组（4个）
 */
export async function generatePromptVariants(
  userPrompt: string,
  systemPrompt: string,
): Promise<string[]> {
  try {
    const response = await chatCompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      responseFormat: "json",
    });

    // 解析JSON响应
    const parsed = JSON.parse(response);

    // 验证响应格式
    if (
      !parsed.variants ||
      !Array.isArray(parsed.variants) ||
      parsed.variants.length !== 4
    ) {
      log.warn("generatePromptVariants", "响应格式不符合预期", {
        response: parsed,
      });
      throw new Error("提示词变体数量不正确");
    }

    log.info("generatePromptVariants", "提示词变体生成成功", {
      variantCount: parsed.variants.length,
    });

    return parsed.variants as string[];
  } catch (error) {
    log.error("generatePromptVariants", "提示词变体生成失败", error);

    // 优雅降级：返回原始提示词的4份副本
    log.warn("generatePromptVariants", "降级处理：使用原始提示词");
    return [userPrompt, userPrompt, userPrompt, userPrompt];
  }
}
