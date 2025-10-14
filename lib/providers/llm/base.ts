/**
 * LLM Provider 抽象基类
 *
 * 职责：
 * - 定义统一的接口和公共逻辑
 * - 处理 Mock 模式
 * - 提供日志记录
 */

import OpenAI from "openai";
import { createLogger } from "@/lib/logger";
import type { ChatCompletionRequest, LLMConfig, LLMProvider } from "./types";

/**
 * LLM Provider 抽象基类
 *
 * 子类需要实现：
 * - getConfig(): 返回渠道配置
 * - getName(): 返回渠道名称
 */
export abstract class BaseLLMProvider implements LLMProvider {
  protected readonly log = createLogger(this.getName());
  protected readonly isMockMode: boolean;

  constructor() {
    // 检查是否启用 Mock 模式
    this.isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
  }

  /**
   * 获取配置（子类实现）
   */
  protected abstract getConfig(): LLMConfig;

  /**
   * 获取 Provider 名称（子类实现）
   */
  abstract getName(): string;

  /**
   * 验证配置
   */
  protected validateConfig(): void {
    const config = this.getConfig();

    if (!config.apiKey) {
      throw new Error(`${this.getName()}: API Key 未配置`);
    }

    if (!config.baseURL) {
      throw new Error(`${this.getName()}: Base URL 未配置`);
    }

    if (!config.model) {
      throw new Error(`${this.getName()}: Model 未配置`);
    }
  }

  /**
   * 创建 OpenAI 客户端实例
   */
  protected createClient(): OpenAI {
    const config = this.getConfig();

    this.log.info("createClient", "创建 LLM 客户端", {
      baseURL: config.baseURL,
      model: config.model,
    });

    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  /**
   * 聊天补全 - 公共实现
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<string> {
    // Mock 模式：返回假数据
    if (this.isMockMode) {
      return this.mockChatCompletion(request);
    }

    // 验证配置
    this.validateConfig();

    const config = this.getConfig();
    const client = this.createClient();

    this.log.info("chatCompletion", "开始调用 LLM", {
      model: config.model,
      userPromptLength: request.userPrompt.length,
      temperature: request.temperature ?? 0.7,
      responseFormat: request.responseFormat ?? "text",
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
        throw new Error("LLM 返回空内容");
      }

      this.log.info("chatCompletion", "LLM 调用成功", {
        model: config.model,
        responseLength: content.length,
        usage: response.usage,
      });

      return content;
    } catch (error) {
      this.log.error("chatCompletion", "LLM 调用失败", error, {
        model: config.model,
      });
      throw error;
    }
  }

  /**
   * 生成提示词变体 - 公共实现
   */
  async generatePromptVariants(
    userPrompt: string,
    systemPrompt: string,
  ): Promise<string[]> {
    // Mock 模式：返回假数据
    if (this.isMockMode) {
      return this.mockPromptVariants(userPrompt);
    }

    try {
      const response = await this.chatCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        responseFormat: "json",
      });

      // 解析 JSON 响应
      const parsed = JSON.parse(response);

      // 验证响应格式
      if (
        !parsed.variants ||
        !Array.isArray(parsed.variants) ||
        parsed.variants.length !== 4
      ) {
        this.log.warn("generatePromptVariants", "响应格式不符合预期", {
          response: parsed,
        });
        throw new Error("提示词变体数量不正确");
      }

      this.log.info("generatePromptVariants", "提示词变体生成成功", {
        variantCount: parsed.variants.length,
      });

      return parsed.variants as string[];
    } catch (error) {
      this.log.error("generatePromptVariants", "提示词变体生成失败", error);

      // 优雅降级：返回原始提示词的4份副本
      this.log.warn("generatePromptVariants", "降级处理：使用原始提示词");
      return [userPrompt, userPrompt, userPrompt, userPrompt];
    }
  }

  // ============================================
  // Mock 模式实现
  // ============================================

  /**
   * Mock 模式：聊天补全
   */
  protected mockChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<string> {
    this.log.info("mockChatCompletion", "使用 Mock 模式", {
      userPromptLength: request.userPrompt.length,
      responseFormat: request.responseFormat,
    });

    // 模拟延迟
    return new Promise((resolve) => {
      setTimeout(() => {
        if (request.responseFormat === "json") {
          // 返回 JSON 格式的 Mock 数据
          resolve(
            JSON.stringify({
              variants: [
                `${request.userPrompt} - 变体1`,
                `${request.userPrompt} - 变体2`,
                `${request.userPrompt} - 变体3`,
                `${request.userPrompt} - 变体4`,
              ],
            }),
          );
        } else {
          // 返回文本格式的 Mock 数据
          resolve(`这是 Mock 响应：${request.userPrompt}`);
        }
      }, 500); // 模拟 500ms 延迟
    });
  }

  /**
   * Mock 模式：提示词变体
   */
  protected mockPromptVariants(userPrompt: string): Promise<string[]> {
    this.log.info("mockPromptVariants", "使用 Mock 模式", {
      userPromptLength: userPrompt.length,
    });

    // 模拟延迟
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          `${userPrompt} - 风格变体1`,
          `${userPrompt} - 风格变体2`,
          `${userPrompt} - 风格变体3`,
          `${userPrompt} - 风格变体4`,
        ]);
      }, 500); // 模拟 500ms 延迟
    });
  }
}
