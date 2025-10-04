"use client";

import { useState, useEffect, useRef } from "react";
import { MODEL_GENERATION } from "@/lib/constants";
import GenerationProgress from "./GenerationProgress";
import type { GenerationStatus } from "@/types";

interface ModelPreviewProps {
  imageIndex: number | null;
  prompt: string;
}

export default function ModelPreview({
  imageIndex,
  prompt,
}: ModelPreviewProps) {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 当选择图片并触发生成时
  useEffect(() => {
    if (imageIndex !== null && prompt) {
      startModelGeneration();
    }

    // 清理定时器
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [imageIndex, prompt]);

  const startModelGeneration = () => {
    setStatus("generating");
    setProgress(0);

    // 模拟进度更新
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          return prev;
        }
        return prev + Math.random() * 5;
      });
    }, MODEL_GENERATION.PROGRESS_INTERVAL);

    // 模拟生成完成
    setTimeout(() => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setProgress(100);
      setStatus("completed");
    }, MODEL_GENERATION.DELAY);
  };

  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden">
      {/* 3D预览区域 */}
      <div className="relative flex flex-1 flex-col items-center justify-center border-b border-border-subtle overflow-hidden">
        <h2 className="absolute left-5 top-5 text-base font-semibold">
          3D 预览
        </h2>

        {/* 3D渲染区域占位 */}
        <div className="flex h-full w-full items-center justify-center">
          {status === "generating" ? (
            <div className="text-center">
              <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-yellow-1 border-t-transparent mx-auto" />
              <p className="text-sm text-foreground-muted">正在生成3D模型...</p>
              <p className="mt-1 text-xs text-foreground-subtle">
                {Math.round(progress)}%
              </p>
            </div>
          ) : status === "completed" ? (
            <div className="text-center">
              <div className="mb-4 text-5xl">✨</div>
              <p className="text-sm text-foreground-muted">模型生成完成</p>
              <p className="mt-1 text-xs text-foreground-subtle">
                基于图片 {(imageIndex ?? 0) + 1}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-4 text-5xl text-foreground-subtle">🎨</div>
              <p className="text-sm text-foreground-subtle">3D模型将在这里显示</p>
              <p className="mt-1 text-xs text-foreground-subtle">
                (Three.js / React Three Fiber)
              </p>
            </div>
          )}
        </div>

        {/* 控制按钮 */}
        <div className="absolute bottom-5 right-5 flex items-center gap-2.5">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-foreground-subtle transition hover:border-white-10 hover:text-foreground"
            title="禁用"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeWidth={1.5} />
            </svg>
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-foreground-subtle transition hover:border-white-10 hover:text-foreground"
            title="刷新"
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
                strokeWidth={1.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-foreground-subtle transition hover:border-white-10 hover:text-foreground"
            title="全屏"
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
                strokeWidth={1.5}
                d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 生成进度和操作区域 */}
      <div className="shrink-0 p-5">
        {status === "generating" ? (
          <GenerationProgress progress={Math.round(progress)} />
        ) : status === "completed" ? (
          <>
            <div className="mb-3">
              <h3 className="mb-1.5 text-sm font-medium text-foreground-muted">
                预计耗材:
              </h3>
              <div className="text-xs text-foreground-subtle">
                PLA: ~50g | 预计时间: 2小时
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-lg bg-yellow-1 py-2.5 text-sm font-medium text-black transition hover:brightness-110"
            >
              打印
            </button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <h3 className="mb-1.5 text-sm font-medium text-foreground-muted">
                预计耗材:
              </h3>
              <div className="text-xs text-foreground-subtle">
                等待生成模型...
              </div>
            </div>

            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-lg bg-surface-3 py-2.5 text-sm font-medium text-foreground opacity-50"
            >
              打印
            </button>
          </>
        )}
      </div>
    </div>
  );
}
