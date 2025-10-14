"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GenerationStatus, TaskWithDetails } from "@/types";
import GenerationProgress from "./GenerationProgress";
import Model3DViewer, { type Model3DViewerRef } from "./Model3DViewer";

interface ModelPreviewProps {
  imageIndex: number | null;
  prompt: string;
  task?: TaskWithDetails | null;
  taskId?: string;
}

export default function ModelPreview({
  // imageIndex 和 prompt 暂未使用，但保留以供未来扩展
  task,
  taskId,
}: ModelPreviewProps) {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [showGrid, setShowGrid] = useState(false); // 控制是否显示网格
  const [isFullscreen, setIsFullscreen] = useState(false); // 控制全屏状态
  const model3DViewerRef = useRef<Model3DViewerRef>(null); // Model3DViewer 组件引用
  const previewContainerRef = useRef<HTMLDivElement>(null); // 3D预览容器引用

  // 重置相机视角
  const handleResetCamera = useCallback(() => {
    if (model3DViewerRef.current) {
      model3DViewerRef.current.resetCamera();
    }
  }, []);

  // 切换全屏
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

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // 当任务状态或模型数据改变时更新UI
  useEffect(() => {
    // 如果任务已完成模型生成
    if (task?.status === "MODEL_COMPLETED" && task.model) {
      setStatus("completed");
      setProgress(task.model.progress || 100);
      return;
    }

    // 如果正在生成模型（包括等待和生成中）
    if (
      (task?.status === "MODEL_PENDING" ||
        task?.status === "MODEL_GENERATING") &&
      task.model
    ) {
      setStatus("generating");
      setProgress(task.model.progress || 0);
      return;
    }

    // 如果任务失败
    if (task?.status === "FAILED") {
      setStatus("failed");
      return;
    }

    // 其他状态（等待选择图片）
    if (
      task?.status === "IMAGE_COMPLETED" ||
      task?.status === "IMAGE_PENDING" ||
      task?.status === "IMAGE_GENERATING"
    ) {
      setStatus("idle");
      setProgress(0);
    }
  }, [task?.status, task?.model?.progress, task?.model?.status, task?.model]);

  // 生成代理URL，用于绕过CORS限制
  const getProxiedModelUrl = (modelUrl: string | undefined | null): string => {
    if (!modelUrl) return "/demo.glb";

    // 如果是本地文件（以/开头），直接返回
    if (modelUrl.startsWith("/")) return modelUrl;

    // 如果是腾讯云COS URL，使用代理
    if (modelUrl.includes("tencentcos.cn")) {
      return `/api/proxy/model?url=${encodeURIComponent(modelUrl)}`;
    }

    // 其他URL直接返回（可能有CORS问题）
    return modelUrl;
  };

  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden">
      {/* 3D预览区域 */}
      <div
        ref={previewContainerRef}
        className="relative flex flex-1 flex-col items-center justify-center border-b border-white/10 overflow-hidden"
      >
        <h2 className="absolute left-5 top-5 text-base font-semibold text-white">
          3D 预览
        </h2>

        {/* 3D渲染区域 */}
        <div className="flex h-full w-full items-center justify-center">
          {status === "generating" ? (
            // 生成中:显示加载动画
            <div className="text-center">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-3 border-yellow-1/20 border-t-yellow-1 mx-auto" />
              <p className="text-sm font-medium text-foreground-muted">
                正在生成3D模型...
              </p>
              <p className="mt-2 text-[13px] font-semibold tabular-nums text-yellow-1">
                {Math.round(progress)}%
              </p>
            </div>
          ) : status === "completed" ? (
            // 完成:渲染 3D 模型（使用代理URL绕过CORS）
            <Model3DViewer
              ref={model3DViewerRef}
              modelUrl={getProxiedModelUrl(task?.model?.modelUrl)} // 使用代理URL，解决CORS问题
              showGrid={showGrid}
            />
          ) : status === "failed" ? (
            // 失败状态:显示错误信息
            <div className="text-center max-w-md px-6">
              <div className="mb-4 text-5xl">❌</div>
              <p className="text-sm font-medium text-white mb-2">
                3D模型生成失败
              </p>
              <p className="text-xs text-foreground-subtle mb-4">
                {task?.errorMessage || "生成过程中遇到错误，请重试"}
              </p>
            </div>
          ) : (
            // 空闲状态:显示占位符
            <div className="text-center">
              <div className="mb-4 text-5xl text-foreground-subtle">🎨</div>
              <p className="text-sm text-foreground-subtle">
                3D模型将在这里显示
              </p>
              <p className="mt-1 text-xs text-foreground-subtle">
                选择图片后开始生成
              </p>
            </div>
          )}
        </div>

        {/* 控制按钮 */}
        <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d0d0d] p-1.5">
          <button
            type="button"
            className="group relative flex h-9 w-9 items-center justify-center rounded-lg border-none bg-transparent text-foreground-subtle transition-all duration-200 hover:bg-white/10 hover:text-yellow-1 disabled:cursor-not-allowed disabled:opacity-40"
            title="显示网格"
            disabled={status !== "completed"}
            onClick={() => setShowGrid(!showGrid)}
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
            <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              显示网格
            </span>
          </button>
          <button
            type="button"
            className="group relative flex h-9 w-9 items-center justify-center rounded-lg border-none bg-transparent text-foreground-subtle transition-all duration-200 hover:bg-white/10 hover:text-yellow-1 disabled:cursor-not-allowed disabled:opacity-40"
            title="重置视角"
            disabled={status !== "completed"}
            onClick={handleResetCamera}
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
            <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              重置视角
            </span>
          </button>
          <button
            type="button"
            className="group relative flex h-9 w-9 items-center justify-center rounded-lg border-none bg-transparent text-foreground-subtle transition-all duration-200 hover:bg-white/10 hover:text-yellow-1 disabled:cursor-not-allowed disabled:opacity-40"
            title={isFullscreen ? "退出全屏" : "全屏预览"}
            disabled={status !== "completed"}
            onClick={handleToggleFullscreen}
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
            <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {isFullscreen ? "退出全屏" : "全屏预览"}
            </span>
          </button>
        </div>
      </div>

      {/* 生成进度和操作区域 */}
      <div className="shrink-0 p-5">
        {status === "generating" ? (
          <GenerationProgress progress={Math.round(progress)} />
        ) : status === "completed" ? (
          <>
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-white">
                模型信息
              </h3>
              <div className="space-y-1.5 text-xs text-white/60">
                <div className="flex justify-between">
                  <span>格式:</span>
                  <span className="text-white/90 font-medium">
                    {task?.model?.format || "GLB"}
                  </span>
                </div>
                {task?.model?.fileSize && (
                  <div className="flex justify-between">
                    <span>文件大小:</span>
                    <span className="text-white/90 font-medium">
                      {(task.model.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                )}
                {task?.model?.faceCount !== null &&
                  task?.model?.faceCount !== undefined && (
                    <div className="flex justify-between">
                      <span>面数:</span>
                      <span className="text-white/90 font-medium">
                        {task.model.faceCount.toLocaleString()}
                      </span>
                    </div>
                  )}
                {task?.model?.vertexCount !== null &&
                  task?.model?.vertexCount !== undefined && (
                    <div className="flex justify-between">
                      <span>顶点数:</span>
                      <span className="text-white/90 font-medium">
                        {task.model.vertexCount.toLocaleString()}
                      </span>
                    </div>
                  )}
                <div className="flex justify-between">
                  <span>质量:</span>
                  <span className="text-yellow-1 font-medium">
                    {task?.model?.quality || "高清"}
                  </span>
                </div>
              </div>
            </div>

            {/* 按钮组 - 并排显示，使用统一的按钮样式 */}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => {
                  if (task?.model?.modelUrl) {
                    window.open(task.model.modelUrl, "_blank");
                  }
                }}
                disabled={!task?.model?.modelUrl}
              >
                下载模型
              </button>
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => {
                  // TODO: 实现一键打印功能
                  alert("一键打印功能即将上线！");
                }}
              >
                一键打印
              </button>
            </div>
          </>
        ) : status === "failed" ? (
          <>
            <div className="mb-3">
              <h3 className="mb-1.5 text-sm font-semibold text-white">
                生成失败
              </h3>
              <div className="text-xs text-white/60 mb-3">
                {task?.errorMessage || "生成过程中遇到错误"}
              </div>
            </div>

            <button
              type="button"
              className="btn-primary w-full"
              onClick={async () => {
                if (!taskId) return;
                try {
                  // 调用重试API
                  const response = await fetch(`/api/tasks/${taskId}/retry`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "model" }),
                  });

                  const data = await response.json();
                  if (data.success) {
                    // 重试成功,刷新页面以获取最新任务状态
                    window.location.reload();
                  } else {
                    console.error("重试失败:", data.error);
                    alert(`重试失败: ${data.error?.message || "未知错误"}`);
                  }
                } catch (error) {
                  console.error("重试请求失败:", error);
                  alert("重试请求失败,请检查网络连接");
                }
              }}
            >
              重新生成3D模型
            </button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <h3 className="mb-1.5 text-sm font-semibold text-white">
                模型信息
              </h3>
              <div className="text-xs text-white/60">等待生成模型...</div>
            </div>

            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-lg bg-surface-3 py-2.5 text-sm font-medium text-foreground opacity-50"
            >
              下载模型
            </button>
          </>
        )}
      </div>
    </div>
  );
}
