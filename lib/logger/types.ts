/**
 * 日志上下文类型定义
 * 用于结构化日志的元数据
 */
export interface LogContext {
  // 核心业务标识
  taskId?: string;
  userId?: string;

  // 性能指标
  duration?: number;

  // 错误信息
  errorCode?: string;
  statusCode?: number;

  // 扩展字段
  [key: string]: unknown;
}
