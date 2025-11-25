import { useCallback, useEffect, useState } from "react";

/**
 * 模型详情弹窗状态管理 Hook
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);

  /**
   * 打开弹窗
   * @param modelId 模型ID，可选
   */
  const openModal = useCallback((modelId?: string) => {
    setIsOpen(true);
    if (modelId) {
      setCurrentModelId(modelId);
    }
  }, []);

  /**
   * 关闭弹窗
   */
  const closeModal = useCallback(() => {
    setIsOpen(false);
    // 延迟清除模型ID，避免关闭动画时闪烁
    setTimeout(() => {
      setCurrentModelId(null);
    }, 300);
  }, []);

  /**
   * 切换弹窗状态
   * @param modelId 模型ID，可选
   */
  const toggleModal = useCallback(
    (modelId?: string) => {
      if (isOpen) {
        closeModal();
      } else {
        openModal(modelId);
      }
    },
    [isOpen, openModal, closeModal],
  );

  /**
   * 设置当前模型ID
   */
  const setModelId = useCallback((modelId: string | null) => {
    setCurrentModelId(modelId);
  }, []);

  /**
   * 键盘事件处理（ESC键关闭弹窗）
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeModal]);

  /**
   * 弹窗打开时禁止背景滚动
   */
  useEffect(() => {
    if (isOpen) {
      // 禁止背景滚动
      document.body.style.overflow = "hidden";
    } else {
      // 恢复背景滚动
      document.body.style.overflow = "unset";
    }

    // 清理函数
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return {
    isOpen,
    currentModelId,
    openModal,
    closeModal,
    toggleModal,
    setModelId,
  };
}
