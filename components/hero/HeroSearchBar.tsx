"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IMAGE_GENERATION, VALIDATION_MESSAGES } from "@/lib/constants";
import type { ComponentPropsWithoutRef } from "react";

export type HeroSearchBarProps = ComponentPropsWithoutRef<"div">;

export default function HeroSearchBar({
  className = "",
  ...props
}: HeroSearchBarProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
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
    router.push(`/workspace?prompt=${encodeURIComponent(trimmedPrompt)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div
      className={`relative mx-auto mt-10 w-full max-w-[820px] ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -z-10 rounded-[32px] bg-hero-search-glow" />
      <div className="relative flex h-[84px] items-center gap-6 rounded-[30px] border border-hero-search-border bg-hero-search-surface px-8 shadow-hero-search backdrop-blur-[26px]">
        <button
          type="button"
          aria-label="上传参考图像"
          className="hero-search-icon"
        >
          <svg
            aria-hidden="true"
            role="presentation"
            focusable="false"
            className="h-6 w-6 text-white/75"
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
        <div className="flex flex-1 flex-col gap-1">
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
            className="border-none bg-transparent text-[18px] text-[#ECEFF8]/80 outline-none placeholder:text-[#ECEFF8]/55"
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
          aria-label="提交生成请求"
          className="hero-search-submit"
        >
          <svg
            aria-hidden="true"
            role="presentation"
            focusable="false"
            className="h-6 w-6 text-black"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m14 5 7 7-7 7" />
            <path d="M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
