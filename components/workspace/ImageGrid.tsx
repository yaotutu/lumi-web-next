"use client";

import { useState } from "react";

export default function ImageGrid() {
  const [inputText, setInputText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 模拟图片生成
  const handleGenerate = () => {
    setIsGenerating(true);
    // 模拟生成4张图片
    setTimeout(() => {
      setImages([
        "/placeholder-1.jpg",
        "/placeholder-2.jpg",
        "/placeholder-3.jpg",
        "/placeholder-4.jpg",
      ]);
      setIsGenerating(false);
    }, 1500);
  };

  const handleRegenerate = () => {
    setImages([]);
    setSelectedImage(null);
    handleGenerate();
  };

  const handleGenerate3D = () => {
    if (selectedImage !== null) {
      // 触发3D模型生成
      console.log("生成3D模型,使用图片:", selectedImage);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* 输入与生成区域 */}
      <div className="glass-panel flex shrink-0 flex-col gap-3 p-5">
        <h2 className="text-base font-semibold">输入与生成</h2>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="在这里描述你想要的物体..."
          className="min-h-[100px] resize-none rounded-lg border border-border-subtle bg-surface-2 p-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-yellow-1 focus:outline-none"
        />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-lg bg-yellow-1 px-5 py-2 text-sm font-medium text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {isGenerating ? "生成中..." : "重新再生"}
          </button>
        </div>

        <div className="text-center text-xs text-foreground-subtle">
          不满意? 倒叙描述后重新生成
        </div>
      </div>

      {/* 生成结果区域 */}
      <div className="glass-panel flex flex-1 flex-col gap-3 overflow-hidden p-5">
        <h2 className="text-base font-semibold">生成结果</h2>

        {images.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-foreground-subtle">
            等待生成图片...
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="grid flex-1 grid-cols-2 gap-2.5 overflow-hidden">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  className={`relative overflow-hidden rounded-lg border-2 transition ${
                    selectedImage === idx
                      ? "border-yellow-1"
                      : "border-border-subtle hover:border-white-10"
                  }`}
                >
                  <div className="flex h-full items-center justify-center bg-surface-3 text-sm text-foreground-subtle">
                    图片 {idx + 1}
                  </div>
                  {selectedImage === idx && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-1">
                      <svg
                        className="h-3 w-3 text-black"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
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
              className="shrink-0 rounded-lg border border-border-subtle bg-surface-2 py-2.5 text-sm font-medium text-foreground transition hover:border-yellow-1 hover:text-yellow-1 disabled:opacity-50"
            >
              生成 3D 模型
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
