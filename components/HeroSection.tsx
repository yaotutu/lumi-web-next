import HeroFeatureCard from "./hero/HeroFeatureCard";
import HeroSearchBar from "./hero/HeroSearchBar";

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

const FEATURE_CARDS = [
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
  "rounded-full border border-[rgba(118,124,143,0.35)] bg-[rgba(47,49,59,0.75)] px-3 py-[6px] transition hover:border-[var(--accent-yellow)] hover:text-white";

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-background" />
      <div className="hero-noise" />
      <div className="hero-vignette" />

      <div className="hero-container">
        <div className="text-center">
          <h1 className="font-[\'EB Garamond\',var(--font-sans)] text-[48px] uppercase tracking-[0.3em] text-white drop-shadow-[0_18px_48px_rgba(0,0,0,0.35)] md:text-[56px]">
            一键生成任何3D内容
          </h1>
          <p className="mt-3 font-[\'EB Garamond\',var(--font-sans)] text-[22px] text-white/75 md:text-[24px]">
            最先进的 AI 3D 模型生成器
          </p>
        </div>

        <HeroSearchBar />

        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-white/70">
          {PROMPT_TAGS.map((tag) => (
            <button key={tag} type="button" className={PROMPT_TAG_CLASSES}>
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
