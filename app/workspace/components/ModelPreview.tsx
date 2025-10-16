"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GenerationStatus, TaskWithDetails } from "@/types";
import GenerationProgress from "./GenerationProgress";
import Model3DViewer, { type Model3DViewerRef } from "./Model3DViewer";
import { getProxiedModelUrl } from "@/lib/utils/proxy-url";
import Tooltip from "@/components/ui/Tooltip";

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

  // 快捷键支持（F键切换全屏）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F 键切换全屏（仅在模型完成时）
      if (e.key === "f" || e.key === "F") {
        if (status === "completed") {
          e.preventDefault();
          handleToggleFullscreen();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [status, handleToggleFullscreen]);

  // 计算动态标题
  const getTitle = () => {
    // 图片生成中
    if (
      task?.status === "IMAGE_PENDING" ||
      task?.status === "IMAGE_GENERATING"
    ) {
      return "准备中";
    }
    // 图片完成，等待选择
    if (
      task?.status === "IMAGE_COMPLETED" &&
      task.selectedImageIndex === null
    ) {
      return "3D 生成";
    }
    // 模型生成中
    if (
      task?.status === "MODEL_PENDING" ||
      task?.status === "MODEL_GENERATING"
    ) {
      return "生成中";
    }
    // 模型完成
    if (task?.status === "MODEL_COMPLETED") {
      return "3D 预览";
    }
    // 失败
    if (task?.status === "FAILED") {
      return "生成失败";
    }
    // 默认
    return "3D 预览";
  };

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

  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden">
      {/* 3D预览区域 */}
      <div
        ref={previewContainerRef}
        className="relative flex flex-1 flex-col items-center justify-center border-b border-white/10 overflow-hidden"
      >
        <h2 className="absolute left-5 top-5 text-base font-bold text-white">
          {getTitle()}
        </h2>

        {/* 3D渲染区域 */}
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_50%,#424242_0%,#2d2d2d_100%)]">
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
            (() => {
              const originalUrl = task?.model?.modelUrl;
              const proxiedUrl = getProxiedModelUrl(originalUrl);
              console.log("ModelPreview 模型 URL:", {
                originalUrl,
                proxiedUrl,
                taskModel: task?.model,
              });
              return (
                <Model3DViewer
                  ref={model3DViewerRef}
                  modelUrl={proxiedUrl}
                  showGrid={showGrid}
                />
              );
            })()
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
            // 空闲状态:根据任务状态显示不同的引导内容
            <div className="text-center max-w-sm px-6">
              {/* 图片生成中 - 提前告知接下来要做什么 */}
              {(task?.status === "IMAGE_PENDING" ||
                task?.status === "IMAGE_GENERATING") && (
                <div className="flex flex-col items-center gap-4">
                  {/* 3D旋转动画图标 */}
                  <div className="relative h-20 w-20">
                    <div className="absolute inset-0 animate-spin-slow">
                      <div className="h-full w-full rounded-xl bg-gradient-to-br from-yellow-1/20 to-yellow-1/5 border-2 border-yellow-1/30" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">
                      🎨
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-white">
                      接下来要做什么？
                    </h3>
                    <div className="glass-panel px-4 py-3 text-left space-y-2">
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg shrink-0">💡</span>
                        <div className="text-sm text-white/80">
                          <p className="font-medium mb-0.5">图片生成完成后</p>
                          <p className="text-xs text-white/60">
                            点击任意图片立即生成 3D 模型
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg shrink-0">⏱️</span>
                        <p className="text-xs text-white/60">预计 15-30 秒</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 等待选择图片 - 引导用户点击左侧图片 */}
              {task?.status === "IMAGE_COMPLETED" &&
                task.selectedImageIndex === null && (
                  <div className="flex flex-col items-center gap-4">
                    {/* 手指点击动画 */}
                    <div className="relative h-20 w-20">
                      <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce-slow">
                        👈
                      </div>
                      {/* 光圈动画 */}
                      <div className="absolute inset-0 animate-ping-slow">
                        <div className="h-full w-full rounded-full bg-yellow-1/20" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-white">
                        选择左侧图片
                      </h3>
                      <p className="text-sm text-white/60">
                        点击任意图片开始生成 3D 模型
                      </p>
                    </div>

                    {/* 可选：箭头指示动画 */}
                    <div className="flex items-center gap-2 text-yellow-1/60 animate-pulse">
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
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      <span className="text-xs">查看左侧图片</span>
                    </div>
                  </div>
                )}

              {/* 其他空闲状态（兜底） */}
              {task?.status !== "IMAGE_PENDING" &&
                task?.status !== "IMAGE_GENERATING" &&
                task?.status !== "IMAGE_COMPLETED" && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-5xl text-foreground-subtle">🎨</div>
                    <p className="text-sm text-foreground-subtle">
                      3D模型将在这里显示
                    </p>
                    <p className="text-xs text-foreground-subtle">
                      选择图片后开始生成
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* 控制按钮 */}
        <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-xl border border-white/10 bg-[#242424] p-1.5">
          <Tooltip
            content={showGrid ? "隐藏网格" : "显示网格"}
            disabled={status !== "completed"}
          >
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border-none bg-transparent text-foreground-subtle transition-all duration-200 hover:bg-white/10 hover:text-yellow-1 disabled:cursor-not-allowed disabled:opacity-40"
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
            </button>
          </Tooltip>
          <Tooltip content="重置视角" disabled={status !== "completed"}>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border-none bg-transparent text-foreground-subtle transition-all duration-200 hover:bg-white/10 hover:text-yellow-1 disabled:cursor-not-allowed disabled:opacity-40"
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
            </button>
          </Tooltip>
          <Tooltip
            content={isFullscreen ? "退出全屏 (F)" : "全屏预览 (F)"}
            disabled={status !== "completed"}
          >
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border-none bg-transparent text-foreground-subtle transition-all duration-200 hover:bg-white/10 hover:text-yellow-1 disabled:cursor-not-allowed disabled:opacity-40"
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
            </button>
          </Tooltip>
        </div>
      </div>

      {/* 生成进度和操作区域 */}
      <div className="shrink-0 p-5">
        {status === "generating" ? (
          <GenerationProgress progress={Math.round(progress)} />
        ) : status === "completed" ? (
          <>
            {/* 左右分栏布局 */}
            <div className="flex items-stretch gap-4">
              {/* 左侧：模型信息 */}
              <div className="flex-1">
                <h3 className="mb-3 text-sm font-bold text-white">
                  模型信息
                </h3>

                {/* 格式和质量徽章 */}
                <div className="mb-3 flex gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-yellow-1/10 px-2.5 py-1 text-xs font-medium text-yellow-1 border border-yellow-1/20">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {task?.model?.format || "OBJ"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-yellow-1/10 to-yellow-1/5 px-2.5 py-1 text-xs font-medium text-yellow-1 border border-yellow-1/20">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    {task?.model?.quality || "高清"}
                  </span>
                </div>

                {/* 详细信息 - 只显示有数据的字段 */}
                {(task?.model?.fileSize ||
                  (task?.model?.faceCount !== null && task?.model?.faceCount !== undefined) ||
                  (task?.model?.vertexCount !== null && task?.model?.vertexCount !== undefined)) && (
                  <div className="space-y-2 text-xs text-white/70">
                    {task?.model?.fileSize && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                          文件大小
                        </span>
                        <span className="text-white font-medium tabular-nums">
                          {(task.model.fileSize / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    )}
                    {task?.model?.faceCount !== null &&
                      task?.model?.faceCount !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <svg className="h-3.5 w-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                            </svg>
                            面数
                          </span>
                          <span className="text-white font-medium tabular-nums">
                            {task.model.faceCount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    {task?.model?.vertexCount !== null &&
                      task?.model?.vertexCount !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <svg className="h-3.5 w-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                            顶点数
                          </span>
                          <span className="text-white font-medium tabular-nums">
                            {task.model.vertexCount.toLocaleString()}
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* 右侧：按钮组 */}
              <div className="flex flex-col gap-2 w-64">
                <Tooltip
                  content={
                    !task?.model?.modelUrl ? "模型尚未生成" : "下载3D模型文件"
                  }
                >
                  <button
                    type="button"
                    className="btn-primary w-full flex items-center justify-center gap-2 h-12"
                    onClick={() => {
                      if (task?.model?.modelUrl) {
                        window.open(task.model.modelUrl, "_blank");
                      }
                    }}
                    disabled={!task?.model?.modelUrl}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    下载模型
                  </button>
                </Tooltip>
                <Tooltip content="一键连接3D打印机打印（即将上线）">
                  <button
                    type="button"
                    className="btn-secondary w-full flex items-center justify-center gap-2 h-12"
                    onClick={() => {
                      // TODO: 实现一键打印功能
                      alert("一键打印功能即将上线！");
                    }}
                    disabled={!task?.model?.modelUrl}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    一键打印
                  </button>
                </Tooltip>
              </div>
            </div>
          </>
        ) : status === "failed" ? (
          <>
            <div className="mb-3 w-full max-w-md">
              <h3 className="mb-1.5 text-sm font-semibold text-white">
                生成失败
              </h3>
              <div className="text-xs text-white/60 mb-3">
                {task?.errorMessage || "生成过程中遇到错误"}
              </div>
            </div>

            <div className="w-full max-w-md">
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
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 w-full max-w-md">
              <h3 className="mb-1.5 text-sm font-semibold text-white">
                模型信息
              </h3>
              <div className="text-xs text-white/60">等待生成模型...</div>
            </div>

            <div className="w-full max-w-md">
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-lg bg-surface-3 py-2.5 text-sm font-medium text-foreground opacity-50"
              >
                下载模型
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
