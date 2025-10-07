"use client";

import { useState } from "react";
import type { HeroFeatureCardProps } from "./HeroFeatureCard";
import HeroFeatureCard from "./HeroFeatureCard";
import HeroSearchBar from "./HeroSearchBar";

type FeatureCard = Omit<HeroFeatureCardProps, "key">;

const PROMPT_TAGS: string[] = [
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

const FEATURE_CARDS: FeatureCard[] = [
  {
    title: "图像生成",
    image: "https://studio.tripo3d.ai/static/images/home/image-generate.webp",
    ribbon: "Coming Soon",
  },
  {
    title: "AI纹理",
    image: "https://studio.tripo3d.ai/static/images/home/texture.webp",
  },
  {
    title: "3D工作台",
    image: "https://studio.tripo3d.ai/static/images/home/generate-model.webp",
    primary: true,
    ctaLabel: "✦ 3D工作台",
  },
  {
    title: "智能重拓扑",
    image: "https://studio.tripo3d.ai/static/images/home/smart-retopology.webp",
  },
  {
    title: "通用绑骨与动画",
    image: "https://studio.tripo3d.ai/static/images/home/rigging.webp",
  },
];

const PROMPT_TAG_CLASSES =
  "rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:border-yellow-1/60 hover:bg-yellow-1/5 hover:text-white";

export default function HeroSection() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    // 触发自定义事件,让 HeroSearchBar 接收到标签内容
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
        <div className="text-center">
          <h1 className="text-[42px] font-bold uppercase tracking-[0.24em] text-white drop-shadow-[0_12px_32px_rgba(0,0,0,0.4)] md:text-[52px]">
            一键生成任何3D内容
          </h1>
          <p className="mt-4 text-[20px] font-medium text-white/60 md:text-[22px]">
            最先进的 AI 3D 模型生成器
          </p>
        </div>

        <HeroSearchBar />

        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-white/70">
          {PROMPT_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className={`${PROMPT_TAG_CLASSES} ${
                selectedTag === tag
                  ? "!border-yellow-1 !bg-yellow-1/15 !text-yellow-1"
                  : ""
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="hero-feature-row">
          {FEATURE_CARDS.map((card) => (
            <HeroFeatureCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}
