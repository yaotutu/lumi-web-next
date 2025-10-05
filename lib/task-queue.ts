/**
 * 任务队列管理系统
 * 功能:
 * - 并发控制(最多同时执行N个任务)
 * - 自动重试(失败后指数退避重试)
 * - 超时保护(防止任务卡死)
 * - 错误隔离(单个任务失败不影响其他任务)
 */

import { AliyunAPIError, generateImageStream } from "./aliyun-image";
import { IMAGE_GENERATION } from "./constants";
import { prisma } from "./prisma";

// ============================================
// 队列配置
// ============================================
const QUEUE_CONFIG = {
  // 最大并发任务数(根据阿里云API限制调整)
  MAX_CONCURRENT_TASKS: 3,

  // 单个图片生成超时时间(毫秒)
  SINGLE_IMAGE_TIMEOUT: 30000, // 30秒

  // 整个任务超时时间(4张图片)
  TASK_TIMEOUT: 120000, // 2分钟

  // 重试配置
  MAX_RETRIES: 3, // 最多重试3次
  RETRY_DELAY_BASE: 2000, // 首次重试延迟2秒

  // 队列限制
  MAX_QUEUE_SIZE: 100, // 最多100个等待任务
} as const;

// ============================================
// 类型定义
// ============================================

// 队列任务状态
type QueueTaskStatus = "pending" | "running" | "completed" | "failed";

// 队列任务
interface QueueTask {
  id: string; // 队列任务ID
  taskId: string; // 数据库任务ID
  prompt: string; // 生成提示词
  status: QueueTaskStatus; // 任务状态
  retries: number; // 已重试次数
  createdAt: Date; // 创建时间
  startedAt?: Date; // 开始时间
  completedAt?: Date; // 完成时间
  error?: string; // 错误信息
  abortController?: AbortController; // 用于取消任务
}

// 队列状态
interface QueueStatus {
  pending: number; // 等待中的任务数
  running: number; // 运行中的任务数
  completed: number; // 最近完成的任务数(最多保留100个)
  maxConcurrent: number; // 最大并发数
  maxQueueSize: number; // 最大队列长度
}

// ============================================
// 任务队列管理器类
// ============================================
class TaskQueueManager {
  // 等待队列
  private queue: QueueTask[] = [];

  // 正在运行的任务
  private runningTasks: Map<string, QueueTask> = new Map();

  // 已完成的任务(保留最近100个用于查询)
  private completedTasks: Map<string, QueueTask> = new Map();

  // 是否正在处理队列
  private isProcessing = false;

  /**
   * 添加任务到队列
   * @param taskId 数据库任务ID
   * @param prompt 生成提示词
   * @returns 队列任务ID
   */
  async addTask(taskId: string, prompt: string): Promise<string> {
    // 检查队列是否已满
    if (this.queue.length >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
      throw new Error(
        `任务队列已满(${QUEUE_CONFIG.MAX_QUEUE_SIZE}个任务),请稍后再试`,
      );
    }

    // 检查是否已存在相同的数据库任务
    const existingTask = this.findTaskByTaskId(taskId);
    if (existingTask) {
      console.log(
        `[TaskQueue] 任务 ${taskId} 已在队列中(状态: ${existingTask.status}),跳过添加`,
      );
      return existingTask.id;
    }

    // 创建新的队列任务
    const queueTask: QueueTask = {
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      taskId,
      prompt,
      status: "pending",
      retries: 0,
      createdAt: new Date(),
    };

    // 加入队列
    this.queue.push(queueTask);

    console.log(
      `[TaskQueue] ✅ 任务已添加: ${queueTask.id} | 数据库ID: ${taskId} | 队列状态: ${this.queue.length} 等待, ${this.runningTasks.size} 运行中`,
    );

    // 触发队列处理
    this.processQueue();

    return queueTask.id;
  }

  /**
   * 处理队列(主循环)
   */
  private async processQueue(): Promise<void> {
    // 防止重复处理
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // 循环处理队列中的任务
      while (this.queue.length > 0) {
        // 检查是否达到并发上限
        if (this.runningTasks.size >= QUEUE_CONFIG.MAX_CONCURRENT_TASKS) {
          console.log(
            `[TaskQueue] ⏸️  达到最大并发数 (${QUEUE_CONFIG.MAX_CONCURRENT_TASKS}),等待任务完成...`,
          );
          break;
        }

        // 取出队列第一个任务
        const task = this.queue.shift();
        if (!task) break;

        // 启动任务(不等待,允许并发执行)
        this.runTask(task).catch((error) => {
          console.error(`[TaskQueue] ❌ 任务执行器异常: ${task.id}`, error);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 执行单个任务
   */
  private async runTask(task: QueueTask): Promise<void> {
    // 更新任务状态
    task.status = "running";
    task.startedAt = new Date();
    task.abortController = new AbortController();
    this.runningTasks.set(task.id, task);

    console.log(
      `[TaskQueue] 🚀 开始执行: ${task.id} | 尝试 ${task.retries + 1}/${QUEUE_CONFIG.MAX_RETRIES + 1}`,
    );

    try {
      // 更新数据库任务状态为"生成中"
      await prisma.task.update({
        where: { id: task.taskId },
        data: {
          status: "GENERATING_IMAGES",
          imageGenerationStartedAt: new Date(),
        },
      });

      // 创建超时Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          task.abortController?.abort();
          reject(new Error(`任务超时 (${QUEUE_CONFIG.TASK_TIMEOUT / 1000}秒)`));
        }, QUEUE_CONFIG.TASK_TIMEOUT);

        // 任务中止时清除超时定时器
        task.abortController?.signal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
        });
      });

      // 执行图片生成,与超时竞争
      await Promise.race([this.generateImages(task), timeoutPromise]);

      // 任务成功完成
      task.status = "completed";
      task.completedAt = new Date();

      // 更新数据库任务状态为"图片就绪"
      await prisma.task.update({
        where: { id: task.taskId },
        data: {
          status: "IMAGES_READY",
          imageGenerationCompletedAt: new Date(),
        },
      });

      const duration = task.completedAt.getTime() - task.startedAt?.getTime();
      console.log(
        `[TaskQueue] ✅ 任务完成: ${task.id} | 耗时: ${(duration / 1000).toFixed(1)}秒`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(
        `[TaskQueue] ❌ 任务失败: ${task.id} | 错误: ${errorMessage}`,
      );

      // 判断是否应该重试
      const shouldRetry = this.shouldRetry(task, error);

      if (shouldRetry && task.retries < QUEUE_CONFIG.MAX_RETRIES) {
        // 增加重试计数
        task.retries++;
        task.status = "pending";

        // 计算重试延迟
        let retryDelay: number;

        // 如果是429限流错误，使用更长的重试延迟
        if (error instanceof AliyunAPIError && error.statusCode === 429) {
          // 429限流使用激进的指数退避: 30秒 → 60秒 → 120秒
          retryDelay = 30000 * 2 ** (task.retries - 1);
          console.log(
            `[TaskQueue] 🚦 检测到429限流，延迟 ${retryDelay / 1000}秒后重试`,
          );
        } else {
          // 普通错误使用标准指数退避: 2秒 → 4秒 → 8秒
          retryDelay = QUEUE_CONFIG.RETRY_DELAY_BASE * 2 ** (task.retries - 1);
        }

        console.log(
          `[TaskQueue] 🔄 任务将在 ${retryDelay / 1000}秒后重试: ${task.id} (${task.retries}/${QUEUE_CONFIG.MAX_RETRIES})`,
        );

        // 延迟后重新加入队列
        setTimeout(() => {
          this.queue.push(task);
          this.processQueue();
        }, retryDelay);
      } else {
        // 达到最大重试次数或不可重试错误
        task.status = "failed";
        task.error = errorMessage;
        task.completedAt = new Date();

        // 更新数据库任务状态为"失败"
        await prisma.task
          .update({
            where: { id: task.taskId },
            data: {
              status: "FAILED",
              failedAt: new Date(),
              errorMessage,
            },
          })
          .catch((err) => {
            console.error(`[TaskQueue] ⚠️  更新任务状态失败:`, err);
          });

        console.error(
          `[TaskQueue] 💀 任务最终失败: ${task.id} | 已重试 ${task.retries} 次 | 错误: ${errorMessage}`,
        );
      }
    } finally {
      // 从运行列表移除
      this.runningTasks.delete(task.id);

      // 保存到已完成列表(限制最多100个)
      this.completedTasks.set(task.id, task);
      if (this.completedTasks.size > 100) {
        const firstKey = this.completedTasks.keys().next().value;
        if (firstKey) this.completedTasks.delete(firstKey);
      }

      // 继续处理队列中的下一个任务
      this.processQueue();
    }
  }

  /**
   * 生成图片(核心逻辑)
   */
  private async generateImages(task: QueueTask): Promise<void> {
    let index = 0;

    // 使用生成器逐张生成图片
    for await (const imageUrl of generateImageStream(
      task.prompt,
      IMAGE_GENERATION.COUNT,
    )) {
      // 检查任务是否被中止
      if (task.abortController?.signal.aborted) {
        throw new Error("任务已取消");
      }

      // 保存图片到数据库
      await prisma.taskImage.create({
        data: {
          taskId: task.taskId,
          url: imageUrl,
          index,
        },
      });

      console.log(
        `[TaskQueue] 🖼️  图片 ${index + 1}/${IMAGE_GENERATION.COUNT} 已生成: ${task.id}`,
      );
      index++;
    }

    // 检查是否生成了足够的图片
    if (index === 0) {
      throw new Error("未生成任何图片");
    }

    if (index < IMAGE_GENERATION.COUNT) {
      console.warn(
        `[TaskQueue] ⚠️  只生成了 ${index}/${IMAGE_GENERATION.COUNT} 张图片`,
      );
    }
  }

  /**
   * 判断错误是否应该重试
   */
  private shouldRetry(_task: QueueTask, error: unknown): boolean {
    // 如果是阿里云API错误，根据HTTP状态码精确判断
    if (error instanceof AliyunAPIError) {
      const { statusCode } = error;

      // 不可重试的HTTP状态码
      const nonRetryableStatusCodes = [
        400, // Bad Request - 请求参数错误（如prompt违规、格式错误）
        401, // Unauthorized - 认证失败（API密钥错误）
        403, // Forbidden - 权限不足或余额不足
        404, // Not Found - 资源不存在
      ];

      if (nonRetryableStatusCodes.includes(statusCode)) {
        console.log(`[TaskQueue] ⛔ 不可重试的HTTP错误: ${statusCode}`);
        return false;
      }

      // 可重试的状态码
      // 429 - Too Many Requests (限流)
      // 500 - Internal Server Error (服务器临时错误)
      // 502 - Bad Gateway (网关错误)
      // 503 - Service Unavailable (服务暂时不可用)
      // 504 - Gateway Timeout (网关超时)
      console.log(`[TaskQueue] ✅ 可重试的HTTP错误: ${statusCode}`);
      return true;
    }

    // 非API错误，根据错误消息判断
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 不可重试的特殊错误消息
    const nonRetryableMessages = ["任务已取消", "API密钥错误", "余额不足"];

    for (const msg of nonRetryableMessages) {
      if (errorMessage.includes(msg)) {
        console.log(`[TaskQueue] ⛔ 不可重试错误: ${errorMessage}`);
        return false;
      }
    }

    // 默认可重试（网络问题、临时错误等）
    return true;
  }

  /**
   * 根据数据库任务ID查找队列任务
   */
  private findTaskByTaskId(taskId: string): QueueTask | undefined {
    // 在等待队列中查找
    const queueTask = this.queue.find((t) => t.taskId === taskId);
    if (queueTask) return queueTask;

    // 在运行中查找
    for (const task of this.runningTasks.values()) {
      if (task.taskId === taskId) return task;
    }

    // 在已完成中查找
    for (const task of this.completedTasks.values()) {
      if (task.taskId === taskId) return task;
    }

    return undefined;
  }

  /**
   * 获取队列状态
   */
  getStatus(): QueueStatus {
    return {
      pending: this.queue.length,
      running: this.runningTasks.size,
      completed: this.completedTasks.size,
      maxConcurrent: QUEUE_CONFIG.MAX_CONCURRENT_TASKS,
      maxQueueSize: QUEUE_CONFIG.MAX_QUEUE_SIZE,
    };
  }

  /**
   * 取消任务
   * @param taskId 数据库任务ID
   * @returns 是否成功取消
   */
  cancelTask(taskId: string): boolean {
    // 从等待队列中移除
    const queueIndex = this.queue.findIndex((t) => t.taskId === taskId);
    if (queueIndex !== -1) {
      const removed = this.queue.splice(queueIndex, 1)[0];
      console.log(`[TaskQueue] ❌ 任务已从队列中移除: ${removed.id}`);
      return true;
    }

    // 中止正在运行的任务
    for (const task of this.runningTasks.values()) {
      if (task.taskId === taskId) {
        task.abortController?.abort();
        console.log(`[TaskQueue] ❌ 任务已中止: ${task.id}`);
        return true;
      }
    }

    console.warn(`[TaskQueue] ⚠️  未找到可取消的任务: ${taskId}`);
    return false;
  }

  /**
   * 获取任务详情
   * @param taskId 数据库任务ID
   */
  getTaskInfo(taskId: string): QueueTask | null {
    return this.findTaskByTaskId(taskId) || null;
  }
}

// ============================================
// 导出单例实例
// ============================================
export const taskQueue = new TaskQueueManager();

// 导出类型
export type { QueueStatus, QueueTask };
