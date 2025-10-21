"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GenerationStatus, TaskWithDetails } from "@/types";
import GenerationProgress from "./GenerationProgress";
import Model3DViewer, { type Model3DViewerRef } from "./Model3DViewer";
import { getProxiedModelUrl } from "@/lib/utils/proxy-url";
import Tooltip from "@/components/ui/Tooltip";
import Toast, { type ToastType } from "@/components/ui/Toast";

// 材质颜色选项
const MATERIAL_COLORS = [
  { name: "原始贴图", value: null, icon: "🎨" },
  { name: "白色", value: "#F5F5F5", icon: "⚪" },
  { name: "蓝色", value: "#2196F3", icon: "🔵" },
  { name: "绿色", value: "#4CAF50", icon: "🟢" },
] as const;

interface ModelPreviewProps {
  imageIndex: number | null;
  prompt: string;
  task?: TaskWithDetails | null;
  taskId?: string;
  onGenerate3D?: (imageIndex: number) => void; // 生成3D模型的回调
}

export default function ModelPreview({
  imageIndex,
  prompt,
  task,
  taskId,
  onGenerate3D,
}: ModelPreviewProps) {
  // 根据选中的图片索引，获取对应图片的模型
  // 策略：
  // 1. 如果有 imageIndex，查找该图片对应的模型（从 images[imageIndex].generatedModel）
  // 2. 如果没有 imageIndex，查找最新的模型
  const selectedModel =
    task?.images && imageIndex !== null && imageIndex !== undefined
      ? (() => {
          const selectedImage = task.images.find(
            (img) => img.index === imageIndex,
          );
          if (selectedImage && (selectedImage as any).generatedModel) {
            const model = (selectedImage as any).generatedModel;
            // 从 task.models 中找到完整的模型数据（包含 generationStatus 和 progress）
            const fullModel = task.models?.find((m) => m.id === model.id);
            return fullModel || model;
          }
          return undefined;
        })()
      : task?.models?.length
        ? (() => {
            const completedModels = task.models.filter(
              (m) => m.generationStatus === "COMPLETED",
            );
            if (completedModels.length > 0) {
              return completedModels.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )[0];
            }
            return task.models
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )[0];
          })()
        : undefined;

  // 为了向后兼容，保留 latestModel 别名
  const latestModel = selectedModel;

  // 调试日志：查看选择的模型
  console.log("=== ModelPreview latestModel 选择 ===", {
    taskId: task?.id,
    taskStatus: task?.status,
    allModelsCount: task?.models?.length,
    allModels: task?.models?.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      generationStatus: m.generationStatus,
      modelUrl: m.modelUrl,
      progress: m.progress,
    })),
    selectedLatestModel: latestModel
      ? {
          id: latestModel.id,
          createdAt: latestModel.createdAt,
          generationStatus: latestModel.generationStatus,
          modelUrl: latestModel.modelUrl,
          progress: latestModel.progress,
        }
      : null,
  });

  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [showGrid, setShowGrid] = useState(false); // 控制是否显示网格
  const [isFullscreen, setIsFullscreen] = useState(false); // 控制全屏状态
  const [currentMaterial, setCurrentMaterial] = useState<string | null>(null); // 当前材质颜色
  const [isPrinting, setIsPrinting] = useState(false); // 控制打印请求状态
  const [toast, setToast] = useState<{
    type: ToastType;
    message: string;
  } | null>(null); // Toast 提示状态
  const model3DViewerRef = useRef<Model3DViewerRef>(null); // Model3DViewer 组件引用
  const previewContainerRef = useRef<HTMLDivElement>(null); // 3D预览容器引用

  // 重置相机视角
  const handleResetCamera = useCallback(() => {
    if (model3DViewerRef.current) {
      model3DViewerRef.current.resetCamera();
    }
  }, []);

  // 切换材质颜色
  const handleMaterialChange = useCallback((color: string | null) => {
    if (model3DViewerRef.current) {
      model3DViewerRef.current.applyMaterial(color);
      setCurrentMaterial(color);
    }
  }, []);

  // 一键打印：提交打印任务到外部打印服务
  const handlePrint = useCallback(async () => {
    if (!taskId) {
      setToast({
        type: "error",
        message: "任务ID不存在，无法提交打印",
      });
      return;
    }

    setIsPrinting(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/print`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          type: "success",
          message: "打印任务已开始，正在处理中...",
        });
      } else {
        setToast({
          type: "error",
          message: `打印任务提交失败：${data.error?.message || "未知错误"}`,
        });
      }
    } catch (error) {
      console.error("提交打印任务失败:", error);
      setToast({
        type: "error",
        message: `提交打印任务失败：${error instanceof Error ? error.message : "网络错误"}`,
      });
    } finally {
      setIsPrinting(false);
    }
  }, [taskId]);

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
    // 优先根据当前选中图片的模型状态来决定UI
    // 如果有选中的模型（selectedModel），根据模型状态显示
    if (latestModel) {
      // 模型已完成且有 URL
      if (
        latestModel.generationStatus === "COMPLETED" &&
        latestModel.modelUrl
      ) {
        setStatus("completed");
        setProgress(100);
        console.log("✅ 模型已完成，显示3D预览");
        return;
      }

      // 模型生成中
      if (
        !latestModel.generationStatus ||
        latestModel.generationStatus === "PENDING" ||
        latestModel.generationStatus === "GENERATING"
      ) {
        setStatus("generating");
        setProgress(latestModel.progress || 0);
        console.log("⏳ 模型生成中，显示进度:", latestModel.progress);
        return;
      }

      // 模型失败
      if (latestModel.generationStatus === "FAILED" || latestModel.failedAt) {
        setStatus("failed");
        console.log("❌ 模型生成失败");
        return;
      }
    }

    // 如果没有选中的模型，根据任务状态决定
    // 模型生成中（即使 latestModel 还没创建，只要 task.status 是生成中）
    if (
      task?.status === "MODEL_PENDING" ||
      task?.status === "MODEL_GENERATING"
    ) {
      setStatus("generating");
      setProgress(0);
      console.log("⏳ 模型生成中（等待后端创建记录）");
      return;
    }

    // 图片生成中
    if (
      task?.status === "IMAGE_PENDING" ||
      task?.status === "IMAGE_GENERATING"
    ) {
      setStatus("idle");
      setProgress(0);
      console.log("⏳ 图片生成中，等待选择");
      return;
    }

    // 图片完成，等待选择（或当前图片没有模型）
    if (
      task?.status === "IMAGE_COMPLETED" ||
      (imageIndex !== null && !latestModel)
    ) {
      setStatus("idle");
      setProgress(0);
      console.log("📋 等待选择图片或当前图片无模型");
      return;
    }

    // 任务失败
    if (task?.status === "FAILED") {
      setStatus("failed");
      console.log("❌ 任务失败");
      return;
    }

    // 默认空闲状态
    setStatus("idle");
    setProgress(0);
  }, [
    task?.status,
    latestModel?.progress,
    latestModel?.generationStatus,
    latestModel?.modelUrl,
    latestModel?.failedAt,
    latestModel,
    imageIndex,
  ]);

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
              const originalUrl = latestModel?.modelUrl;
              const proxiedUrl = getProxiedModelUrl(originalUrl);
              console.log("=== ModelPreview 渲染 3D 模型 ===", {
                taskStatus: task?.status,
                latestModelGenerationStatus: latestModel?.generationStatus,
                originalUrl,
                proxiedUrl,
                latestModelFullData: latestModel,
                allModels: task?.models,
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
            // 空闲状态：根据条件优先级显示不同的引导内容
            <div className="text-center max-w-sm px-6">
              {(() => {
                // 优先级1：图片生成中 - 提前告知接下来要做什么
                if (
                  task?.status === "IMAGE_PENDING" ||
                  task?.status === "IMAGE_GENERATING"
                ) {
                  return (
                    <div className="flex flex-col items-center gap-4">
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
                              <p className="font-medium mb-0.5">
                                图片生成完成后
                              </p>
                              <p className="text-xs text-white/60">
                                点击任意图片立即生成 3D 模型
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg shrink-0">⏱️</span>
                            <p className="text-xs text-white/60">
                              预计 15-30 秒
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // 优先级2：已选中图片但该图片没有模型 - 引导用户生成模型
                if (
                  imageIndex !== null &&
                  imageIndex !== undefined &&
                  !latestModel
                ) {
                  return (
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative h-24 w-24">
                        <div className="absolute inset-0 animate-spin-slow">
                          <div className="h-full w-full rounded-2xl bg-gradient-to-br from-yellow-1/30 to-yellow-1/10 border-3 border-yellow-1/40 shadow-lg shadow-yellow-1/20" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center text-4xl">
                          🎯
                        </div>
                      </div>
                      <div className="space-y-3 text-center">
                        <h3 className="text-lg font-bold text-white">
                          该图片还没有 3D 模型
                        </h3>
                        <p className="text-sm text-white/70 max-w-xs">
                          点击下方按钮，为选中的图片生成 3D 模型
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onGenerate3D && imageIndex !== null) {
                            onGenerate3D(imageIndex);
                          }
                        }}
                        className="btn-primary flex items-center justify-center gap-2.5 px-8 py-3.5 text-base font-semibold shadow-lg shadow-yellow-1/25 hover:shadow-xl hover:shadow-yellow-1/30 transition-all duration-300"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                          />
                        </svg>
                        生成 3D 模型
                      </button>
                      <div className="glass-panel px-4 py-2.5 text-xs text-white/60 flex items-center gap-2">
                        <svg
                          className="h-4 w-4 text-yellow-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>生成过程约需 15-30 秒</span>
                      </div>
                    </div>
                  );
                }

                // 优先级3：图片已完成但没有选中任何图片 - 引导用户选择图片
                if (
                  task?.status === "IMAGE_COMPLETED" &&
                  (imageIndex === null || imageIndex === undefined)
                ) {
                  return (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative h-20 w-20">
                        <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce-slow">
                          👈
                        </div>
                        <div className="absolute inset-0 animate-ping-slow">
                          <div className="h-full w-full rounded-full bg-yellow-1/20" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold text-white">
                          选择左侧图片
                        </h3>
                        <p className="text-sm text-white/60">
                          点击任意图片查看或生成 3D 模型
                        </p>
                      </div>
                    </div>
                  );
                }

                // 默认：其他空闲状态
                return (
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-5xl text-foreground-subtle">🎨</div>
                    <p className="text-sm text-foreground-subtle">
                      3D模型将在这里显示
                    </p>
                    <p className="text-xs text-foreground-subtle">
                      选择图片后开始生成
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* 控制按钮 - 只在模型已完成时显示 */}
        {status === "completed" && (
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

            {/* 分隔线 */}
            <div className="h-6 w-px bg-white/10" />

            {/* 材质颜色切换 */}
            {MATERIAL_COLORS.map((color) => (
              <Tooltip
                key={color.name}
                content={color.name}
                disabled={status !== "completed"}
              >
                <button
                  type="button"
                  onClick={() => handleMaterialChange(color.value)}
                  disabled={status !== "completed"}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                    currentMaterial === color.value
                      ? "bg-yellow-1/20 ring-2 ring-yellow-1"
                      : "bg-transparent hover:bg-white/10"
                  }`}
                >
                  <span className="text-lg">{color.icon}</span>
                </button>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* 生成进度和操作区域 */}
      <div className="shrink-0 p-5">
        {status === "generating" ? (
          <GenerationProgress progress={Math.round(progress)} />
        ) : status === "completed" ? (
          <>
            {/* 左右分栏布局 */}
            <div className="flex items-center gap-4">
              {/* 左侧：模型信息 */}
              <div className="flex-1">
                <h3 className="mb-3 text-sm font-bold text-white">模型信息</h3>

                {/* 格式徽章 */}
                <div className="mb-3 flex gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-yellow-1/10 px-2.5 py-1 text-xs font-medium text-yellow-1 border border-yellow-1/20">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    {latestModel?.format || "OBJ"}
                  </span>
                </div>

                {/* 详细信息 - 只显示文件大小 */}
                {latestModel?.fileSize && (
                  <div className="space-y-2 text-xs text-white/70">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5">
                        <svg
                          className="h-3.5 w-3.5 text-white/50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                          />
                        </svg>
                        文件大小
                      </span>
                      <span className="text-white font-medium tabular-nums">
                        {(latestModel.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 右侧：按钮组 */}
              <div className="flex flex-row gap-3">
                <Tooltip
                  content={
                    !latestModel?.modelUrl ? "模型尚未生成" : "下载3D模型文件"
                  }
                >
                  <button
                    type="button"
                    className="btn-primary flex items-center justify-center gap-2 h-12 px-6"
                    onClick={() => {
                      if (latestModel?.modelUrl) {
                        window.open(latestModel.modelUrl, "_blank");
                      }
                    }}
                    disabled={!latestModel?.modelUrl}
                  >
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
                    下载模型
                  </button>
                </Tooltip>
                <Tooltip
                  content={
                    !latestModel?.modelUrl
                      ? "模型尚未生成"
                      : isPrinting
                        ? "正在提交打印任务..."
                        : "一键提交到3D打印服务"
                  }
                >
                  <button
                    type="button"
                    className="btn-secondary flex items-center justify-center gap-2 h-12 px-6"
                    onClick={handlePrint}
                    disabled={!latestModel?.modelUrl || isPrinting}
                  >
                    {isPrinting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        提交中...
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
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                          />
                        </svg>
                        一键打印
                      </>
                    )}
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
        ) : null}
      </div>

      {/* Toast 提示 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
