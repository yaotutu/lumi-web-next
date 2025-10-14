/**
 * Storage Provider 类型定义
 *
 * 统一的文件存储服务接口
 */

/**
 * Storage Provider 类型
 */
export type StorageProviderType = "local" | "aliyun-oss" | "tencent-cos";

/**
 * 文件类型
 */
export type FileType = "image" | "model";

/**
 * 保存图片参数
 */
export interface SaveImageParams {
  taskId: string; // 任务 ID
  index: number; // 图片索引 (0-3)
  imageData: Buffer | string; // 图片 Buffer 或 Base64 字符串
}

/**
 * 保存模型参数
 */
export interface SaveModelParams {
  taskId: string; // 任务 ID
  modelData: Buffer; // 模型文件 Buffer
  format?: string; // 文件格式 (默认 'glb')
}

/**
 * 文件信息
 */
export interface FileInfo {
  url: string; // 文件访问 URL
  size: number; // 文件大小（字节）
  exists: boolean; // 文件是否存在
}

/**
 * Storage Provider 统一接口
 *
 * 所有存储适配器必须实现此接口
 */
export interface StorageProvider {
  /**
   * 保存任务的图片
   * @param params 保存参数
   * @returns 可访问的 URL 路径
   */
  saveTaskImage(params: SaveImageParams): Promise<string>;

  /**
   * 保存 3D 模型文件
   * @param params 保存参数
   * @returns 可访问的 URL 路径
   */
  saveTaskModel(params: SaveModelParams): Promise<string>;

  /**
   * 删除任务的所有资源
   * @param taskId 任务 ID
   */
  deleteTaskResources(taskId: string): Promise<void>;

  /**
   * 获取文件信息
   * @param url 文件 URL (相对路径或绝对路径)
   * @returns 文件信息
   */
  getFileInfo(url: string): Promise<FileInfo>;

  /**
   * 检查文件是否存在
   * @param url 文件 URL (相对路径或绝对路径)
   * @returns 是否存在
   */
  fileExists(url: string): Promise<boolean>;

  /**
   * 生成 Mock 图片（用于开发测试）
   * @param taskId 任务 ID
   * @param index 图片索引
   * @returns URL 路径
   */
  saveMockImage(taskId: string, index: number): Promise<string>;

  /**
   * 生成 Mock 3D 模型（用于开发测试）
   * @param taskId 任务 ID
   * @returns URL 路径
   */
  saveMockModel(taskId: string): Promise<string>;

  /**
   * 获取 Provider 名称
   */
  getName(): string;
}
