/**
 * LLM Provider - 统一导出
 *
 * 使用示例：
 *
 * ```typescript
 * import { createLLMProvider } from '@/lib/providers/llm';
 *
 * // 自动根据环境变量选择渠道
 * const llmProvider = createLLMProvider();
 *
 * // 聊天补全
 * const response = await llmProvider.chatCompletion({
 *   systemPrompt: "你是一个有帮助的助手",
 *   userPrompt: "请介绍一下你自己",
 * });
 *
 * // 生成提示词变体
 * const variants = await llmProvider.generatePromptVariants(
 *   "一只可爱的小猫",
 *   "生成4个不同风格的提示词变体"
 * );
 * ```
 */

export { MockLLMAdapter } from "./adapters/mock";
// 导出适配器类（供直接实例化使用）
export { QwenLLMAdapter } from "./adapters/qwen";
export { SiliconFlowLLMAdapter } from "./adapters/siliconflow";
// 导出基类（供扩展使用）
export { BaseLLMProvider } from "./base";
// 导出工厂函数
export { createLLMProvider, getLLMProviderType } from "./factory";
// 导出类型
export type {
  ChatCompletionRequest,
  LLMConfig,
  LLMProvider,
  LLMProviderType,
} from "./types";
