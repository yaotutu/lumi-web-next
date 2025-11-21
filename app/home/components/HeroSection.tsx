"use client";

import { useState } from "react";
import HeroSearchBar from "./HeroSearchBar";
import WorkflowSteps from "./WorkflowSteps";

// 快速提示词标签
const PROMPT_TAGS = [
  "写实角色",
  "影视道具",
  "低面数",
  "UE5",
  "手绘风",
  "机甲",
  "环境场景",
  "动画就绪",
  "批量生成",
];

export default function HeroSection() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 处理标签点击
  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    // 触发自定义事件，让 HeroSearchBar 接收到标签内容
    window.dispatchEvent(
      new CustomEvent("hero-tag-selected", { detail: { tag } }),
    );
  };

  return (
    <section className="hero-section">
      <div className="hero-background" />
      <div className="hero-noise" />
      <div className="hero-vignette" />

      <div className="hero-container">
        {/* 标题区域 */}
        <div className="text-center">
          <h1 className="text-[42px] font-bold uppercase tracking-[0.24em] text-white drop-shadow-[0_12px_32px_rgba(0,0,0,0.4)] md:text-[52px]">
            一键生成任何3D内容
          </h1>
          <p className="mt-4 text-[20px] font-medium text-white/60 md:text-[22px]">
            最先进的 AI 3D 模型生成器
          </p>
        </div>

        {/* 搜索输入框 */}
        <HeroSearchBar />

        {/* 快速提示词标签 - 帮助用户快速开始 */}
        <div className="mt-6 overflow-x-auto scrollbar-hide">
          <div className="flex justify-center gap-1.5 min-w-max px-4">
            {PROMPT_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className={`
                  rounded-full border px-2.5 py-1 text-[11px] font-medium
                  transition-all duration-200
                  ${
                    selectedTag === tag
                      ? "border-yellow-1 bg-yellow-1/15 text-yellow-1"
                      : "border-white/20 bg-white/5 text-white/60 hover:border-yellow-1/50 hover:bg-yellow-1/5 hover:text-white"
                  }
                `}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* 工作流程步骤说明 - 突出"一键打印"核心优势 */}
        <WorkflowSteps />
      </div>
    </section>
  );
}
