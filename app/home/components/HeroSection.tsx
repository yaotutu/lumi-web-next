"use client";

import { useState } from "react";
import HeroSearchBar from "./HeroSearchBar";
import WorkflowSteps from "./WorkflowSteps";
import { useParallax } from "../hooks/useParallax";
import ParticleBackground from "@/components/ui/ParticleBackground";

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

  // 视差效果 - 不同速度产生层次感
  const backgroundOffset = useParallax(0.3); // 背景慢速移动
  const contentOffset = useParallax(0.15); // 内容更慢

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
      {/* 背景层 - 应用视差效果 */}
      <div
        className="hero-background"
        style={{ transform: `translateY(${backgroundOffset}px)` }}
      />
      {/* 粒子背景 */}
      <ParticleBackground count={40} maxSize={5} minSize={1} />
      <div className="hero-noise" />
      <div className="hero-vignette" />

      <div
        className="hero-container"
        style={{ transform: `translateY(${contentOffset}px)` }}
      >
        {/* 标题区域 */}
        <div className="text-center">
          <h1 className="relative text-[42px] font-bold uppercase tracking-[0.24em] md:text-[52px]">
            {/* 渐变文字效果 */}
            <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(168,85,247,0.4)]">
              一键生成任何3D内容
            </span>
          </h1>
          <p className="mt-5 text-[20px] font-medium text-white/70 md:text-[22px]">
            最先进的 AI 3D 模型生成器
          </p>
        </div>

        {/* 搜索输入框 */}
        <HeroSearchBar />

        {/* TODO: 快速提示词标签功能 - 暂时隐藏，后期实现
            功能说明：提供预设的提示词标签，帮助用户快速开始生成
            实现要点：
            1. 设计更丰富的标签分类（风格、场景、用途等）
            2. 标签点击后自动填充到输入框
            3. 支持多标签组合
            4. 可以从后端动态加载热门标签
            5. 用户可以收藏常用标签
        */}
        {/* 快速提示词标签 - 帮助用户快速开始 */}
        <div className="hidden mt-6 overflow-x-auto scrollbar-hide">
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
