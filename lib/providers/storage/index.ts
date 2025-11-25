/**
 * Storage Provider - 统一导出
 *
 * 使用示例：
 *
 * ```typescript
 * import { createStorageProvider } from '@/lib/providers/storage';
 *
 * // 自动根据环境变量选择存储方式
 * const storageProvider = createStorageProvider();
 *
 * // 保存图片
 * const imageUrl = await storageProvider.saveTaskImage({
 *   taskId: "task-123",
 *   index: 0,
 *   imageData: buffer
 * });
 *
 * // 保存模型
 * const modelUrl = await storageProvider.saveTaskModel({
 *   taskId: "task-123",
 *   modelData: buffer,
 *   format: "glb"
 * });
 *
 * // 检查文件
 * const exists = await storageProvider.fileExists(imageUrl);
 *
 * // 获取文件信息
 * const info = await storageProvider.getFileInfo(imageUrl);
 *
 * // 删除任务资源
 * await storageProvider.deleteTaskResources("task-123");
 * ```
 */

export { AliyunOSSAdapter } from "./adapters/aliyun-oss";
// 导出适配器类（供直接实例化使用）
export { LocalStorageAdapter } from "./adapters/local";
export { TencentCOSAdapter } from "./adapters/tencent-cos";
// 导出基类（供扩展使用）
export { BaseStorageProvider } from "./base";
// 导出工厂函数
export { createStorageProvider, getStorageProviderType } from "./factory";
// 导出类型
export type {
  FileInfo,
  FileType,
  SaveImageParams,
  SaveModelParams,
  StorageProvider,
  StorageProviderType,
} from "./types";
