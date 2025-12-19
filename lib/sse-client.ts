/**
 * SSE (Server-Sent Events) 客户端
 * 使用 fetch + ReadableStream 实现，支持自定义 Headers（如 Bearer Token）
 *
 * 为什么不用 EventSource？
 * - EventSource 不支持自定义 HTTP Headers
 * - 无法携带 Authorization Token
 * - 本实现通过 fetch API 解决了这个问题
 */

import { buildApiUrl } from './config/api';
import { tokenActions } from '@/stores/token-store';

// 简单的日志工具（使用 console）
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

/**
 * URL 字段名称列表（需要自动转换的字段）
 */
const URL_FIELDS = [
  "url",
  "imageUrl",
  "modelUrl",
  "mtlUrl",
  "textureUrl",
  "previewImageUrl",
] as const;

/**
 * 转换 SSE 事件数据中的 URL 字段（相对路径 → 完整 URL）
 */
function transformEventUrls<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => transformEventUrls(item)) as T;
  }

  if (typeof data === "object") {
    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (
        URL_FIELDS.includes(key as any) &&
        typeof value === "string" &&
        value.startsWith("/")
      ) {
        result[key] = buildApiUrl(value);
      } else if (typeof value === "object") {
        result[key] = transformEventUrls(value);
      } else {
        result[key] = value;
      }
    }

    return result as T;
  }

  return data;
}

/**
 * SSE 事件类型
 */
export interface SSEEvent {
  type: string;
  data: any;
  id?: string;
  retry?: number;
}

/**
 * SSE 事件处理器
 */
export type SSEEventHandler = (event: SSEEvent) => void;

/**
 * SSE 错误处理器
 */
export type SSEErrorHandler = (error: Error) => void;

/**
 * SSE 客户端配置
 */
export interface SSEClientOptions {
  /** 自动重连 */
  autoReconnect?: boolean;
  /** 重连延迟（毫秒） */
  reconnectDelay?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 自定义 Headers */
  headers?: Record<string, string>;
  /** 连接成功回调 */
  onOpen?: () => void;
  /** 连接关闭回调 */
  onClose?: () => void;
  /** 错误回调 */
  onError?: SSEErrorHandler;
}

/**
 * SSE 客户端类
 *
 * 使用示例：
 * ```typescript
 * const client = new SSEClient('/api/tasks/123/events');
 *
 * client.on('task:init', (event) => {
 *   console.log('任务初始化', event.data);
 * });
 *
 * client.on('image:completed', (event) => {
 *   console.log('图片生成完成', event.data);
 * });
 *
 * await client.connect();
 *
 * // 关闭连接
 * client.disconnect();
 * ```
 */
export class SSEClient {
  private url: string;
  private options: Required<SSEClientOptions>;
  private eventHandlers: Map<string, SSEEventHandler[]> = new Map();
  private abortController: AbortController | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;
  private lastEventId: string | null = null;

  constructor(url: string, options: SSEClientOptions = {}) {
    this.url = url;
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 2000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      headers: options.headers ?? {},
      onOpen: options.onOpen ?? (() => {}),
      onClose: options.onClose ?? (() => {}),
      onError: options.onError ?? ((error) => logger.error('SSE Error:', error)),
    };
  }

  /**
   * 注册事件处理器
   *
   * @param eventType - 事件类型（如 'task:init', 'image:completed'）
   * @param handler - 事件处理函数
   */
  on(eventType: string, handler: SSEEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * 移除事件处理器
   *
   * @param eventType - 事件类型
   * @param handler - 要移除的处理函数（可选，不传则移除该类型的所有处理器）
   */
  off(eventType: string, handler?: SSEEventHandler): void {
    if (!handler) {
      this.eventHandlers.delete(eventType);
      return;
    }

    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件处理器
   */
  private emit(event: SSEEvent): void {
    // ✅ 自动转换事件数据中的 URL 字段（相对路径 → 完整 URL）
    const transformedEvent = {
      ...event,
      data: transformEventUrls(event.data),
    };

    const handlers = this.eventHandlers.get(transformedEvent.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(transformedEvent);
        } catch (error) {
          logger.error(`SSE event handler error for ${transformedEvent.type}:`, error);
        }
      });
    }
  }

  /**
   * 连接到 SSE 端点
   */
  async connect(): Promise<void> {
    if (this.abortController) {
      logger.warn('SSE connection already exists');
      return;
    }

    this.isManualDisconnect = false;
    this.abortController = new AbortController();

    try {
      const fullUrl = buildApiUrl(this.url);

      // 自动添加 Bearer Token
      const token = tokenActions.getToken();
      const headers: Record<string, string> = {
        ...this.options.headers,
      };

      if (token) {
        headers['Authorization'] = token;
      }

      logger.info('SSE connecting:', fullUrl);
      logger.info('SSE headers:', { ...headers, Authorization: token ? 'Bearer ***' : 'none' });

      // 如果有 lastEventId，添加到 headers（用于断线重连）
      if (this.lastEventId) {
        headers['Last-Event-ID'] = this.lastEventId;
      }

      const response = await fetch(fullUrl, {
        headers,
        signal: this.abortController.signal,
      });

      logger.info('SSE response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      logger.info('SSE connected');
      this.options.onOpen();
      this.reconnectAttempts = 0; // 重置重连计数

      // 开始读取流
      this.reader = response.body.getReader();
      await this.readStream();

    } catch (error) {
      // 如果是手动断开连接，忽略所有错误
      if (this.isManualDisconnect) {
        logger.info('SSE connection aborted (manual disconnect)');
        return;
      }

      // 如果是 AbortError（非手动断开），也忽略
      if (error instanceof Error && error.name === 'AbortError') {
        logger.info('SSE connection aborted');
        return;
      }

      // 其他错误才需要处理
      logger.error('SSE connection error:', error);
      this.options.onError(error as Error);

      // 如果不是手动断开，尝试重连
      if (this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    } finally {
      this.cleanup();
    }
  }

  /**
   * 读取流数据
   */
  private async readStream(): Promise<void> {
    if (!this.reader) return;

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent: Partial<SSEEvent> = {};

    try {
      while (true) {
        const { value, done } = await this.reader.read();

        if (done) {
          logger.info('SSE stream ended');
          break;
        }

        // 解码数据并添加到缓冲区
        buffer += decoder.decode(value, { stream: true });

        // 按行分割
        const lines = buffer.split('\n');
        // 保留最后一个不完整的行
        buffer = lines.pop() || '';

        // 处理每一行
        for (const line of lines) {
          // 空行表示事件结束
          if (line.trim() === '') {
            if (currentEvent.type && currentEvent.data !== undefined) {
              // 发送完整事件
              this.emit(currentEvent as SSEEvent);

              // 保存事件 ID（用于断线重连）
              if (currentEvent.id) {
                this.lastEventId = currentEvent.id;
              }
            }
            // 重置当前事件
            currentEvent = {};
            continue;
          }

          // 解析事件字段
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) continue;

          const field = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();

          switch (field) {
            case 'event':
              currentEvent.type = value;
              break;
            case 'data':
              try {
                currentEvent.data = JSON.parse(value);
              } catch {
                currentEvent.data = value;
              }
              break;
            case 'id':
              currentEvent.id = value;
              break;
            case 'retry':
              currentEvent.retry = Number.parseInt(value, 10);
              if (!Number.isNaN(currentEvent.retry)) {
                this.options.reconnectDelay = currentEvent.retry;
              }
              break;
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 正常中断
        return;
      }
      throw error;
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      logger.error(`SSE max reconnect attempts (${this.options.maxReconnectAttempts}) reached`);
      this.options.onError(new Error('Max reconnect attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectDelay;

    logger.info(`SSE reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.reader = null;
    this.abortController = null;
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    try {
      logger.info('SSE disconnecting');

      this.isManualDisconnect = true;

      // 取消重连定时器
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // 优先关闭读取器，这会自动中止底层的 fetch 请求
      // 这样可以避免浏览器在控制台打印 AbortError
      if (this.reader) {
        this.reader.cancel().catch(() => {
          // 忽略取消错误
        });
      }

      // 清理 AbortController
      // 注意：不调用 abort()，因为 reader.cancel() 已经处理了请求中止
      // 直接清空引用即可
      this.abortController = null;

      this.cleanup();
      this.options.onClose();
    } catch (error) {
      // 确保 disconnect 不会抛出任何错误
      logger.warn('Error during disconnect (ignored):', error);
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.abortController !== null && this.reader !== null;
  }
}
