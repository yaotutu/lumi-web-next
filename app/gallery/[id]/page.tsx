"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import Model3DViewer, {
  type Model3DViewerRef,
} from "@/app/workspace/components/Model3DViewer";
import { getProxiedModelUrl } from "@/lib/utils/proxy-url";

// 材质颜色选项（从 ModelPreview 复制）
const MATERIAL_COLORS = [
  { name: "原始贴图", value: null, icon: "🎨" },
  { name: "白色", value: "#F5F5F5", icon: "⚪" },
  { name: "蓝色", value: "#2196F3", icon: "🔵" },
  { name: "绿色", value: "#4CAF50", icon: "🟢" },
] as const;

// UserAsset 类型（从 API 返回）
type UserAsset = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  modelUrl: string;
  previewImageUrl: string | null;
  format: string;
  fileSize: number | null;
  faceCount: number | null;
  vertexCount: number | null;
  quality: string | null;
  viewCount: number;
  likeCount: number;
  downloadCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GalleryDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  // 状态管理
  const [model, setModel] = useState<UserAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // 引用
  const model3DViewerRef = useRef<Model3DViewerRef>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 加载模型详情
   */
  useEffect(() => {
    const loadModel = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/gallery/models/${id}`);

        if (!response.ok) {
          throw new Error(`加载失败: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setModel(data.data);
        } else {
          throw new Error(data.error?.message || "加载失败");
        }
      } catch (err) {
        console.error("加载模型详情失败:", err);
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };

    loadModel();
  }, [id]);

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
      if (e.key === "f" || e.key === "F") {
        if (model) {
          e.preventDefault();
          handleToggleFullscreen();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [model, handleToggleFullscreen]);

  /**
   * 下载模型（增加下载计数）
   */
  const handleDownload = useCallback(async () => {
    if (!model) return;

    setDownloading(true);

    try {
      // 调用下载计数 API
      await fetch(`/api/gallery/models/${id}/download`, {
        method: "POST",
      });

      // 打开下载链接
      window.open(model.modelUrl, "_blank");
    } catch (error) {
      console.error("下载失败:", error);
    } finally {
      setDownloading(false);
    }
  }, [model, id]);

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "未知";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  /**
   * 格式化日期
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 加载中状态
  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] text-white">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-3 border-yellow-1/20 border-t-yellow-1 mx-auto mb-4" />
            <p className="text-sm text-white/60">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !model) {
    return (
      <div className="min-h-screen bg-[#000000] text-white">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-lg text-white/80 mb-2">加载失败</p>
            <p className="text-sm text-white/50 mb-6">
              {error || "模型不存在"}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => router.push("/")}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 获取代理后的模型 URL
  const proxiedModelUrl = getProxiedModelUrl(model.modelUrl);

  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 3D 预览区域 */}
        <div
          ref={previewContainerRef}
          className="glass-panel relative overflow-hidden mb-8"
          style={{ height: "70vh" }}
        >
          {/* 3D 渲染区域 */}
          <div className="h-full w-full bg-[radial-gradient(circle_at_50%_50%,#424242_0%,#2d2d2d_100%)]">
            <Model3DViewer
              ref={model3DViewerRef}
              modelUrl={proxiedModelUrl}
              showGrid={showGrid}
            />
          </div>

          {/* 控制按钮（右下角） */}
          <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-xl border border-white/10 bg-[#242424] p-1.5">
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
            <div className="h-6 w-px bg-white/10" />

            {/* 材质颜色切换 */}
            {MATERIAL_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => handleMaterialChange(color.value)}
                title={color.name}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border-none transition-all duration-200 ${
                  currentMaterial === color.value
                    ? "bg-yellow-1/20 ring-2 ring-yellow-1"
                    : "bg-transparent hover:bg-white/10"
                }`}
              >
                <span className="text-lg">{color.icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 模型信息区域 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 左侧：基本信息 */}
          <div className="md:col-span-2 glass-panel p-6">
            <h1 className="text-2xl font-bold text-white mb-2">{model.name}</h1>
            <div className="flex items-center gap-4 text-sm text-white/60 mb-6">
              <span>作者: {model.user.name || "匿名用户"}</span>
              <span>•</span>
              <span>{formatDate(model.createdAt)}</span>
            </div>

            {model.description && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white mb-2">描述</h3>
                <p className="text-sm text-white/70">{model.description}</p>
              </div>
            )}

            {/* 统计数据 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-yellow-1">
                  {model.viewCount}
                </div>
                <div className="text-xs text-white/50">浏览</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-yellow-1">
                  {model.likeCount}
                </div>
                <div className="text-xs text-white/50">点赞</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-yellow-1">
                  {model.downloadCount}
                </div>
                <div className="text-xs text-white/50">下载</div>
              </div>
            </div>

            {/* 下载按钮 */}
            <button
              type="button"
              className="btn-primary w-full flex items-center justify-center gap-2"
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

          {/* 右侧：技术信息 */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold text-white mb-4">技术信息</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-white/60">格式</span>
                <span className="px-2 py-1 rounded bg-yellow-1/10 text-yellow-1 font-medium">
                  {model.format}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">文件大小</span>
                <span className="text-white font-medium">
                  {formatFileSize(model.fileSize)}
                </span>
              </div>
              {model.faceCount && (
                <div className="flex justify-between items-center">
                  <span className="text-white/60">面数</span>
                  <span className="text-white font-medium">
                    {model.faceCount.toLocaleString()}
                  </span>
                </div>
              )}
              {model.vertexCount && (
                <div className="flex justify-between items-center">
                  <span className="text-white/60">顶点数</span>
                  <span className="text-white font-medium">
                    {model.vertexCount.toLocaleString()}
                  </span>
                </div>
              )}
              {model.quality && (
                <div className="flex justify-between items-center">
                  <span className="text-white/60">质量</span>
                  <span className="text-white font-medium">
                    {model.quality}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
