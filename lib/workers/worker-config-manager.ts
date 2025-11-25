/**
 * Worker 配置管理器
 *
 * 职责：
 * - 从数据库加载 QueueConfig
 * - 提供运行时配置访问接口
 * - 支持热更新配置（无需重启服务）
 *
 * 原则：
 * - 单例模式，全局唯一实例
 * - 缓存配置，定期从数据库刷新
 * - 提供类型安全的配置访问
 */

import type { QueueConfig } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// 队列名称常量
export const QUEUE_NAMES = {
  IMAGE_GENERATION: "image_generation",
  MODEL_GENERATION: "model_generation",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// 队列配置接口（带有类型安全的默认值）
export interface WorkerConfig {
  maxConcurrency: number; // 最大并发数
  jobTimeout: number; // 单个 Job 超时时间（毫秒）
  maxRetries: number; // 最大重试次数
  retryDelayBase: number; // 重试基础延迟（毫秒）
  retryDelayMax: number; // 重试最大延迟（毫秒）
  enablePriority: boolean; // 是否启用优先级
  isActive: boolean; // 队列是否激活
}

// 默认配置
const DEFAULT_CONFIG: WorkerConfig = {
  maxConcurrency: 1,
  jobTimeout: 300000, // 5分钟
  maxRetries: 3,
  retryDelayBase: 5000, // 5秒
  retryDelayMax: 60000, // 1分钟
  enablePriority: false,
  isActive: true,
};

/**
 * Worker 配置管理器类（单例）
 */
class WorkerConfigManager {
  private static instance: WorkerConfigManager | null = null;

  // 配置缓存
  private configCache: Map<QueueName, WorkerConfig> = new Map();

  // 最后更新时间
  private lastRefreshTime: number = 0;

  // 刷新间隔（默认 30 秒）
  private refreshInterval: number = 30000;

  // 私有构造函数，防止外部实例化
  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): WorkerConfigManager {
    if (!WorkerConfigManager.instance) {
      WorkerConfigManager.instance = new WorkerConfigManager();
    }
    return WorkerConfigManager.instance;
  }

  /**
   * 初始化配置管理器
   * 从数据库加载配置并初始化缓存
   */
  public async initialize(): Promise<void> {
    console.log("[WorkerConfigManager] 初始化配置管理器...");

    // 确保数据库中存在默认配置
    await this.ensureDefaultConfigs();

    // 加载配置到缓存
    await this.refreshConfigs();

    console.log("[WorkerConfigManager] 配置管理器初始化完成");
  }

  /**
   * 确保数据库中存在默认配置
   * 如果配置不存在，则创建默认配置
   */
  private async ensureDefaultConfigs(): Promise<void> {
    const queueNames = Object.values(QUEUE_NAMES);

    for (const queueName of queueNames) {
      const existingConfig = await prisma.queueConfig.findUnique({
        where: { queueName },
      });

      if (!existingConfig) {
        console.log(`[WorkerConfigManager] 创建默认配置: ${queueName}`);

        await prisma.queueConfig.create({
          data: {
            queueName,
            ...DEFAULT_CONFIG,
          },
        });
      }
    }
  }

  /**
   * 从数据库刷新配置缓存
   */
  public async refreshConfigs(): Promise<void> {
    try {
      const configs = await prisma.queueConfig.findMany({
        where: {
          queueName: {
            in: Object.values(QUEUE_NAMES),
          },
        },
      });

      // 更新缓存
      for (const config of configs) {
        this.configCache.set(config.queueName as QueueName, {
          maxConcurrency: config.maxConcurrency,
          jobTimeout: config.jobTimeout,
          maxRetries: config.maxRetries,
          retryDelayBase: config.retryDelayBase,
          retryDelayMax: config.retryDelayMax,
          enablePriority: config.enablePriority,
          isActive: config.isActive,
        });
      }

      this.lastRefreshTime = Date.now();

      console.log(
        `[WorkerConfigManager] 配置已刷新 (${configs.length} 个队列)`,
      );
    } catch (error) {
      console.error("[WorkerConfigManager] 刷新配置失败:", error);
    }
  }

  /**
   * 获取指定队列的配置
   * 如果缓存过期，自动刷新
   */
  public async getConfig(queueName: QueueName): Promise<WorkerConfig> {
    // 检查是否需要刷新缓存
    const now = Date.now();
    if (now - this.lastRefreshTime > this.refreshInterval) {
      await this.refreshConfigs();
    }

    // 从缓存获取配置
    const config = this.configCache.get(queueName);

    // 如果缓存中没有，返回默认配置
    if (!config) {
      console.warn(
        `[WorkerConfigManager] 队列 ${queueName} 配置不存在，使用默认配置`,
      );
      return { ...DEFAULT_CONFIG };
    }

    return config;
  }

  /**
   * 立即从数据库重新加载配置
   * 用于管理 API 更新配置后立即生效
   */
  public async forceRefresh(): Promise<void> {
    console.log("[WorkerConfigManager] 强制刷新配置...");
    await this.refreshConfigs();
  }

  /**
   * 更新队列配置
   * @param queueName 队列名称
   * @param updates 要更新的配置项
   */
  public async updateConfig(
    queueName: QueueName,
    updates: Partial<WorkerConfig>,
  ): Promise<QueueConfig> {
    console.log(`[WorkerConfigManager] 更新队列配置: ${queueName}`, updates);

    const updatedConfig = await prisma.queueConfig.update({
      where: { queueName },
      data: updates,
    });

    // 立即刷新缓存
    await this.refreshConfigs();

    return updatedConfig;
  }

  /**
   * 计算重试延迟（指数退避）
   * @param retryCount 当前重试次数
   * @param config 队列配置
   * @returns 延迟毫秒数
   */
  public calculateRetryDelay(retryCount: number, config: WorkerConfig): number {
    // 指数退避：baseDelay * (2 ^ retryCount)
    const delay = config.retryDelayBase * 2 ** retryCount;

    // 限制最大延迟
    return Math.min(delay, config.retryDelayMax);
  }

  /**
   * 判断是否可以重试
   * @param retryCount 当前重试次数
   * @param maxRetries 最大重试次数
   * @returns 是否可以重试
   */
  public canRetry(retryCount: number, maxRetries: number): boolean {
    return retryCount < maxRetries;
  }

  /**
   * 获取所有队列的配置（用于监控）
   */
  public async getAllConfigs(): Promise<Map<QueueName, WorkerConfig>> {
    await this.refreshConfigs();
    return new Map(this.configCache);
  }
}

// 导出单例实例
export const workerConfigManager = WorkerConfigManager.getInstance();
