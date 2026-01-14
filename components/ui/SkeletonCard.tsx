/**
 * SkeletonCard - 高级骨架屏卡片组件
 * 使用波浪渐变动画，提升加载体验
 */
export default function SkeletonCard() {
  return (
    <div className="gallery-card animate-pulse">
      {/* 图片区域骨架 */}
      <div className="gallery-card__media relative overflow-hidden bg-white/5">
        {/* 波浪渐变效果 */}
        <div
          className="absolute inset-0 -translate-x-full animate-[shimmer-wave_2s_infinite]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
            backgroundSize: "468px 100%",
          }}
        />
      </div>

      {/* 元数据区域骨架 */}
      <div className="gallery-card__meta">
        {/* 标题骨架 */}
        <div className="relative mb-2 h-4 overflow-hidden rounded bg-white/10">
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer-wave_2s_infinite]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
              backgroundSize: "468px 100%",
            }}
          />
        </div>

        {/* 底部信息骨架 */}
        <div className="flex justify-between">
          <div className="relative h-3 w-20 overflow-hidden rounded bg-white/5">
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer-wave_2s_infinite]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                backgroundSize: "468px 100%",
                animationDelay: "0.1s",
              }}
            />
          </div>
          <div className="relative h-3 w-10 overflow-hidden rounded bg-white/5">
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer-wave_2s_infinite]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                backgroundSize: "468px 100%",
                animationDelay: "0.2s",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
