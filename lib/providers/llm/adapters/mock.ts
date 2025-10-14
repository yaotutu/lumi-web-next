/**
 * Mock LLM 适配器
 *
 * 职责：提供开发和测试阶段的假数据
 * 使用场景：
 * - 开发阶段节省 API 调用成本
 * - 网络环境不佳时进行本地开发
 * - 快速原型验证和 UI 调试
 */

import { BaseLLMProvider } from "../base";
import type { LLMConfig } from "../types";

/**
 * Mock LLM 适配器
 *
 * 注意：此适配器始终返回 Mock 数据，不会调用真实 API
 */
export class MockLLMAdapter extends BaseLLMProvider {
  getName(): string {
    return "MockLLMProvider";
  }

  protected getConfig(): LLMConfig {
    // Mock 适配器不需要真实配置
    return {
      apiKey: "mock-api-key",
      baseURL: "https://mock.example.com",
      model: "mock-model",
    };
  }
}
