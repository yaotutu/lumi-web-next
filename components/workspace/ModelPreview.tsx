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
            className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-foreground-subtle transition hover:border-white-10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            title="显示网格"
            disabled={status !== "completed"}
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
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-surface-2 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100">
              显示网格
            </span>
          </button>
          <button
            type="button"
            className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-foreground-subtle transition hover:border-white-10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            title="重置视角"
            disabled={status !== "completed"}
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
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-surface-2 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100">
              重置视角
            </span>
          </button>
          <button
            type="button"
            className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-foreground-subtle transition hover:border-white-10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            title="全屏预览"
            disabled={status !== "completed"}
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
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-surface-2 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100">
              全屏预览
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
            <div className="mb-3">
              <h3 className="mb-1.5 text-sm font-medium text-foreground-muted">
                模型信息
              </h3>
              <div className="space-y-1 text-xs text-foreground-subtle">
                <div className="flex justify-between">
                  <span>格式:</span>
                  <span className="text-foreground-muted">GLB</span>
                </div>
                <div className="flex justify-between">
                  <span>大小:</span>
                  <span className="text-foreground-muted">2.5 MB</span>
                </div>
                <div className="flex justify-between">
                  <span>面数:</span>
                  <span className="text-foreground-muted">50,248</span>
                </div>
                <div className="flex justify-between">
                  <span>质量:</span>
                  <span className="text-yellow-1">高清</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-lg bg-yellow-1 py-2.5 text-sm font-medium text-black transition hover:brightness-110"
            >
              下载模型
            </button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <h3 className="mb-1.5 text-sm font-medium text-foreground-muted">
                模型信息
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
              下载模型
            </button>
          </>
        )}
      </div>
    </div>
  );
}
