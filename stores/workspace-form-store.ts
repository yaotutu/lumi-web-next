/**
 * Workspace 表单持久化 (Zustand + localStorage)
 * 职责：保存用户填写的表单数据，防止登录/刷新时丢失
 *
 * 核心场景：
 * 1. 用户填写 prompt 但未登录
 * 2. 点击生成 → 弹出登录弹窗
 * 3. 登录成功 → 恢复之前填写的 prompt
 * 4. 用户可以直接提交
 *
 * 技术实现：
 * - Zustand persist 中间件自动持久化到 localStorage
 * - 页面刷新后自动恢复数据
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Workspace 表单数据接口
 */
interface WorkspaceFormData {
  /** 用户输入的 prompt */
  prompt: string;

  /** 最后编辑时间（用于判断数据是否过期） */
  lastUpdated: number;
}

/**
 * Workspace 表单 Store 接口
 */
interface WorkspaceFormStore extends WorkspaceFormData {
  /**
   * 设置 prompt
   * @param prompt - 用户输入的文本
   */
  setPrompt: (prompt: string) => void;

  /**
   * 重置表单数据
   */
  reset: () => void;

  /**
   * 检查数据是否过期
   * @param maxAge - 最大有效期（毫秒），默认 24 小时
   * @returns 是否过期
   */
  isExpired: (maxAge?: number) => boolean;
}

/**
 * 默认最大有效期：24 小时
 */
const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Workspace 表单 Store
 *
 * **持久化**：自动保存到 localStorage
 * **自动恢复**：页面刷新后自动加载
 * **过期清理**：超过 24 小时的数据自动清除
 */
export const useWorkspaceFormStore = create<WorkspaceFormStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      prompt: "",
      lastUpdated: Date.now(),

      /**
       * 设置 prompt
       */
      setPrompt: (prompt: string) => {
        set({
          prompt,
          lastUpdated: Date.now(),
        });
      },

      /**
       * 重置表单数据
       */
      reset: () => {
        set({
          prompt: "",
          lastUpdated: Date.now(),
        });
      },

      /**
       * 检查数据是否过期
       */
      isExpired: (maxAge = DEFAULT_MAX_AGE) => {
        const { lastUpdated } = get();
        return Date.now() - lastUpdated > maxAge;
      },
    }),
    {
      name: "workspace-form-storage", // localStorage key
      storage: createJSONStorage(() => localStorage), // 使用 localStorage
      // 部分持久化：只保存表单数据，不保存方法
      partialize: (state) => ({
        prompt: state.prompt,
        lastUpdated: state.lastUpdated,
      }),
    },
  ),
);

/**
 * Workspace 表单选择器
 */
export const useWorkspaceForm = () => useWorkspaceFormStore();

/**
 * Workspace 表单便捷选择器
 */
export const useWorkspacePrompt = () =>
  useWorkspaceFormStore((state) => state.prompt);

/**
 * Workspace 表单操作方法（支持在组件外部调用）
 */
export const workspaceFormActions = {
  /**
   * 设置 prompt
   */
  setPrompt: (prompt: string) => {
    useWorkspaceFormStore.getState().setPrompt(prompt);
  },

  /**
   * 重置表单
   */
  reset: () => {
    useWorkspaceFormStore.getState().reset();
  },

  /**
   * 获取当前 prompt
   */
  getPrompt: () => {
    return useWorkspaceFormStore.getState().prompt;
  },

  /**
   * 检查是否过期
   */
  isExpired: (maxAge?: number) => {
    return useWorkspaceFormStore.getState().isExpired(maxAge);
  },
};
