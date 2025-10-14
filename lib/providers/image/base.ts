/**
 * 图片生成服务 - 抽象基类
 *
 * 职责：提供所有图片生成 Provider 的公共逻辑
 * - Mock 模式处理
 * - 错误处理
 * - 日志记录
 * - 配置验证
 */

import { createLogger } from "@/lib/logger";
import type { ImageGenerationConfig, ImageGenerationProvider } from "./types";

/**
 * Mock 图片数据 - 开发阶段使用
 */
const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=512&h=512&fit=crop",
];

/**
 * 图片生成 Provider 抽象基类
 */
export abstract class BaseImageProvider implements ImageGenerationProvider {
  protected readonly log = createLogger(this.getName());
  protected readonly isMockMode: boolean;

  constructor() {
    this.isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

    if (this.isMockMode) {
      this.log.info("constructor", "Mock 模式已启用");
    }
  }

  /**
   * 获取 Provider 配置
   * 子类必须实现此方法
   */
  protected abstract getConfig(): ImageGenerationConfig;

  /**
   * 获取 Provider 名称
   * 子类必须实现此方法
   */
  abstract getName(): string;

  /**
   * 实际的图片生成逻辑（非 Mock）
   * 子类必须实现此方法
   */
  protected abstract generateImagesImpl(
    prompt: string,
    count: number,
  ): Promise<string[]>;

  /**
   * 实际的流式图片生成逻辑（非 Mock）
   * 子类必须实现此方法
   */
  protected abstract generateImageStreamImpl(
    prompt: string,
    count: number,
  ): AsyncGenerator<string, void, unknown>;

  /**
   * 验证配置是否有效
   */
  protected validateConfig(): void {
    const config = this.getConfig();

    if (!config.apiKey) {
      throw new Error(`${this.getName()}: API Key 未配置`);
    }

    if (!config.endpoint) {
      throw new Error(`${this.getName()}: API Endpoint 未配置`);
    }
  }

  /**
   * 批量生成图片（公共接口）
   */
  async generateImages(prompt: string, count: number): Promise<string[]> {
    // Mock 模式
    if (this.isMockMode) {
      return this.generateMockImages(count);
    }

    // 验证配置
    this.validateConfig();

    // 调用子类实现
    this.log.info("generateImages", "开始生成图片", {
      promptLength: prompt.length,
      count,
    });

    try {
      const images = await this.generateImagesImpl(prompt, count);

      this.log.info("generateImages", "图片生成完成", {
        count: images.length,
      });

      return images;
    } catch (error) {
      this.log.error("generateImages", "图片生成失败", error);
      throw error;
    }
  }

  /**
   * 流式生成图片（公共接口）
   */
  async *generateImageStream(
    prompt: string,
    count: number,
  ): AsyncGenerator<string, void, unknown> {
    // Mock 模式
    if (this.isMockMode) {
      yield* this.generateMockImageStream(count);
      return;
    }

    // 验证配置
    this.validateConfig();

    // 调用子类实现
    this.log.info("generateImageStream", "开始流式生成图片", {
      promptLength: prompt.length,
      count,
    });

    try {
      yield* this.generateImageStreamImpl(prompt, count);

      this.log.info("generateImageStream", "流式生成完成");
    } catch (error) {
      this.log.error("generateImageStream", "流式生成失败", error);
      throw error;
    }
  }

  /**
   * Mock 模式：批量生成图片
   */
  private async generateMockImages(count: number): Promise<string[]> {
    // 模拟 API 延迟
    await this.delay(1000);

    const images: string[] = [];
    for (let i = 0; i < count; i++) {
      const mockImageIndex = i % MOCK_IMAGES.length;
      images.push(MOCK_IMAGES[mockImageIndex]);
    }

    this.log.info("generateMockImages", "Mock 模式：生成图片成功", {
      count,
    });

    return images;
  }

  /**
   * Mock 模式：流式生成图片
   */
  private async *generateMockImageStream(
    count: number,
  ): AsyncGenerator<string, void, unknown> {
    for (let i = 0; i < count; i++) {
      // 模拟每张图片的生成延迟
      await this.delay(500);

      const mockImageIndex = i % MOCK_IMAGES.length;
      const image = MOCK_IMAGES[mockImageIndex];

      this.log.info("generateMockImageStream", "Mock 模式：生成图片", {
        imageIndex: i + 1,
        totalCount: count,
      });

      yield image;
    }
  }

  /**
   * 延迟工具函数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
