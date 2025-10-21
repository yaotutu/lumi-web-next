"use client";

import { useCallback, useEffect, useState } from "react";
import { IMAGE_GENERATION, VALIDATION_MESSAGES } from "@/lib/constants";
import type { GenerationStatus, TaskWithDetails } from "@/types";
import { getProxiedImageUrl } from "@/lib/utils/proxy-url";
import Tooltip from "@/components/ui/Tooltip";

interface ImageGridProps {
  initialPrompt?: string;
  onGenerate3D?: (imageIndex: number) => void;
  onImageSelect?: (imageIndex: number) => void; // 选择图片时的回调（不触发生成）
  task?: TaskWithDetails | null;
  taskId?: string;
}

// 每张图片的加载状态
type ImageSlotStatus = "pending" | "loading" | "completed" | "failed";

interface ImageSlot {
  url: string | null;
  status: ImageSlotStatus;
}

export default function ImageGrid({
  initialPrompt = "",
  onGenerate3D,
  onImageSelect,
  task,
  taskId,
}: ImageGridProps) {
  const [inputText, setInputText] = useState(initialPrompt);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string>("");

  // 判断是否在图片生成中（禁用输入框）
  const isImageGenerating =
    task?.status === "IMAGE_PENDING" || task?.status === "IMAGE_GENERATING";

  // 判断是否在模型生成中（禁止切换图片）
  const isModelGenerating =
    task?.status === "MODEL_PENDING" || task?.status === "MODEL_GENERATING";

  // 如果任务已有图片数据，初始化图片槽位
  useEffect(() => {
    if (task?.images && task.images.length > 0) {
      const slots: ImageSlot[] = Array.from(
        { length: IMAGE_GENERATION.COUNT },
        (_, index) => {
          const image = task.images.find((img) => img.index === index);
          if (!image) {
            return { url: null, status: "pending" };
          }

          // ✅ 根据 imageStatus 映射到组件状态
          let slotStatus: ImageSlotStatus = "pending";
          switch (image.imageStatus) {
            case "COMPLETED":
              slotStatus = "completed";
              break;
            case "GENERATING":
              slotStatus = "loading";
              break;
            case "FAILED":
              slotStatus = "failed";
              break;
            case "PENDING":
            default:
              slotStatus = "pending";
              break;
          }

          return {
            url: (image as any).url || image.imageUrl, // 兼容适配器的 url 字段
            status: slotStatus,
          };
        },
      );
      setImageSlots(slots);

      // 根据任务状态设置组件状态
      if (task.status === "IMAGE_COMPLETED") {
        setStatus("completed");
      } else if (task.status === "IMAGE_GENERATING") {
        setStatus("generating");
      }

      // 如果任务已有选中的图片，设置选中状态
      if (task.selectedImageIndex !== null && task.selectedImageIndex !== undefined) {
        setSelectedImage(task.selectedImageIndex);
      }
    } else if (task?.status === "IMAGE_PENDING") {
      // 如果任务在队列中，设置状态为生成中
      setStatus("generating");
    }
  }, [task]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc 清空错误
      if (e.key === "Escape" && error) {
        setError("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [error]);

  // 重新生成图片 - 创建新任务
  const handleGenerate = useCallback(async () => {
    // 验证输入
    const trimmedText = inputText.trim();
    if (!trimmedText) {
      setError(VALIDATION_MESSAGES.PROMPT_REQUIRED);
      return;
    }
    if (trimmedText.length < IMAGE_GENERATION.MIN_PROMPT_LENGTH) {
      setError(VALIDATION_MESSAGES.PROMPT_TOO_SHORT);
      return;
    }
    if (trimmedText.length > IMAGE_GENERATION.MAX_PROMPT_LENGTH) {
      setError(VALIDATION_MESSAGES.PROMPT_TOO_LONG);
      return;
    }

    setError("");
    setStatus("generating");
    setSelectedImage(null);

    // 初始化4个图片槽位为加载状态
    const slots: ImageSlot[] = Array.from(
      { length: IMAGE_GENERATION.COUNT },
      () => ({
        url: null,
        status: "pending" as ImageSlotStatus,
      }),
    );
    setImageSlots(slots);

    try {
      // 创建新任务，后端会自动触发图片生成
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "创建任务失败");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "创建任务失败");
      }

      // 任务创建成功，导航到新任务页面(轮询逻辑会自动更新任务状态)
      window.location.href = `/workspace?taskId=${data.data.id}`;
    } catch (err) {
      console.error("创建任务失败:", err);
      setError(err instanceof Error ? err.message : "创建任务失败,请重试");
      setStatus("failed");
    }
  }, [inputText]);

  // 处理图片选择
  const handleImageSelect = useCallback(
    (idx: number) => {
      // 如果模型正在生成，禁止切换
      if (isModelGenerating) {
        return;
      }

      setSelectedImage(idx);
      if (error) setError("");

      // 通知父组件选中的图片变化（用于右侧预览区显示对应的模型）
      // 注意：这里只是更新索引，不触发实际的模型生成
      if (onImageSelect) {
        onImageSelect(idx);
      }
    },
    [isModelGenerating, error, onImageSelect],
  );

  // 生成3D模型
  const handleGenerate3D = () => {
    if (selectedImage === null) {
      setError(VALIDATION_MESSAGES.SELECT_IMAGE_REQUIRED);
      return;
    }
    setError("");
    onGenerate3D?.(selectedImage);
  };

  // Enter 键触发生成
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isImageGenerating) {
        handleGenerate();
      }
    }
  };

  // 计算"生成3D模型"按钮的 tooltip 内容
  const getGenerate3DTooltip = () => {
    if (isImageGenerating) {
      return "图片生成中，请稍候...";
    }
    if (selectedImage === null) {
      return "请先选择一张图片";
    }
    if (isModelGenerating) {
      return "3D模型生成中...";
    }
    return "";
  };

  // 计算"生成3D模型"按钮的文案
  const getGenerate3DButtonText = () => {
    if (isModelGenerating) {
      return "生成中...";
    }
    if (task?.status === "MODEL_COMPLETED" && selectedImage !== null) {
      return "重新生成3D模型";
    }
    return "生成 3D 模型";
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden lg:w-[600px]">
      {/* 输入与生成区域 */}
      <div className="glass-panel flex shrink-0 flex-col gap-2.5 p-4">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={handleKeyPress}
            placeholder="描述你想要的物体..."
            maxLength={IMAGE_GENERATION.MAX_PROMPT_LENGTH}
            readOnly={isImageGenerating}
            className={`h-20 w-full resize-none rounded-lg border bg-[#242424] p-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none transition-opacity ${
              error
                ? "border-red-1 focus:border-red-1"
                : "border-white/10 focus:border-yellow-1 focus:ring-1 focus:ring-yellow-1/20"
            } ${isImageGenerating ? "opacity-60 cursor-not-allowed" : ""}`}
            aria-label="描述你想要的物体"
            aria-invalid={!!error}
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className={error ? "text-red-1" : "text-transparent"}>
              {error || "placeholder"}
            </span>
            <span className="text-white/50">
              {inputText.length}/{IMAGE_GENERATION.MAX_PROMPT_LENGTH}
            </span>
          </div>
        </div>

        <Tooltip content="图片生成中，请稍候..." disabled={!isImageGenerating}>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isImageGenerating}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm font-semibold"
          >
            {isImageGenerating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                生成中...
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                重新生成
              </>
            )}
          </button>
        </Tooltip>
      </div>

      {/* 生成结果区域 - flex布局容器 */}
      <div className="glass-panel flex flex-1 flex-col overflow-hidden p-4">
        {/* 标题 */}
        <h2 className="mb-3 shrink-0 text-sm font-bold text-white">生成结果</h2>

        {status === "idle" && !task ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="mb-2 text-4xl opacity-60">🎨</div>
            <p className="text-sm font-medium text-white/90">准备开始创作</p>
            <p className="text-xs text-white/50">
              输入描述后点击"重新生成"或按 Enter 键开始生成图片
            </p>
          </div>
        ) : task?.status === "IMAGE_PENDING" ||
          (task?.status === "IMAGE_GENERATING" && imageSlots.length === 0) ? (
          <>
            {/* 显示骨架屏网格 + 加载提示 */}
            <div className="relative grid flex-1 min-h-0 grid-cols-2 grid-rows-2 gap-2.5">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="relative h-full w-full overflow-hidden rounded-xl border-2 border-white/10 bg-gradient-to-br from-white/5 to-[#242424]"
                  style={{
                    animation: `pulse 1.5s ease-in-out ${idx * 0.15}s infinite`,
                  }}
                >
                  {/* 波浪式加载动画 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-1/20 border-t-yellow-1"
                        style={{
                          animationDelay: `${idx * 0.2}s`,
                        }}
                      />
                      <span className="text-xs text-white/40">{idx + 1}/4</span>
                    </div>
                  </div>

                  {/* 渐变闪烁效果 */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-1/5 to-transparent"
                    style={{
                      animation: `shimmer 2s ease-in-out ${idx * 0.3}s infinite`,
                    }}
                  />
                </div>
              ))}

              {/* 中央状态提示 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="glass-panel px-6 py-4 text-center backdrop-blur-xl">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-1" />
                    <p className="text-sm font-medium text-white">
                      {task?.status === "IMAGE_PENDING"
                        ? "任务队列中"
                        : "AI 正在创作"}
                    </p>
                  </div>
                  <p className="text-xs text-white/60">
                    {task?.status === "IMAGE_PENDING"
                      ? "等待处理,预计需要 10-30 秒"
                      : `正在生成 ${imageSlots.filter((s) => s.status === "completed").length}/4 张图片`}
                  </p>
                </div>
              </div>
            </div>

            {/* 底部按钮区域 - 禁用状态 */}
            <div className="mt-3 shrink-0 hidden">
              <Tooltip content="图片生成中，请稍候...">
                <button
                  type="button"
                  disabled
                  className="btn-primary w-full opacity-50 cursor-not-allowed flex items-center justify-center gap-2 text-sm font-semibold"
                >
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
                      d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                    />
                  </svg>
                  生成 3D 模型
                </button>
              </Tooltip>
            </div>
          </>
        ) : (
          <>
            {/* 图片网格区域 - 使用grid-rows-2确保4张图片都在视口内 */}
            <div className="relative grid flex-1 min-h-0 grid-cols-2 grid-rows-2 gap-2.5">
              {imageSlots.map((slot, idx) => (
                <div key={idx} className="relative w-full h-full">
                  {/* 图片容器 - h-full让图片填充网格单元格 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (slot.status === "completed") {
                        handleImageSelect(idx);
                      }
                    }}
                    disabled={slot.status !== "completed" || isModelGenerating}
                    className={`group relative h-full w-full overflow-hidden rounded-xl transition-all duration-300 ${
                      selectedImage === idx && slot.status === "completed"
                        ? "border-[3px] border-yellow-1 shadow-[0_8px_24px_rgba(249,207,0,0.4)] -translate-y-1 scale-[1.02]"
                        : "border-2 border-white/10 hover:border-white/20 hover:scale-[1.02]"
                    } ${slot.status !== "completed" || isModelGenerating ? "cursor-not-allowed" : ""} ${selectedImage !== null && selectedImage !== idx && slot.status === "completed" ? "opacity-60" : "opacity-100"}`}
                  >
                    {/* 加载中状态 */}
                    {slot.status === "pending" || slot.status === "loading" ? (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/5 to-[#242424]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-1/30 border-t-yellow-1" />
                          <span className="text-xs text-foreground-subtle">
                            生成中...
                          </span>
                        </div>
                      </div>
                    ) : slot.status === "completed" && slot.url ? (
                      <>
                        {/* 图片 - 使用object-cover等比拉伸填充正方形，通过代理加载解决CORS问题 */}
                        <img
                          src={getProxiedImageUrl(slot.url)}
                          alt={`生成的图片 ${idx + 1}`}
                          className="h-full w-full object-cover animate-[fade-in-up_0.4s_ease-out]"
                        />

                        {/* Hover 提示遮罩 - 仅在未选中且未在模型生成中时显示 */}
                        {selectedImage !== idx && !isModelGenerating && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-2">
                              <div className="text-3xl">🎯</div>
                              <p className="text-xs font-medium text-white">
                                选择此图片
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 选中标记 */}
                        {selectedImage === idx && (
                          <>
                            <div className="absolute right-2 top-2 z-10 flex h-6 w-6 animate-[scale-in_0.2s_cubic-bezier(0.4,0,0.2,1)] items-center justify-center rounded-full bg-gradient-to-br from-yellow-1 to-accent-yellow-dim shadow-lg">
                              <svg
                                className="h-3.5 w-3.5 text-black"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>

                            {/* "使用中"徽章 - 仅在模型生成中显示 */}
                            {isModelGenerating && (
                              <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-1 to-accent-yellow-dim px-2.5 py-1 shadow-lg animate-[scale-in_0.2s_cubic-bezier(0.4,0,0.2,1)]">
                                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
                                <span className="text-[10px] font-semibold text-black">
                                  使用中
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      // 失败状态
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-500/10 to-[#242424]">
                        <span className="text-xs text-red-500">生成失败</span>
                      </div>
                    )}
                  </button>
                </div>
              ))}

              {/* 中央状态提示 - 只在生成中显示 */}
              {task?.status === "IMAGE_GENERATING" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="glass-panel px-6 py-4 text-center backdrop-blur-xl">
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-1" />
                      <p className="text-sm font-medium text-white">
                        AI 正在创作
                      </p>
                    </div>
                    <p className="text-xs text-white/60">
                      正在生成{" "}
                      {
                        imageSlots.filter((s) => s.status === "completed")
                          .length
                      }
                      /4 张图片
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 底部按钮 - 固定高度,不参与flex */}
            <div className="mt-3 shrink-0 hidden">
              <Tooltip content={getGenerate3DTooltip()}>
                <button
                  type="button"
                  onClick={handleGenerate3D}
                  disabled={
                    selectedImage === null ||
                    isImageGenerating ||
                    isModelGenerating
                  }
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  {isModelGenerating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                      {getGenerate3DButtonText()}
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
                          d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                        />
                      </svg>
                      {getGenerate3DButtonText()}
                    </>
                  )}
                </button>
              </Tooltip>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
