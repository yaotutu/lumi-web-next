"use client";

import Image from "next/image";
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

const modelItem = {
  image: "/gallery/bat-bunny.webp",
  title: "Whimsical bat bunny",
  description:
    "Soft clay-like bat bunny with tiny wings and rounded ears lit by a studio rim light.",
  author: "AquaVortex",
  likes: 5,
  href: "https://studio.tripo3d.ai/workspace?project=12a1e2dc-bc32-4506-bafb-1be989bda190",
};

const galleryItems = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  ...modelItem,
}));

export default function ModelGallery() {
  const [activeCategory, setActiveCategory] = useState("精选");
  const filteredItems = galleryItems;

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

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="group relative flex flex-col overflow-hidden rounded-[28px] border border-white/12 bg-[rgba(18,19,24,0.75)] shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-[14px] transition-transform hover:-translate-y-2"
            >
              <div className="relative aspect-square overflow-hidden">
                <div className="absolute inset-0 flex items-start justify-between px-3 pt-3 z-10 text-white/80 text-base">
                  <span className="opacity-0 transition-opacity group-hover:opacity-100">
                    📘
                  </span>
                  <span className="opacity-0 transition-opacity group-hover:opacity-100">
                    ⭐
                  </span>
                </div>
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 90vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/75" />
              </div>
              <div className="space-y-2 px-4 pb-4 pt-3 text-sm">
                <p className="line-clamp-2 text-white/90 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                  {item.title}
                </p>
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span>{item.author}</span>
                  <span className="flex items-center gap-1">
                    <svg
                      aria-hidden="true"
                      role="presentation"
                      focusable="false"
                      className="h-3 w-3 text-white/60"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                    </svg>
                    {item.likes}
                  </span>
                </div>
              </div>
            </a>
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
