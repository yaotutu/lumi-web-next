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

/**
 * 调用通义千问生成4个不同风格的提示词变体
 * @param userPrompt - 用户原始输入
 * @param systemPrompt - 系统提示词(多变体生成规则)
 * @returns 4个提示词数组
 * @throws Error - API调用失败或返回格式错误时抛出
 */
export async function generatePromptVariants(
  userPrompt: string,
  systemPrompt: string,
): Promise<string[]> {
  try {
    log.info("generatePromptVariants", "开始调用通义千问生成变体", {
      userPrompt,
      promptLength: userPrompt.length,
    });

    // 调用通义千问API，要求返回JSON格式
    const response = await qwenClient.chat.completions.create({
      model: process.env.QWEN_MODEL || "qwen-max",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8, // 提高创造性，生成更多样化的结果
      max_tokens: 1500, // 增加token限制（需要生成4个完整的提示词）
      response_format: { type: "json_object" }, // 强制返回JSON格式
    });

    // 提取返回内容
    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("通义千问返回空内容");
    }

    log.debug("generatePromptVariants", "API返回原始内容", {
      content: content.substring(0, 200) + "...",
    });

    // 解析JSON
    let parsed: { variants?: string[] };
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      log.error("generatePromptVariants", "JSON解析失败", parseError, {
        content,
      });
      throw new Error(
        `JSON解析失败: ${parseError instanceof Error ? parseError.message : "未知错误"}`,
      );
    }

    // 验证返回的变体数量
    const variants = parsed.variants;

    if (!Array.isArray(variants)) {
      throw new Error(`返回数据格式错误，期望数组，实际为: ${typeof variants}`);
    }

    if (variants.length !== 4) {
      log.warn("generatePromptVariants", "返回的变体数量不正确", {
        expected: 4,
        actual: variants.length,
      });
      throw new Error(`期望4个变体，实际返回${variants.length}个`);
    }

    // 验证每个变体都是非空字符串
    for (let i = 0; i < variants.length; i++) {
      if (typeof variants[i] !== "string" || !variants[i].trim()) {
        throw new Error(`变体${i + 1}为空或格式错误`);
      }
    }

    log.info("generatePromptVariants", "✅ 变体生成成功", {
      count: variants.length,
    });

    return variants;
  } catch (error) {
    log.error("generatePromptVariants", "生成变体失败", error);
    throw error;
  }
}
