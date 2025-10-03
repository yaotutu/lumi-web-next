export default function HeroSection() {
  return (
    <section className="relative pt-[80px] pb-8 px-6 min-h-[50vh]">
      {/* Background Video/Image Placeholder */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-900/30 via-black/50 to-black" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 50%, rgba(200, 100, 50, 0.3), transparent 50%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
          一键生成任何3D内容
        </h1>
        <h2 className="text-lg md:text-xl text-white/60 mb-8">
          最先进的 AI 3D 模型生成器
        </h2>

        {/* Search Input */}
        <div className="max-w-[700px] mx-auto">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/50 to-orange-500/50 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-black/40 backdrop-blur-md border border-yellow-500/30 rounded-[32px] p-1 flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 px-6">
                <svg
                  className="w-5 h-5 text-white/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="描述你想生成的模型..."
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/40 text-base py-3"
                />
              </div>
              <button className="w-12 h-12 bg-yellow-400 hover:bg-yellow-500 rounded-full flex items-center justify-center transition-colors">
                <svg
                  className="w-6 h-6 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
