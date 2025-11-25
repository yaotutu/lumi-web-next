/**
 * 图片生成服务 - 统一导出
 *
 * 使用示例：
 *
 * ```typescript
 * import { createImageProvider } from '@/lib/providers/image';
 *
 * // 自动根据环境变量选择渠道
 * const imageProvider = createImageProvider();
 *
 * // 批量生成
 * const images = await imageProvider.generateImages(prompt, 4);
 *
 * // 流式生成
 * const stream = imageProvider.generateImageStream(prompt, 4);
 * for await (const imageUrl of stream) {
 *   console.log('生成图片:', imageUrl);
 * }
 * ```
 */

// 导出适配器类（供直接实例化使用）
export { AliyunAPIError, AliyunImageAdapter } from "./adapters/aliyun";
export { MockImageAdapter } from "./adapters/mock";
export {
  SiliconFlowAPIError,
  SiliconFlowImageAdapter,
} from "./adapters/siliconflow";
// 导出基类（供扩展使用）
export { BaseImageProvider } from "./base";
// 导出工厂函数
export { createImageProvider, getImageProviderType } from "./factory";
// 导出类型
export type {
  ImageGenerationConfig,
  ImageGenerationParams,
  ImageGenerationProvider,
  ImageProviderType,
} from "./types";
