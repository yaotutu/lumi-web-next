"use client";

import { useRouter } from "next/navigation";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useState } from "react";
import { IMAGE_GENERATION, VALIDATION_MESSAGES } from "@/lib/constants";
import { apiPost } from "@/lib/api-client";
import { getErrorMessage, isSuccess } from "@/lib/utils/api-helpers";

export type HeroSearchBarProps = ComponentPropsWithoutRef<"div">;

export default function HeroSearchBar({
  className = "",
  ...props
}: HeroSearchBarProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false); // 任务创建中状态

  // 监听标签选择事件
  useEffect(() => {
    const handleTagSelected = (event: Event) => {
      const customEvent = event as CustomEvent<{ tag: string }>;
      const tag = customEvent.detail.tag;
      setPrompt((prev) => {
        // 如果已有内容,在后面追加标签
        if (prev.trim()) {
          return `${prev} #${tag}`;
        }
        return `#${tag}`;
      });
      if (error) setError("");
    };

    window.addEventListener("hero-tag-selected", handleTagSelected);
    return () => {
      window.removeEventListener("hero-tag-selected", handleTagSelected);
    };
  }, [error]);

  const handleSubmit = async () => {
    const trimmedPrompt = prompt.trim();

    // 验证输入
    if (!trimmedPrompt) {
      setError(VALIDATION_MESSAGES.PROMPT_REQUIRED);
      return;
    }
    if (trimmedPrompt.length < IMAGE_GENERATION.MIN_PROMPT_LENGTH) {
      setError(VALIDATION_MESSAGES.PROMPT_TOO_SHORT);
      return;
    }
    if (trimmedPrompt.length > IMAGE_GENERATION.MAX_PROMPT_LENGTH) {
      setError(VALIDATION_MESSAGES.PROMPT_TOO_LONG);
      return;
    }

    setError("");
    setIsCreating(true);

    try {
      // 调用API创建任务
      const response = await apiPost("/api/tasks", { prompt: trimmedPrompt });

      const data = await response.json();

      // JSend 格式判断
      if (isSuccess(data)) {
        const taskData = data.data as { id: string };
        // 使用任务ID跳转到工作台
        router.push(`/workspace?taskId=${taskData.id}`);
      } else {
        // 处理API错误
        setError(getErrorMessage(data));
        setIsCreating(false);
      }
    } catch (err) {
      // 处理网络错误
      console.error("Failed to create task:", err);
      setError("网络错误，请检查连接后重试");
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 阻止在创建任务时重复提交
    if (e.key === "Enter" && !isCreating) {
      handleSubmit();
    }
  };

  return (
    <div
      className={`relative mx-auto mt-14 w-full max-w-[780px] ${className}`}
      {...props}
    >
      {/* 搜索框发光背景 */}
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 opacity-0 blur-xl transition-opacity duration-300 group-focus-within:opacity-100" />

      <div className="group relative flex h-[76px] items-center gap-5 rounded-2xl border border-white/12 bg-gradient-to-br from-white/10 to-white/5 px-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-[24px] transition-all duration-300 focus-within:border-purple-400/50 focus-within:shadow-[0_12px_40px_rgba(168,85,247,0.25)]">
        {/* TODO: 图生3D功能 - 暂时隐藏，后期实现
            功能说明：用户上传参考图像，AI 根据图像生成 3D 模型
            实现要点：
            1. 图片上传功能（支持拖拽、点击上传）
            2. 图片预览和编辑
            3. 调用图生3D的API接口
            4. 显示生成进度和结果
        */}
        <button
          type="button"
          aria-label="上传参考图像"
          className="hidden flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/8 text-white/70 transition-all duration-200 hover:border-yellow-1/50 hover:bg-yellow-1/10 hover:text-yellow-1"
        >
          <svg
            aria-hidden="true"
            role="presentation"
            focusable="false"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="M21 15.5 16.5 11 9 18" />
            <path d="m12 14-3 3" />
          </svg>
        </button>
        <div className="flex flex-1 flex-col gap-0.5">
          <label htmlFor="hero-prompt" className="sr-only">
            描述你想生成的模型
          </label>
          <input
            id="hero-prompt"
            type="text"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="描述你想生成的模型..."
            maxLength={IMAGE_GENERATION.MAX_PROMPT_LENGTH}
            className="border-none bg-transparent text-[17px] font-medium text-white/90 outline-none placeholder:text-white/45"
            aria-invalid={!!error}
          />
          {error && (
            <span className="text-xs text-red-1" role="alert">
              {error}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isCreating}
          aria-label="提交生成请求"
          className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border border-yellow-1/60 bg-gradient-to-br from-yellow-1 via-yellow-1 to-accent-yellow-dim text-black shadow-[0_8px_28px_rgba(249,207,0,0.45)] transition-all duration-300 hover:scale-110 hover:shadow-[0_12px_36px_rgba(249,207,0,0.6)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          {isCreating ? (
            <svg
              aria-hidden="true"
              role="presentation"
              focusable="false"
              className="h-6 w-6 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              role="presentation"
              focusable="false"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m14 5 7 7-7 7" />
              <path d="M21 12H3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
