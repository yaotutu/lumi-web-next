"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Model3DViewer, {
  type Model3DViewerRef,
} from "@/app/workspace/components/Model3DViewer";
import { getProxiedModelUrl } from "@/lib/utils/proxy-url";
import { useUser } from "@/stores/auth-store";
import type { UserAssetWithUser } from "@/types";

// 材质颜色选项（从详情页复制）
const MATERIAL_COLORS = [
  { name: "原始贴图", value: null, icon: "🎨" },
  { name: "白色", value: "#F5F5F5", icon: "⚪" },
  { name: "蓝色", value: "#2196F3", icon: "🔵" },
  { name: "绿色", value: "#4CAF50", icon: "🟢" },
] as const;

interface ModelDetailModalProps {
  isOpen: boolean;
  modelId: string | null;
  onClose: () => void;
}

/**
 * 模型详情弹窗组件
 */
export default function ModelDetailModal({
  isOpen,
  modelId,
  onClose,
}: ModelDetailModalProps) {
  // 状态管理
  const [model, setModel] = useState<UserAssetWithUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // 用户状态和交互状态
  const user = useUser();
  const [interactionStatus, setInteractionStatus] = useState({
    isLiked: false,
    isFavorited: false,
  });
  const [currentLikes, setCurrentLikes] = useState(0);
  const [currentFavorites, setCurrentFavorites] = useState(0);
  const [isInteractionLoading, setIsInteractionLoading] = useState(false);

  // 引用
  const model3DViewerRef = useRef<Model3DViewerRef>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  /**
   * 加载模型详情
   */
  const loadModel = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        // 使用统一的 API 客户端
        const { apiClient } = await import("@/lib/api/client");
        const response = await apiClient.gallery.get(id);

        if (response.success) {
          const modelData = response.data;
          setModel(modelData);

          // 初始化交互状态
          setCurrentLikes(modelData.likeCount);
          setCurrentFavorites(modelData.favoriteCount || 0);

          // 如果用户已登录，获取交互状态
          if (user) {
            try {
              const interactionResponse = await fetch(
                `/api/gallery/models/${id}/interactions`,
              );
              if (interactionResponse.ok) {
                const interactionData = await interactionResponse.json();
                if (
                  interactionData.success &&
                  interactionData.data.isAuthenticated
                ) {
                  setInteractionStatus({
                    isLiked: interactionData.data.isLiked || false,
                    isFavorited: interactionData.data.isFavorited || false,
                  });
                }
              }
            } catch (error) {
              console.error("获取交互状态失败:", error);
            }
          }
        } else {
          throw new Error(response.error?.message || "加载失败");
        }
      } catch (err) {
        console.error("加载模型详情失败:", err);
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  /**
   * 当模型ID变化时重新加载模型
   */
  useEffect(() => {
    if (isOpen && modelId) {
      loadModel(modelId);
    } else {
      // 关闭弹窗时清空状态
      setModel(null);
      setError(null);
      setCurrentMaterial(null);
    }
  }, [isOpen, modelId, loadModel]);

  /**
   * 重置相机视角
   */
  const handleResetCamera = useCallback(() => {
    if (model3DViewerRef.current) {
      model3DViewerRef.current.resetCamera();
    }
  }, []);

  /**
   * 切换材质颜色
   */
  const handleMaterialChange = useCallback((color: string | null) => {
    if (model3DViewerRef.current) {
      model3DViewerRef.current.applyMaterial(color);
      setCurrentMaterial(color);
    }
  }, []);

  /**
   * 切换全屏
   */
  const handleToggleFullscreen = useCallback(async () => {
    if (!previewContainerRef.current) return;

    try {
      if (!isFullscreen) {
        // 进入全屏
        if (previewContainerRef.current.requestFullscreen) {
          await previewContainerRef.current.requestFullscreen();
        }
      } else {
        // 退出全屏
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (error) {
      console.error("全屏切换失败:", error);
    }
  }, [isFullscreen]);

  /**
   * 监听全屏状态变化
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  /**
   * 快捷键支持（F键切换全屏）
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // F 键切换全屏
      if ((e.key === "f" || e.key === "F") && model) {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [model, isOpen, handleToggleFullscreen]);

  /**
   * 下载模型（增加下载计数）
   */
  const handleDownload = useCallback(async () => {
    if (!model) return;

    setDownloading(true);

    try {
      // 使用统一的 API 客户端
      const { apiClient } = await import("@/lib/api/client");
      await apiClient.gallery.download(model.id);

      // 打开下载链接（检查 modelUrl 是否存在）
      if (model.modelUrl) {
        window.open(model.modelUrl, "_blank");
      }
    } catch (error) {
      console.error("下载失败:", error);
    } finally {
      setDownloading(false);
    }
  }, [model]);

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "未知";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  /**
   * 处理交互操作（点赞/收藏）
   */
  const handleInteraction = useCallback(
    async (type: "LIKE" | "FAVORITE") => {
      if (!model || !user) {
        alert("请先登录后再进行操作");
        return;
      }

      if (isInteractionLoading) return;

      setIsInteractionLoading(true);

      // 保存原始状态（用于回滚）
      const originalStatus = { ...interactionStatus };
      const originalLikes = currentLikes;
      const originalFavorites = currentFavorites;

      // 乐观更新 UI
      if (type === "LIKE") {
        setInteractionStatus((prev) => ({ ...prev, isLiked: !prev.isLiked }));
        setCurrentLikes((prev) =>
          interactionStatus.isLiked ? prev - 1 : prev + 1,
        );
      } else {
        setInteractionStatus((prev) => ({
          ...prev,
          isFavorited: !prev.isFavorited,
        }));
        setCurrentFavorites((prev) =>
          interactionStatus.isFavorited ? prev - 1 : prev + 1,
        );
      }

      try {
        const response = await fetch(
          `/api/gallery/models/${model.id}/interactions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ type }),
          },
        );

        if (!response.ok) {
          throw new Error("操作失败");
        }

        const data = await response.json();
        if (data.success) {
          // 使用服务器返回的权威数据（确保前后端同步）
          setCurrentLikes(data.data.likeCount);
          setCurrentFavorites(data.data.favoriteCount);
          setInteractionStatus((prev) => ({
            ...prev,
            isLiked: type === "LIKE" ? data.data.isInteracted : prev.isLiked,
            isFavorited:
              type === "FAVORITE" ? data.data.isInteracted : prev.isFavorited,
          }));
        } else {
          throw new Error(data.error?.message || "操作失败");
        }
      } catch (error) {
        console.error("Interaction failed:", error);
        // 回滚到原始状态
        setInteractionStatus(originalStatus);
        setCurrentLikes(originalLikes);
        setCurrentFavorites(originalFavorites);
      } finally {
        setIsInteractionLoading(false);
      }
    },
    [
      model,
      user,
      interactionStatus,
      currentLikes,
      currentFavorites,
      isInteractionLoading,
    ],
  );

  /**
   * 格式化日期
   */
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 弹窗未打开时不渲染
  if (!isOpen) return null;

  // 获取代理后的模型 URL
  const proxiedModelUrl = model ? getProxiedModelUrl(model.modelUrl) : null;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 背景点击关闭弹窗
    // biome-ignore lint/a11y/noStaticElementInteractions: 这是弹窗遮罩层，需要点击关闭功能
    <div ref={modalRef} className="model-detail-modal" onClick={onClose}>
      {/* 背景遮罩层 */}
      <div className="model-detail-modal__backdrop" />

      {/* 弹窗内容 - 阻止点击事件冒泡 */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: 只用于阻止冒泡，无需键盘事件 */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: 只用于阻止冒泡，无需role */}
      <div
        className="model-detail-modal__content relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          type="button"
          className="absolute top-4 right-4 z-[60] flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#1a1a1a] text-white/60 transition-all duration-200 hover:bg-[#2d2d2d] hover:text-white hover:border-yellow-1/50"
          onClick={onClose}
          title="关闭弹窗"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* 滚动容器 */}
        <div className="model-detail-modal__body">
          {/* 加载中状态 */}
          {loading && (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-3 border-yellow-1/20 border-t-yellow-1 mx-auto mb-4" />
                <p className="text-sm text-white/60">加载中...</p>
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {error && !loading && (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="text-center px-6">
                <div className="text-6xl mb-4">⚠️</div>
                <p className="text-lg text-white/80 mb-2">加载失败</p>
                <p className="text-sm text-white/50 mb-6">{error}</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => modelId && loadModel(modelId)}
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {/* 模型详情内容 - 黄金比例布局 */}
          {model && !loading && !error && (
            <div className="flex flex-col md:flex-row h-full">
              {/* 左侧：3D 预览区域 - 58% */}
              <div
                className="w-full md:w-[58%] relative"
                style={{
                  animation: 'content-fade-in 0.4s cubic-bezier(0.32, 0.72, 0, 1) 0.1s both'
                }}
              >
                <div
                  ref={previewContainerRef}
                  className="h-full w-full bg-[radial-gradient(circle_at_50%_50%,#424242_0%,#2d2d2d_100%)]"
                >
                  <Model3DViewer
                    ref={model3DViewerRef}
                    modelUrl={proxiedModelUrl || ""}
                    showGrid={showGrid}
                  />
                </div>

                {/* 控制按钮（左下角） */}
                <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-xl border border-white/10 bg-[#242424] p-1.5">
                  {/* 网格切换 */}
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border-none bg-transparent text-white/60 transition-all duration-200 hover:bg-white/10 hover:text-yellow-1"
                    onClick={() => setShowGrid(!showGrid)}
                    title={showGrid ? "隐藏网格" : "显示网格"}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                    </svg>
                  </button>

                  {/* 重置视角 */}
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border-none bg-transparent text-white/60 transition-all duration-200 hover:bg-white/10 hover:text-yellow-1"
                    onClick={handleResetCamera}
                    title="重置视角"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>

                  {/* 全屏预览 */}
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border-none bg-transparent text-white/60 transition-all duration-200 hover:bg-white/10 hover:text-yellow-1"
                    onClick={handleToggleFullscreen}
                    title={isFullscreen ? "退出全屏 (F)" : "全屏预览 (F)"}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                      />
                    </svg>
                  </button>

                  {/* 分隔线 */}
                  <div className="h-6 w-px bg-white/20" />

                  {/* 材质切换 */}
                  <div className="flex items-center gap-1.5">
                    {MATERIAL_COLORS.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => handleMaterialChange(color.value)}
                        title={color.name}
                        className={`flex h-7 w-7 items-center justify-center rounded-md border transition-all duration-200 hover:scale-105 ${
                          currentMaterial === color.value
                            ? "bg-gradient-to-br from-yellow-1/20 to-yellow-1/10 border-yellow-1/50 ring-1 ring-yellow-1/30"
                            : "border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] hover:border-yellow-1/50 hover:bg-yellow-1/10"
                        }`}
                      >
                        <span className="text-xs transition-transform">
                          {color.icon}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 右侧：模型信息区域 - 42% */}
              <div
                className="w-full md:w-[42%] flex flex-col overflow-y-auto bg-gradient-to-b from-[#0d0d0d] to-[#1a1a1a] p-6 gap-4"
                style={{
                  animation: 'content-fade-in 0.4s cubic-bezier(0.32, 0.72, 0, 1) 0.15s both'
                }}
              >
                {/* 基本信息 - 精简版 */}
                <div className="rounded-xl bg-gradient-to-br from-surface-2/80 to-surface-3/60 border border-white/5 p-5 backdrop-blur-sm shadow-lg">
                  {/* 模型名称和状态 */}
                  <div className="flex items-center justify-between mb-2">
                    <h1 className="text-xl font-semibold text-white leading-tight" style={{ letterSpacing: '-0.01em' }}>
                      {model.name}
                    </h1>

                    {/* 状态标签 */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-green-1/20 to-green-1/10 border border-green-1/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-1 animate-pulse"></div>
                      <span className="text-[10px] text-green-1 font-medium">
                        已发布
                      </span>
                    </div>
                  </div>

                  {/* 作者和时间信息 */}
                  <div className="flex items-center gap-3 text-xs text-text-subtle">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 text-blue-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                      <span>{model.user.name || "匿名用户"}</span>
                    </div>
                    <span className="text-text-subtle/20">•</span>
                    <span>{formatDate(model.createdAt)}</span>
                  </div>
                </div>

                {/* 📊 数据统计 - 无标题版 */}
                <div className="rounded-xl bg-gradient-to-br from-surface-2/80 to-surface-3/60 border border-white/5 p-4 backdrop-blur-sm shadow-lg">
                  {/* 2列统计布局 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2.5 rounded-lg bg-gradient-to-br from-yellow-1/10 to-yellow-1/5 border border-yellow-1/20 hover:from-yellow-1/15 hover:to-yellow-1/10 transition-all duration-200">
                      <div className="flex items-center justify-center mb-1">
                        <svg
                          className="w-3.5 h-3.5 text-yellow-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </div>
                      <div className="text-base font-bold text-yellow-1">
                        {model.viewCount > 1000
                          ? `${(model.viewCount / 1000).toFixed(1)}k`
                          : model.viewCount}
                      </div>
                      <div className="text-[8px] text-text-subtle">浏览</div>
                    </div>

                    <div className="text-center p-2.5 rounded-lg bg-gradient-to-br from-green-1/10 to-green-1/5 border border-green-1/20 hover:from-green-1/15 hover:to-green-1/10 transition-all duration-200">
                      <div className="flex items-center justify-center mb-1">
                        <svg
                          className="w-3.5 h-3.5 text-green-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </div>
                      <div className="text-base font-bold text-green-1">
                        {model.downloadCount}
                      </div>
                      <div className="text-[8px] text-text-subtle">下载</div>
                    </div>
                  </div>
                </div>

                {/* 💝 互动操作 - 精简版 */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleInteraction("LIKE")}
                    disabled={isInteractionLoading}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all duration-250 group hover:scale-[1.02] active:scale-[0.98] ${
                      interactionStatus.isLiked
                        ? "bg-gradient-to-r from-red-1/20 to-red-1/10 border-red-1/30 text-red-1"
                        : "bg-gradient-to-r from-white/5 to-white/[0.02] border-white/10 text-white/70 hover:from-red-1/10 hover:to-red-1/5 hover:border-red-1/30 hover:text-red-1"
                    } border`}
                    title={user ? "点赞" : "请先登录"}
                  >
                    <svg
                      className="h-4 w-4 transition-transform group-hover:scale-110"
                      fill={interactionStatus.isLiked ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 20 20"
                    >
                      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                    </svg>
                    <div className="text-left">
                      <div className="text-sm font-bold">{currentLikes}</div>
                      <div className="text-[10px] opacity-80">
                        {interactionStatus.isLiked ? "已点赞" : "点赞"}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInteraction("FAVORITE")}
                    disabled={isInteractionLoading}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all duration-250 group hover:scale-[1.02] active:scale-[0.98] ${
                      interactionStatus.isFavorited
                        ? "bg-gradient-to-r from-amber-1/20 to-amber-1/10 border-amber-1/30 text-amber-1"
                        : "bg-gradient-to-r from-white/5 to-white/[0.02] border-white/10 text-white/70 hover:from-amber-1/10 hover:to-amber-1/5 hover:border-amber-1/30 hover:text-amber-1"
                    } border`}
                    title={user ? "收藏" : "请先登录"}
                  >
                    <svg
                      className="h-4 w-4 transition-transform group-hover:scale-110"
                      fill={
                        interactionStatus.isFavorited ? "currentColor" : "none"
                      }
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539 1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <div className="text-left">
                      <div className="text-sm font-bold">
                        {currentFavorites}
                      </div>
                      <div className="text-[10px] opacity-80">
                        {interactionStatus.isFavorited ? "已收藏" : "收藏"}
                      </div>
                    </div>
                  </button>
                </div>

                {/* 🛠️ 工具与信息 - 紧凑版 */}
                <div className="rounded-xl bg-gradient-to-br from-surface-2/80 to-surface-3/60 border border-white/5 p-5 backdrop-blur-sm shadow-lg space-y-4">
                  {/* 技术信息 */}
                  <div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between items-center p-1.5 rounded-lg bg-white/5">
                        <span className="text-text-subtle">格式</span>
                        <span className="px-1.5 py-0.5 rounded bg-yellow-1/10 text-yellow-1 font-medium text-[10px]">
                          {model.format}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-1.5 rounded-lg bg-white/5">
                        <span className="text-text-subtle">大小</span>
                        <span className="text-text-strong font-medium">
                          {formatFileSize(model.fileSize)}
                        </span>
                      </div>
                      {model.faceCount && (
                        <div className="flex justify-between items-center p-1.5 rounded-lg bg-white/5">
                          <span className="text-text-subtle">面数</span>
                          <span className="text-text-strong font-medium text-[10px]">
                            {model.faceCount.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {model.vertexCount && (
                        <div className="flex justify-between items-center p-1.5 rounded-lg bg-white/5">
                          <span className="text-text-subtle">顶点</span>
                          <span className="text-text-strong font-medium text-[10px]">
                            {model.vertexCount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 下载按钮 */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-1 to-yellow-1/80 hover:from-yellow-1/90 hover:to-yellow-1/70 text-black font-bold transition-all duration-[250ms] transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-yellow-1/25 hover:shadow-xl hover:shadow-yellow-1/35 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                        <span>下载中...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        <span>下载 3D 模型</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
