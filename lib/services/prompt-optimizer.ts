/**
 * 提示词优化服务
 * 职责:将用户输入优化为适合3D打印的图片生成提示词
 * 原则:函数式编程,带降级策略,确保业务连续性
 */

import { optimizePromptWithQwen } from "@/lib/providers/qwen-openai";
import { IMAGE_3D_PRINT_PROMPT } from "@/lib/prompts";
import { createLogger } from "@/lib/logger";

// 创建日志器
const log = createLogger("PromptOptimizer");

/**
 * 优化用户输入的提示词,使其适合3D打印场景
 * 功能默认开启,如果优化失败,自动降级使用原始输入
 *
 * @param userInput - 用户原始输入
 * @returns 优化后的提示词(失败时返回原始输入)
 */
export async function optimizePromptFor3DPrint(
  userInput: string,
): Promise<string> {
  try {
    log.info("optimizePromptFor3DPrint", "开始优化提示词", {
      userInput,
      inputLength: userInput.length,
    });

    // 调用通义千问优化提示词
    const optimized = await optimizePromptWithQwen(
      userInput,
      IMAGE_3D_PRINT_PROMPT,
    );

    // 记录优化成功
    log.info("optimizePromptFor3DPrint", "✅ 提示词优化成功", {
      original: userInput,
      optimized,
      originalLength: userInput.length,
      optimizedLength: optimized.length,
    });

    // 在日志中清晰展示对比
    log.info("optimizePromptFor3DPrint", "📝 原始提示词", {
      prompt: userInput,
    });

    log.info("optimizePromptFor3DPrint", "✨ 优化后提示词", {
      prompt: optimized,
    });

    return optimized;
  } catch (error) {
    // 降级策略:失败时使用原始输入
    log.warn("optimizePromptFor3DPrint", "⚠️ 提示词优化失败,降级使用原始输入", {
      error: error instanceof Error ? error.message : String(error),
      userInput,
    });

    log.info("optimizePromptFor3DPrint", "📝 降级使用原始提示词", {
      prompt: userInput,
    });

    return userInput;
  }
}
