"use client";

import { useState, useEffect, useCallback } from "react";
import { IMAGE_GENERATION, VALIDATION_MESSAGES } from "@/lib/constants";
import type { GenerationStatus } from "@/types";

interface ImageGridProps {
  initialPrompt?: string;
  onGenerate3D?: (imageIndex: number, prompt: string) => void;
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
}: ImageGridProps) {
  const [inputText, setInputText] = useState(initialPrompt);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string>("");

  // 流式接收图片 - 生成一张显示一张
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

    // 初始化4个图片槽位
    const slots: ImageSlot[] = Array.from({ length: IMAGE_GENERATION.COUNT }, () => ({
      url: null,
      status: "pending" as ImageSlotStatus,
    }));
    setImageSlots(slots);

    try {
      // 使用 EventSource 接收流式数据
      const response = await fetch("/api/generate-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedText,
          count: IMAGE_GENERATION.COUNT,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "图片生成失败");
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);

              if (data.type === "image") {
                // 更新对应索引的图片槽位
                setImageSlots((prev) => {
                  const newSlots = [...prev];
                  newSlots[data.index] = {
                    url: data.url,
                    status: "completed",
                  };
                  return newSlots;
                });
              } else if (data.type === "done") {
                setStatus("completed");
              } else if (data.type === "error") {
                throw new Error(data.message);
              }
            } catch (parseError) {
              console.error("解析SSE数据失败:", parseError);
            }
          }
        }
      }
    } catch (err) {
      console.error("生成图片失败:", err);
      setError(err instanceof Error ? err.message : "图片生成失败,请重试");
      setStatus("failed");
    }
  }, [inputText]);

  // 如果有初始prompt,自动生成图片
  useEffect(() => {
    if (initialPrompt) {
      handleGenerate();
    }
  }, [initialPrompt]);

  const handleGenerate3D = () => {
    if (selectedImage === null) {
      setError(VALIDATION_MESSAGES.SELECT_IMAGE_REQUIRED);
      return;
    }
    setError("");
    onGenerate3D?.(selectedImage, inputText);
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
        <h2 className="mb-3 shrink-0 text-sm font-semibold text-white">生成结果</h2>

        {status === "idle" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-foreground-subtle">
            <p className="text-sm">等待生成图片...</p>
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
                      {slot.status === "pending" || slot.status === "loading" ? (
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
