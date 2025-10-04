"use client";

import { useState, useEffect, useCallback } from "react";
import { IMAGE_GENERATION, VALIDATION_MESSAGES } from "@/lib/constants";
import type { GenerationStatus } from "@/types";

interface ImageGridProps {
  initialPrompt?: string;
  onGenerate3D?: (imageIndex: number, prompt: string) => void;
}

export default function ImageGrid({
  initialPrompt = "",
  onGenerate3D,
}: ImageGridProps) {
  const [inputText, setInputText] = useState(initialPrompt);
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string>("");

  // 模拟图片生成
  const handleGenerate = useCallback(() => {
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
    setImages([]);
    setSelectedImage(null);

    // 模拟生成图片
    setTimeout(() => {
      const generatedImages = Array.from(
        { length: IMAGE_GENERATION.COUNT },
        (_, i) => `/placeholder-${i + 1}.jpg`
      );
      setImages(generatedImages);
      setStatus("completed");
    }, IMAGE_GENERATION.DELAY);
  }, [inputText]);

  // 如果有初始prompt,自动生成图片
  useEffect(() => {
    if (initialPrompt) {
      handleGenerate();
    }
  }, [initialPrompt, handleGenerate]);

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
      <div className="glass-panel flex shrink-0 flex-col gap-3 p-5">
        <h2 className="text-base font-semibold">输入与生成</h2>

        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (error) setError("");
            }}
            placeholder="在这里描述你想要的物体..."
            maxLength={IMAGE_GENERATION.MAX_PROMPT_LENGTH}
            className={`min-h-[100px] w-full resize-none rounded-lg border bg-surface-2 p-3 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none ${
              error
                ? "border-red-1 focus:border-red-1"
                : "border-border-subtle focus:border-yellow-1"
            }`}
            aria-label="描述你想要的物体"
            aria-invalid={!!error}
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className={error ? "text-red-1" : "text-transparent"}>
              {error || "placeholder"}
            </span>
            <span className="text-foreground-subtle">
              {inputText.length}/{IMAGE_GENERATION.MAX_PROMPT_LENGTH}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={status === "generating"}
            className="btn-primary"
          >
            {status === "generating" ? "生成中..." : "重新再生"}
          </button>
        </div>

        <div className="text-center text-xs text-foreground-subtle">
          💡 提示: 添加更多细节描述可提升生成质量
        </div>
      </div>

      {/* 生成结果区域 */}
      <div className="glass-panel flex flex-1 flex-col gap-3 overflow-hidden p-5">
        <h2 className="text-base font-semibold">生成结果</h2>

        {status === "idle" || status === "generating" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-foreground-subtle">
            {status === "generating" ? (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-1 border-t-transparent" />
                <p className="text-sm">正在生成图片...</p>
              </>
            ) : (
              <p className="text-sm">等待生成图片...</p>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="grid flex-1 grid-cols-2 gap-2.5 overflow-hidden">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedImage(idx);
                    if (error) setError("");
                  }}
                  className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-250 ${
                    selectedImage === idx
                      ? "scale-[1.02] border-yellow-1 bg-gradient-to-br from-yellow-1/15 to-yellow-1/5 shadow-[0_0_0_3px_rgba(249,207,0,0.15),0_8px_24px_rgba(249,207,0,0.25)]"
                      : "border-white/8 hover:scale-[1.01] hover:border-white/20"
                  }`}
                  aria-label={`选择图片 ${idx + 1}`}
                >
                  <div
                    className={`flex h-full items-center justify-center bg-gradient-to-br text-sm ${
                      idx === 0
                        ? "from-purple-1/20 to-surface-3"
                        : idx === 1
                          ? "from-pink-1/20 to-surface-3"
                          : idx === 2
                            ? "from-blue-2/20 to-surface-3"
                            : "from-yellow-1/20 to-surface-3"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className={`h-10 w-10 transition-opacity ${
                          selectedImage === idx
                            ? "text-yellow-1"
                            : "text-foreground-subtle group-hover:text-foreground-muted"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
                        <circle cx="9" cy="10" r="1.5" />
                        <path d="M21 15.5 16.5 11 9 18" />
                        <path d="m12 14-3 3" />
                      </svg>
                      <span
                        className={`text-xs ${
                          selectedImage === idx
                            ? "text-yellow-1"
                            : "text-foreground-subtle group-hover:text-foreground-muted"
                        }`}
                      >
                        图片 {idx + 1}
                      </span>
                    </div>
                  </div>
                  {selectedImage === idx && (
                    <div className="absolute right-2 top-2 flex h-6 w-6 animate-[scale-in_0.2s_cubic-bezier(0.4,0,0.2,1)] items-center justify-center rounded-full bg-gradient-to-br from-yellow-1 to-accent-yellow-dim shadow-lg">
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
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleGenerate3D}
              disabled={selectedImage === null}
              className="btn-secondary w-full"
            >
              生成 3D 模型
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
