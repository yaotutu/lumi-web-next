import { useToastStore } from "@/stores/toast-store";
import type { ToastType } from "@/stores/toast-store";

/**
 * Toast 快捷方法
 * 提供便捷的方式来显示 Toast 提示
 */

// 默认显示时长(毫秒)
const DEFAULT_DURATION = 3000;

/**
 * 显示成功提示
 * @param message 提示消息
 * @param duration 显示时长(毫秒),默认 3000
 */
export const success = (
  message: string,
  duration: number = DEFAULT_DURATION,
): void => {
  useToastStore.getState().addToast({
    type: "success",
    message,
    duration,
  });
};

/**
 * 显示错误提示
 * @param message 提示消息
 * @param duration 显示时长(毫秒),默认 3000
 */
export const error = (
  message: string,
  duration: number = DEFAULT_DURATION,
): void => {
  useToastStore.getState().addToast({
    type: "error",
    message,
    duration,
  });
};

/**
 * 显示警告提示
 * @param message 提示消息
 * @param duration 显示时长(毫秒),默认 3000
 */
export const warning = (
  message: string,
  duration: number = DEFAULT_DURATION,
): void => {
  useToastStore.getState().addToast({
    type: "warning",
    message,
    duration,
  });
};

/**
 * 显示信息提示
 * @param message 提示消息
 * @param duration 显示时长(毫秒),默认 3000
 */
export const info = (
  message: string,
  duration: number = DEFAULT_DURATION,
): void => {
  useToastStore.getState().addToast({
    type: "info",
    message,
    duration,
  });
};

/**
 * Toast 对象,包含所有快捷方法
 */
export const toast = {
  success,
  error,
  warning,
  info,
};

/**
 * useToast Hook
 * 在组件中使用 Toast 状态和方法
 * @returns Toast 状态和方法
 */
export function useToast() {
  return useToastStore();
}
