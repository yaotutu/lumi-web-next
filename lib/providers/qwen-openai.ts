/**
 * 阿里云通义千问 OpenAI 兼容模式客户端
 * 用于优化用户提示词,使其适合3D打印场景
 */

import OpenAI from "openai";
import { createLogger } from "@/lib/logger";

// 创建日志器
const log = createLogger("QwenOpenAI");

/**
 * 阿里云通义千问 OpenAI 兼容模式客户端
 * 使用官方 OpenAI SDK 连接阿里云服务
 */
const qwenClient = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL:
    process.env.QWEN_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

/**
 * 调用通义千问优化提示词
 * @param userPrompt - 用户原始输入
 * @param systemPrompt - 系统提示词(优化规则)
 * @returns 优化后的提示词
 * @throws Error - API调用失败时抛出
 */
export async function optimizePromptWithQwen(
  userPrompt: string,
  systemPrompt: string,
): Promise<string> {
  try {
    // 调用通义千问API
    const response = await qwenClient.chat.completions.create({
      model: process.env.QWEN_MODEL || "qwen-max",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7, // 适中的创造性
      max_tokens: 500, // 限制输出长度
    });

    // 提取优化后的提示词
    const optimized = response.choices[0]?.message?.content?.trim();

    if (!optimized) {
      throw new Error("通义千问返回空内容");
    }

    return optimized;
  } catch (error) {
    log.error("optimizePromptWithQwen", "API调用失败", error);
    throw error;
  }
}
