"use client";

import { useState, useEffect, useCallback } from "react";
import { IMAGE_GENERATION, VALIDATION_MESSAGES } from "@/lib/constants";
import type { GenerationStatus, TaskWithDetails } from "@/types";

interface ImageGridProps {
  initialPrompt?: string;
  onGenerate3D?: (imageIndex: number) => void;
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
  task,
  taskId,
}: ImageGridProps) {
  const [inputText, setInputText] = useState(initialPrompt);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string>("");

  // 如果任务已有图片数据，初始化图片槽位
  useEffect(() => {
    if (task?.images && task.images.length > 0) {
      const slots: ImageSlot[] = Array.from(
        { length: IMAGE_GENERATION.COUNT },
        (_, index) => {
          const image = task.images.find((img) => img.index === index);
          return {
            url: image ? image.url : null,
            status: image ? "completed" : "pending",
          };
        },
      );
      setImageSlots(slots);

      // 根据任务状态设置组件状态
      if (task.status === "IMAGES_READY") {
        setStatus("completed");
      } else if (task.status === "GENERATING_IMAGES") {
        setStatus("generating");
      }

      // 如果任务已有选中的图片，设置选中状态
      if (task.selectedImageIndex !== null) {
        setSelectedImage(task.selectedImageIndex);
      }
    } else if (task?.status === "PENDING") {
      // 如果任务在队列中，设置状态为生成中
      setStatus("generating");
    }
  }, [task]);

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

  const handleGenerate3D = () => {
    if (selectedImage === null) {
      setError(VALIDATION_MESSAGES.SELECT_IMAGE_REQUIRED);
      return;
    }
    setError("");
    onGenerate3D?.(selectedImage);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* 输入与生成区域 */}
      <div className="glass-panel flex shrink-0 flex-col gap-2.5 p-4">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (error) setError("");
            }}
            placeholder="描述你想要的物体..."
            maxLength={IMAGE_GENERATION.MAX_PROMPT_LENGTH}
            className={`h-20 w-full resize-none rounded-lg border bg-[#0d0d0d] p-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none ${
              error
                ? "border-red-1 focus:border-red-1"
                : "border-white/10 focus:border-yellow-1 focus:ring-1 focus:ring-yellow-1/20"
            }`}
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

        <button
          type="button"
          onClick={handleGenerate}
          disabled={status === "generating"}
          className="btn-primary w-full"
        >
          {status === "generating" ? "生成中..." : "重新再生"}
        </button>
      </div>

      {/* 生成结果区域 */}
      <div className="glass-panel flex flex-1 flex-col overflow-hidden p-4">
        <h2 className="mb-3 shrink-0 text-sm font-semibold text-white">
          生成结果
        </h2>

        {status === "idle" && !task ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-foreground-subtle">
            <p className="text-sm">等待生成图片...</p>
          </div>
        ) : task?.status === "PENDING" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="h-12 w-12 animate-pulse rounded-full border-3 border-yellow-1/30 border-t-yellow-1 animate-spin" />
            <div>
              <p className="text-sm font-medium text-white">任务在队列中</p>
              <p className="mt-1 text-xs text-white/60">
                正在等待处理,请稍候...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {/* 图片容器 - 修复尺寸问题 */}
            <div className="flex-1 overflow-hidden">
              <div className="grid h-full w-full grid-cols-2 gap-2.5">
                {imageSlots.map((slot, idx) => (
                  <div key={idx} className="relative h-full w-full">
                    <button
                      type="button"
                      onClick={() => {
                        if (slot.status === "completed") {
                          setSelectedImage(idx);
                          if (error) setError("");
                        }
                      }}
                      disabled={slot.status !== "completed"}
                      className={`group absolute inset-0 overflow-hidden rounded-xl border-2 transition-all duration-250 ${
                        selectedImage === idx && slot.status === "completed"
                          ? "border-yellow-1 p-0 shadow-[0_4px_16px_rgba(249,207,0,0.3)]"
                          : "border-white/10 p-px hover:border-white/20"
                      } ${slot.status !== "completed" ? "cursor-not-allowed" : ""}`}
                      aria-label={`图片 ${idx + 1}`}
                    >
                      {slot.status === "pending" ||
                      slot.status === "loading" ? (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/5 to-[#0d0d0d]">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-1/30 border-t-yellow-1" />
                            <span className="text-xs text-foreground-subtle">
                              生成中...
                            </span>
                          </div>
                        </div>
                      ) : slot.status === "completed" && slot.url ? (
                        <div className="relative h-full w-full">
                          <img
                            src={slot.url}
                            alt={`生成的图片 ${idx + 1}`}
                            className="absolute inset-0 h-full w-full object-cover animate-[fade-in-up_0.4s_ease-out]"
                          />
                          {selectedImage === idx && (
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
                          )}
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-500/10 to-[#0d0d0d]">
                          <span className="text-xs text-red-500">生成失败</span>
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={handleGenerate3D}
                disabled={selectedImage === null}
                className="btn-secondary w-full"
              >
                生成 3D 模型
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
