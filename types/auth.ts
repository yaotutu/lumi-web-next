/**
 * 认证系统相关类型定义
 * 职责：明确定义认证状态，避免 null 的语义歧义
 */

/**
 * 认证状态枚举
 * 明确定义用户的各种认证状态，避免使用 null 或布尔值的模糊表达
 */
export enum AuthStatus {
  /** 已认证 - 用户有效登录 */
  AUTHENTICATED = "authenticated",
  /** 未认证 - 用户未登录或会话失效 */
  UNAUTHENTICATED = "unauthenticated",
  /** 已过期 - 登录会话已过期 */
  EXPIRED = "expired",
  /** 错误状态 - 认证检查过程中出现异常 */
  ERROR = "error",
}

/**
 * 用户统计数据
 * 从后端 /api/auth/me 接口获取
 */
export interface UserStats {
  /** 总模型数 */
  totalModels: number;
  /** 公开模型数 */
  publicModels: number;
  /** 私有模型数 */
  privateModels: number;
  /** 获得的总点赞数 */
  totalLikes: number;
  /** 获得的总收藏数 */
  totalFavorites: number;
  /** 获得的总浏览数 */
  totalViews: number;
  /** 总下载数 */
  totalDownloads: number;
  /** 用户点赞的模型数 */
  likedModelsCount: number;
  /** 用户收藏的模型数 */
  favoritedModelsCount: number;
  /** 总生成请求数 */
  totalRequests: number;
  /** 已完成的请求数 */
  completedRequests: number;
  /** 失败的请求数 */
  failedRequests: number;
}

/**
 * 用户基本信息
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  /** 用户统计数据（可选，从后端获取） */
  stats?: UserStats;
}

/**
 * 认证状态数据
 * 包含认证状态、用户信息和最后检查时间
 */
export interface AuthState {
  /** 当前认证状态 */
  status: AuthStatus;
  /** 用户信息（仅在已认证时有值） */
  user: User | null;
  /** 最后检查时间 */
  lastChecked: Date;
}

/**
 * API 响应中的认证数据格式
 */
export interface AuthResponse {
  success: true;
  data: {
    /** 认证状态 */
    status: AuthStatus;
    /** 用户信息 */
    user: User | null;
  };
}

/**
 * 认证检查结果
 * 用于服务端内部逻辑
 */
export interface AuthCheckResult {
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 认证状态 */
  status: AuthStatus;
  /** 用户会话信息 */
  userSession?: {
    userId: string;
    email: string;
  };
  /** 用户详细信息（仅在已认证时） */
  user?: User;
}
