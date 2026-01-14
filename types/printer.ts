/**
 * 打印机相关类型定义
 *
 * 文件说明:
 * - 定义打印机设备、任务、状态等相关类型
 * - 用于类型安全的打印机管理功能
 */

/**
 * 打印机状态枚举
 *
 * - ONLINE: 在线空闲，等待任务
 * - OFFLINE: 离线，无法连接
 * - PRINTING: 打印中，正在执行任务
 * - PAUSED: 已暂停，等待继续
 * - ERROR: 错误状态，需要人工干预
 */
export type PrinterStatus =
  | "ONLINE"
  | "OFFLINE"
  | "PRINTING"
  | "PAUSED"
  | "ERROR";

/**
 * 当前打印任务接口
 *
 * 描述正在执行的打印任务的详细信息
 */
export interface CurrentJob {
  /** 任务名称（通常是模型文件名） */
  name: string;

  /** 打印进度（0-100 的整数百分比） */
  progress: number;

  /** 剩余时间（秒） */
  timeRemaining: number;

  /** 任务开始时间 */
  startedAt: Date;
}

/**
 * 打印机接口
 *
 * 描述 3D 打印机设备的完整信息
 */
export interface Printer {
  /** 打印机唯一标识 */
  id: string;

  /** 打印机名称（用户自定义） */
  name: string;

  /** 打印机型号（如 "Bambu Lab X1", "Creality Ender 3"） */
  model: string;

  /** 打印机当前状态 */
  status: PrinterStatus;

  /** 当前正在执行的打印任务（仅在 PRINTING 或 PAUSED 状态时存在） */
  currentJob?: CurrentJob;

  /** 错误信息（仅在 ERROR 状态时存在） */
  errorMessage?: string;

  /** 最后在线时间（用于显示离线时长） */
  lastOnline?: Date;
}

/**
 * 添加打印机表单数据接口
 *
 * 用于绑定新打印机时的表单提交
 */
export interface AddPrinterFormData {
  /** 打印机名称 */
  name: string;

  /** 打印机型号 */
  model: string;

  /** IP 地址（局域网连接） */
  ipAddress: string;

  /** API Key（访问密钥） */
  apiKey: string;
}
