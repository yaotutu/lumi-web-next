"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Model3DViewer, {
  type Model3DViewerRef,
} from "@/app/workspace/components/Model3DViewer";
import { getProxiedModelUrl } from "@/lib/utils/proxy-url";
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

  // 引用
  const model3DViewerRef = useRef<Model3DViewerRef>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  /**
   * 加载模型详情
   */
  const loadModel = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // 使用统一的 API 客户端
      const { apiClient } = await import("@/lib/api/client");
      const response = await apiClient.gallery.get(id);

      if (response.success) {
        setModel(response.data);
      } else {
        throw new Error(response.error?.message || "加载失败");
      }
    } catch (err) {
      console.error("加载模型详情失败:", err);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

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

      // 打开下载链接
      window.open(model.modelUrl, "_blank");
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
        className="model-detail-modal__content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          type="button"
          className="model-detail-modal__close"
          onClick={onClose}
          title="关闭弹窗"
        >
          <svg
            className="h-5 w-5"
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

          {/* 模型详情内容 - 左右布局 */}
          {model && !loading && !error && (
            <div className="flex flex-col md:flex-row h-full">
              {/* 左侧：3D 预览区域 */}
              <div className="w-full md:w-[65%] relative">
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
                </div>
              </div>

              {/* 右侧：模型信息区域 */}
              <div className="w-full md:w-[35%] flex flex-col overflow-y-auto bg-[#0d0d0d] p-6">
                {/* 基本信息 */}
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-white mb-2">
                    {model.name}
                  </h1>
                  <div className="flex items-center gap-3 text-xs text-white/60">
                    <span>作者: {model.user.name || "匿名用户"}</span>
                    <span>•</span>
                    <span>{formatDate(model.createdAt)}</span>
                  </div>
                </div>

                {/* 材质切换按钮 */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-white mb-3">
                    更换材质
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {MATERIAL_COLORS.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => handleMaterialChange(color.value)}
                        title={color.name}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 ${
                          currentMaterial === color.value
                            ? "bg-yellow-1/20 border-yellow-1 ring-2 ring-yellow-1/50"
                            : "border-white/10 bg-white/5 hover:border-yellow-1/50 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-xl">{color.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 统计数据 */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="text-center p-3 rounded-lg bg-white/5">
                    <div className="text-xl font-bold text-yellow-1">
                      {model.viewCount}
                    </div>
                    <div className="text-[10px] text-white/50">浏览</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/5">
                    <div className="text-xl font-bold text-yellow-1">
                      {model.likeCount}
                    </div>
                    <div className="text-[10px] text-white/50">点赞</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/5">
                    <div className="text-xl font-bold text-yellow-1">
                      {model.downloadCount}
                    </div>
                    <div className="text-[10px] text-white/50">下载</div>
                  </div>
                </div>

                {/* 技术信息 */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-white mb-3">
                    技术信息
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-white/60">格式</span>
                      <span className="px-2 py-0.5 rounded bg-yellow-1/10 text-yellow-1 font-medium text-[10px]">
                        {model.format}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-white/60">文件大小</span>
                      <span className="text-white font-medium">
                        {formatFileSize(model.fileSize)}
                      </span>
                    </div>
                    {model.faceCount && (
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-white/60">面数</span>
                        <span className="text-white font-medium">
                          {model.faceCount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {model.vertexCount && (
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-white/60">顶点数</span>
                        <span className="text-white font-medium">
                          {model.vertexCount.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 下载按钮 */}
                <button
                  type="button"
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-auto"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      下载中...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-5 w-5"
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
                      下载 3D 模型
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
