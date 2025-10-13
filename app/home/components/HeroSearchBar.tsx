"use client";

import { useRouter } from "next/navigation";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useState } from "react";
import { IMAGE_GENERATION, VALIDATION_MESSAGES } from "@/lib/constants";

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
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });

      const data = await response.json();

      if (data.success && data.data?.id) {
        // 使用任务ID跳转到工作台
        router.push(`/workspace?taskId=${data.data.id}`);
      } else {
        // 处理API错误
        setError(data.error?.message || "创建任务失败，请重试");
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
      className={`relative mx-auto mt-12 w-full max-w-[780px] ${className}`}
      {...props}
    >
      <div className="relative flex h-[72px] items-center gap-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/4 px-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-[20px] transition-all duration-200 focus-within:border-yellow-1/60 focus-within:shadow-[0_8px_32px_rgba(249,207,0,0.2)]">
        <button
          type="button"
          aria-label="上传参考图像"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/8 text-white/70 transition-all duration-200 hover:border-yellow-1/50 hover:bg-yellow-1/10 hover:text-yellow-1"
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
            className="border-none bg-transparent text-[16px] text-white/85 outline-none placeholder:text-white/50"
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
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-yellow-1/50 bg-gradient-to-br from-yellow-1 to-accent-yellow-dim text-black shadow-[0_8px_24px_rgba(249,207,0,0.4)] transition-all duration-200 hover:scale-105 hover:shadow-[0_12px_32px_rgba(249,207,0,0.5)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          {isCreating ? (
            <svg
              aria-hidden="true"
              role="presentation"
              focusable="false"
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
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
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
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
