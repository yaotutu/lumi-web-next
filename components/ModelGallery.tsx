"use client";

import { useState } from "react";

const categories = [
  "精选",
  "人物",
  "载具",
  "动物",
  "建筑",
  "家具",
  "道具",
  "武器",
  "服饰",
  "机械",
  "食物",
  "自然",
  "抽象符号",
];

const collections = [
  {
    name: "Steam Punk",
    badge: "+10",
  },
  {
    name: "Magical Weapons",
  },
];

const models = [
  {
    id: 1,
    image: "/placeholder-model.jpg",
    description: "A massive insect-like creature...",
    author: "swordman",
    likes: 4,
  },
  {
    id: 2,
    image: "/placeholder-model.jpg",
    description: "A long, serpentine dragon...",
    author: "IsoSphere_42",
    likes: 5,
  },
  {
    id: 3,
    image: "/placeholder-model.jpg",
    description: "Whimsical fantasy cottage...",
    author: "IsoSphere_42",
    likes: 6,
  },
  {
    id: 4,
    image: "/placeholder-model.jpg",
    description: "antique automobile...",
    author: "ParadoxBeta",
    likes: 7,
  },
  {
    id: 5,
    image: "/placeholder-model.jpg",
    description: "armored warrior figure...",
    author: "Polyhedron_7",
    likes: 2,
  },
  {
    id: 6,
    image: "/placeholder-model.jpg",
    description: "arcane arch with runic...",
    author: "RenderGhost",
    likes: 2,
  },
  {
    id: 7,
    image: "/placeholder-model.jpg",
    description: "pink bunny-like creature...",
    author: "AquaVortex",
    likes: 4,
  },
  {
    id: 8,
    image: "/placeholder-model.jpg",
    description: "space bear wearing pastel...",
    author: "Pistron_5000",
    likes: 3,
  },
  {
    id: 9,
    image: "/placeholder-model.jpg",
    description: "orc warrior in spiked gold...",
    author: "Anonymous",
    likes: 1,
  },
  {
    id: 10,
    image: "/placeholder-model.jpg",
    description: "bonsai rock sculpture...",
    author: "Anonymous",
    likes: 1,
  },
  {
    id: 11,
    image: "/placeholder-model.jpg",
    description: "deer-headed humanoid...",
    author: "VoiCat ᵔᴥᵔ",
    likes: 0,
  },
  {
    id: 12,
    image: "/placeholder-model.jpg",
    description: "sinister clown bust...",
    author: "Anonymous",
    likes: 5,
  },
  {
    id: 13,
    image: "/placeholder-model.jpg",
    description: "muscular quadruped monster...",
    author: "miachael'sCraft",
    likes: 1,
  },
  {
    id: 14,
    image: "/placeholder-model.jpg",
    description: "colorful construction toy robot...",
    author: "Anonymous",
    likes: 1,
  },
  {
    id: 15,
    image: "/placeholder-model.jpg",
    description: "towering golem built from wood...",
    author: "CubixVoid",
    likes: 3,
  },
  {
    id: 16,
    image: "/placeholder-model.jpg",
    description: "lanky puppet-like witch...",
    author: "BOBO",
    likes: 1,
  },
];

export default function ModelGallery() {
  const [activeCategory, setActiveCategory] = useState("精选");

  return (
    <section className="py-8 px-6 pb-32">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">模型画廊</h2>
          <button
            type="button"
            className="text-white/70 hover:text-white text-sm flex items-center gap-2"
          >
            筛选与排序
            <svg
              aria-hidden="true"
              role="presentation"
              focusable="false"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeCategory === category
                  ? "bg-white text-black font-medium"
                  : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Featured Collections */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white text-sm font-medium hover:opacity-90 flex items-center gap-2"
          >
            <span>✨</span>
            加入精选
          </button>
          {collections.map((collection) => (
            <div
              key={collection.name}
              className="relative px-6 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
            >
              {collection.badge && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-600 rounded-full text-white text-xs">
                  {collection.badge}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">{collection.name}</span>
                <span className="text-white/50 text-xs group-hover:text-white/70">
                  查看模型集
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Model Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {models.map((model) => (
            <div
              key={model.id}
              className="group relative bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-all cursor-pointer"
            >
              {/* Model Preview */}
              <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  🎨
                </div>
                {/* Hover Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    type="button"
                    className="w-8 h-8 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/70"
                  >
                    <svg
                      aria-hidden="true"
                      role="presentation"
                      focusable="false"
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/70"
                  >
                    <svg
                      aria-hidden="true"
                      role="presentation"
                      focusable="false"
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Model Info */}
              <div className="p-3">
                <p className="text-white/60 text-xs mb-2 line-clamp-2">
                  {model.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-xs">{model.author}</span>
                  <div className="flex items-center gap-1">
                    <svg
                      aria-hidden="true"
                      role="presentation"
                      focusable="false"
                      className="w-3 h-3 text-white/40"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                    </svg>
                    <span className="text-white/40 text-xs">{model.likes}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="mt-12 text-center">
          <button
            type="button"
            className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-colors"
          >
            加载更多
          </button>
        </div>
      </div>
    </section>
  );
}
