/**
 * 登录弹窗状态管理 (Zustand)
 * 职责：管理全局登录弹窗的显示/隐藏、上下文和回调
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

/**
 * 登录弹窗的触发上下文
 */
export type LoginModalContext =
  | "workspace" // 工作台提交任务
  | "gallery" // 画廊点赞/收藏
  | "history" // 历史记录页面
  | "general"; // 通用场景

/**
 * 登录弹窗 Store 接口
 */
interface LoginModalStore {
  /** 弹窗是否打开 */
  isOpen: boolean;

  /** 触发弹窗的上下文 */
  context: LoginModalContext;

  /** 登录成功后的回调函数 */
  onSuccess?: () => void | Promise<void>;

  /**
   * 打开登录弹窗
   * @param context 触发上下文
   * @param onSuccess 登录成功后的回调
   */
  open: (
    context?: LoginModalContext,
    onSuccess?: () => void | Promise<void>,
  ) => void;

  /**
   * 关闭登录弹窗
   */
  close: () => void;
}

/**
 * 登录弹窗 Store
 *
 * **初始状态**：弹窗关闭，通用上下文
 * **特点**：
 * - 全局单例
 * - 支持上下文感知（知道从哪个页面/功能触发）
 * - 支持登录成功回调（自动执行失败的操作）
 * - 类型安全
 */
export const useLoginModalStore = create<LoginModalStore>()(
  devtools(
    (set) => ({
      // 初始状态
      isOpen: false,
      context: "general",
      onSuccess: undefined,

      /**
       * 打开登录弹窗
       */
      open: (context = "general", onSuccess) => {
        set({
          isOpen: true,
          context,
          onSuccess,
        });
      },

      /**
       * 关闭登录弹窗
       */
      close: () => {
        set({
          isOpen: false,
          context: "general",
          onSuccess: undefined,
        });
      },
    }),
    {
      name: "login-modal-store", // Store 名称，用于开发工具标识
    },
  ),
);

/**
 * 登录弹窗选择器
 */
export const useLoginModal = () => useLoginModalStore();

/**
 * 登录弹窗便捷选择器
 */
export const useLoginModalOpen = () =>
  useLoginModalStore((state) => state.isOpen);
export const useLoginModalContext = () =>
  useLoginModalStore((state) => state.context);

/**
 * 登录弹窗操作方法（支持在组件外部调用）
 */
export const loginModalActions = {
  /**
   * 打开登录弹窗
   */
  open: (
    context?: LoginModalContext,
    onSuccess?: () => void | Promise<void>,
  ) => {
    useLoginModalStore.getState().open(context, onSuccess);
  },

  /**
   * 关闭登录弹窗
   */
  close: () => {
    useLoginModalStore.getState().close();
  },

  /**
   * 获取登录成功回调
   */
  getOnSuccess: () => {
    return useLoginModalStore.getState().onSuccess;
  },
};
