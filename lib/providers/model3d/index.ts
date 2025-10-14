/**
 * Model3D Provider - 统一导出
 *
 * 使用示例：
 *
 * ```typescript
 * import { createModel3DProvider } from '@/lib/providers/model3d';
 *
 * // 自动根据环境变量选择渠道
 * const model3DProvider = createModel3DProvider();
 *
 * // 提交任务
 * const { jobId } = await model3DProvider.submitModelGenerationJob({
 *   imageUrl: "https://example.com/image.jpg",
 *   prompt: "optional prompt"
 * });
 *
 * // 查询状态
 * const status = await model3DProvider.queryModelTaskStatus(jobId);
 * console.log('任务状态:', status.status);
 * ```
 */

// 导出类型
export type {
  Model3DProvider,
  Model3DProviderType,
  SubmitModelJobParams,
  ModelJobResponse,
  ModelTaskStatus,
  ModelFile,
  ModelTaskStatusResponse,
} from "./types";

// 导出工厂函数
export { createModel3DProvider, getModel3DProviderType } from "./factory";

// 导出基类（供扩展使用）
export { BaseModel3DProvider } from "./base";

// 导出适配器类（供直接实例化使用）
export { TencentModel3DAdapter, TencentAPIError } from "./adapters/tencent";
export { MockModel3DAdapter } from "./adapters/mock";
