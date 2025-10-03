import Image from "next/image";

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

function IconMedia() {
  return (
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
  );
}

function IconSubmit() {
  return (
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
  );
}

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden pb-24 pt-20">
      <div className="absolute inset-0 -z-40 bg-[radial-gradient(circle_at_18%_12%,rgba(82,59,231,0.55),transparent_58%),radial-gradient(circle_at_86%_-8%,rgba(249,207,0,0.45),transparent_55%),radial-gradient(circle_at_60%_120%,rgba(251,35,194,0.35),transparent_65%),linear-gradient(180deg,rgba(8,8,10,0.95)_0%,rgba(8,8,10,0.78)_42%,rgba(6,6,8,0.96)_100%)]" />
      <div className="absolute inset-0 -z-30 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%27320%27%20height%3D%27320%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cfilter%20id%3D%27n%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.45%27%20numOctaves%3D%273%27%2F%3E%3CfeColorMatrix%20type%3D%27saturate%27%20values%3D%270%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27320%27%20height%3D%27320%27%20filter%3D%27url%28%23n%29%27%20opacity%3D%270.1%27%2F%3E%3C%2Fsvg%3E')] opacity-35" />
      <div className="absolute inset-x-0 top-0 -z-20 h-44 bg-gradient-to-b from-black/75 via-black/40 to-transparent" />

      <div className="mx-auto w-full max-w-[1180px] px-6">
        <div className="text-center">
          <h1 className="font-[\'EB Garamond\',var(--font-sans)] text-[48px] uppercase tracking-[0.3em] text-white drop-shadow-[0_18px_48px_rgba(0,0,0,0.35)] md:text-[56px]">
            一键生成任何3D内容
          </h1>
          <p className="mt-3 font-[\'EB Garamond\',var(--font-sans)] text-[22px] text-white/75 md:text-[24px]">
            最先进的 AI 3D 模型生成器
          </p>
        </div>

        <div className="mx-auto mt-12 w-full max-w-[820px]">
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[32px] bg-[radial-gradient(circle_at_14%_20%,rgba(255,230,120,0.32),transparent_56%),radial-gradient(circle_at_88%_70%,rgba(255,197,73,0.24),transparent_65%)] opacity-45 blur-[14px]" />
            <div className="relative flex h-[84px] items-center gap-6 rounded-[30px] border border-[rgba(255,214,64,0.45)] bg-[linear-gradient(135deg,rgba(50,45,54,0.9)_0%,rgba(42,38,45,0.85)_45%,rgba(33,30,37,0.82)_100%)] px-8 shadow-[0_26px_76px_rgba(0,0,0,0.55)]">
              <div className="absolute inset-0 rounded-[30px] bg-white/6 opacity-30" />
              <button
                type="button"
                aria-label="上传参考图像"
                className="relative flex h-[58px] w-[58px] items-center justify-center rounded-[22px] border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(160deg,rgba(90,92,104,0.55)_0%,rgba(56,57,68,0.48)_100%)] shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
              >
                <IconMedia />
              </button>
              <label htmlFor="hero-prompt" className="sr-only">
                描述你想生成的模型
              </label>
              <input
                id="hero-prompt"
                type="text"
                placeholder="描述你想生成的模型..."
                className="relative z-10 flex-1 border-none bg-transparent text-[18px] text-[#ECEFF8]/80 outline-none placeholder:text-[#ECEFF8]/55"
              />
              <button
                type="button"
                aria-label="提交生成请求"
                className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full border border-[rgba(255,214,64,0.55)] bg-[var(--accent-yellow)] shadow-[0_20px_48px_rgba(249,207,0,0.5)] transition hover:brightness-110"
              >
                <IconSubmit />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-white/70">
            {PROMPT_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className="rounded-full border border-[rgba(118,124,143,0.35)] bg-[rgba(47,49,59,0.75)] px-3 py-[6px] transition hover:border-[var(--accent-yellow)] hover:text-white"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-20">
          <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_18%_52%,rgba(126,104,255,0.22),transparent_62%),radial-gradient(circle_at_82%_48%,rgba(249,207,0,0.22),transparent_65%)] opacity-75 blur-[120px]" />
          <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-center">
            {FEATURE_CARDS.map((card) => (
              <div
                key={card.title}
                className="group relative flex items-end justify-center overflow-hidden rounded-[30px] border border-white/12 bg-white/8 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-[18px] transition-transform duration-300 hover:-translate-y-3"
                style={{
                  width: card.primary ? 278 : 224,
                  height: card.primary ? 278 : 224,
                }}
              >
                {card.ribbon && (
                  <div className="absolute left-[-60px] top-10 z-20 w-[180px] rotate-[-40deg] bg-[linear-gradient(100deg,rgba(90,124,255,0.95)_0%,rgba(140,168,255,0.85)_100%)] py-1 text-center text-[12px] font-medium text-white shadow-[0_10px_18px_rgba(0,0,0,0.35)]">
                    {card.ribbon}
                  </div>
                )}
                <div className="absolute inset-0">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className={`object-cover transition-transform duration-500 ${
                      card.primary ? "scale-100" : "scale-102"
                    } group-hover:scale-108`}
                    sizes="(min-width: 1280px) 18vw, (min-width: 768px) 32vw, 80vw"
                    priority={card.primary}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
                <div className="relative flex w-full flex-col items-center justify-end pb-6 text-white">
                  <span className="text-sm font-medium tracking-wide drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                    {card.title}
                  </span>
                  {card.primary && card.ctaLabel ? (
                    <button
                      type="button"
                      className="mt-4 rounded-full bg-[var(--accent-yellow)] px-6 py-2 text-xs font-semibold text-black shadow-[0_14px_34px_rgba(249,207,0,0.45)] transition hover:brightness-110"
                    >
                      {card.ctaLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
