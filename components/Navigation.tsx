import Image from "next/image";

export default function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-[1600px] mx-auto px-6 h-[60px] flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-400 rounded flex items-center justify-center">
              <span className="text-black font-bold text-sm">▼</span>
            </div>
            <span className="text-white font-semibold text-lg">TRIPO</span>
          </a>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <a href="/" className="text-white/90 hover:text-white text-sm">
              首页
            </a>
            <a href="/workspace" className="text-white/70 hover:text-white text-sm">
              3D工作台
            </a>
            <a href="/assets" className="text-white/70 hover:text-white text-sm">
              资产
            </a>
            <a href="/affiliate" className="text-white/70 hover:text-white text-sm">
              联盟营销计划
            </a>
            <a href="/lite" className="text-white/70 hover:text-white text-sm">
              Tripo 精简版
            </a>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          <button className="text-white/70 hover:text-white">
            <span className="text-sm">?</span>
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg text-white text-sm font-medium hover:opacity-90">
            升级
          </button>
          <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20" />
          <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20" />
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">
            注册/登录
          </button>
        </div>
      </div>
    </nav>
  );
}
