import { create } from "zustand";

/**
 * Toast 类型
 */
export type ToastType = "success" | "error" | "warning" | "info";

/**
 * Toast 项目接口
 */
export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // 显示时长(毫秒),0 表示不自动关闭
}

/**
 * Toast Store 状态接口
 */
interface ToastStore {
  toasts: ToastItem[];
  // 添加 Toast
  addToast: (toast: Omit<ToastItem, "id">) => void;
  // 移除 Toast
  removeToast: (id: string) => void;
  // 清空所有 Toast
  clearAll: () => void;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 全局 Toast Store
 * 使用 Zustand 管理所有 Toast 状态
 */
export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  // 添加 Toast
  addToast: (toast) => {
    const id = generateId();
    const newToast: ToastItem = {
      id,
      ...toast,
      duration: toast.duration ?? 3000, // 默认 3 秒
    };

    // 添加新 Toast
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // 自动关闭(如果 duration > 0)
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }
  },

  // 移除 Toast
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  // 清空所有 Toast
  clearAll: () => {
    set({ toasts: [] });
  },
}));
