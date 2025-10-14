/**
 * Mock 图片生成适配器
 *
 * 职责：提供开发和测试阶段的假数据
 * 使用场景：
 * - 开发阶段节省 API 调用成本
 * - 网络环境不佳时进行本地开发
 * - 快速原型验证和 UI 调试
 */

import { BaseImageProvider } from "../base";
import type { ImageGenerationConfig } from "../types";

/**
 * Mock 图片生成适配器
 *
 * 注意：此适配器始终返回 Mock 数据，不会调用真实 API
 */
export class MockImageAdapter extends BaseImageProvider {
  getName(): string {
    return "MockImageProvider";
  }

  protected getConfig(): ImageGenerationConfig {
    // Mock 适配器不需要真实配置
    return {
      apiKey: "mock-api-key",
      endpoint: "https://mock.example.com",
    };
  }

  protected async generateImagesImpl(
    _prompt: string,
    _count: number,
  ): Promise<string[]> {
    // 实际逻辑由 BaseImageProvider 的 Mock 模式处理
    // 此方法不会被调用
    throw new Error("Mock 适配器不应调用此方法");
  }

  protected async *generateImageStreamImpl(
    _prompt: string,
    _count: number,
  ): AsyncGenerator<string, void, unknown> {
    // 实际逻辑由 BaseImageProvider 的 Mock 模式处理
    // 此方法不会被调用
    throw new Error("Mock 适配器不应调用此方法");
  }
}
