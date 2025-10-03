export default function FeatureCards() {
  return (
    <section className="py-6 px-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-5 gap-3 h-[280px]">
          {/* 图像生成 - Coming Soon */}
          <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 overflow-hidden opacity-70">
            <div className="absolute top-3 left-3">
              <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                Coming Soon
              </span>
            </div>
            <div className="h-32 bg-slate-700/30 rounded-xl mb-3 mt-8" />
            <h3 className="text-white text-sm font-medium">图像生成</h3>
          </div>

          {/* AI纹理 */}
          <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 overflow-hidden hover:scale-[1.02] transition-transform">
            <div className="h-32 bg-slate-700/30 rounded-xl mb-3" />
            <h3 className="text-white text-sm font-medium mb-2">AI纹理</h3>
            <p className="text-white/40 text-xs mb-2">
              GLB、OBJ、FBX、STL
              <br />
              ≤50MB,≤100万面数
            </p>
            <button
              type="button"
              className="w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-colors"
            >
              上传3D模型
            </button>
          </div>

          {/* 3D工作台 - Highlighted Large Card */}
          <div className="relative bg-gradient-to-br from-orange-600/30 to-red-700/30 rounded-2xl p-4 overflow-hidden border border-orange-500/40 hover:scale-[1.02] transition-transform">
            <div className="h-48 bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
              {/* Placeholder for 3D model preview */}
              <div className="text-5xl">⚔️</div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-white text-sm font-medium">3D工作台</h3>
              <button
                type="button"
                className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 rounded-lg text-black text-xs font-medium transition-colors flex items-center gap-1"
              >
                <span>⚡</span>
                3D工作台
              </button>
            </div>
          </div>

          {/* 智能重拓扑 */}
          <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 overflow-hidden hover:scale-[1.02] transition-transform">
            <div className="h-32 bg-slate-700/30 rounded-xl mb-3" />
            <h3 className="text-white text-sm font-medium mb-2">智能重拓扑</h3>
            <p className="text-white/40 text-xs mb-2">
              GLB、OBJ、FBX、STL
              <br />
              ≤50MB,≤100万面数
            </p>
            <button
              type="button"
              className="w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-colors"
            >
              上传3D模型
            </button>
          </div>

          {/* 通用绑骨与动画 */}
          <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 overflow-hidden hover:scale-[1.02] transition-transform">
            <div className="h-32 bg-slate-700/30 rounded-xl mb-3" />
            <h3 className="text-white text-sm font-medium mb-2">
              通用绑骨与动画
            </h3>
            <p className="text-white/40 text-xs mb-2">
              GLB、OBJ、FBX、STL
              <br />
              ≤50MB,≤100万面数
            </p>
            <button
              type="button"
              className="w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-colors"
            >
              上传3D模型
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
