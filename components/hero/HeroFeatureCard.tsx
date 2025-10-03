import Image from "next/image";

export type HeroFeatureCardProps = {
  title: string;
  image: string;
  ribbon?: string;
  primary?: boolean;
  ctaLabel?: string;
};

export default function HeroFeatureCard({
  title,
  image,
  ribbon,
  primary,
  ctaLabel,
}: HeroFeatureCardProps) {
  return (
    <div
      className={`group relative flex items-end justify-center overflow-hidden rounded-[30px] border border-white/12 bg-white/8 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-[18px] transition-transform duration-300 hover:-translate-y-3 ${
        primary ? "hero-feature-card-primary" : "hero-feature-card"
      }`}
    >
      {ribbon && <div className="hero-feature-ribbon">{ribbon}</div>}
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={title}
          fill
          unoptimized
          className={`object-cover transition-transform duration-500 ${primary ? "scale-100" : "scale-102"} group-hover:scale-108`}
          sizes="(min-width: 1280px) 18vw, (min-width: 768px) 25vw, 80vw"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
      <div className="relative flex w-full flex-col items-center justify-end pb-6 text-white">
        <span className="text-sm font-medium tracking-wide drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
          {title}
        </span>
        {primary && ctaLabel ? (
          <button
            type="button"
            className="mt-4 rounded-full bg-[var(--accent-yellow)] px-6 py-2 text-xs font-semibold text-black shadow-[0_14px_34px_rgba(249,207,0,0.45)] transition hover:brightness-110"
          >
            {ctaLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
