"use client";

import { useState } from "react";
import type { GalleryCardProps } from "./GalleryCard";
import GalleryCard from "./GalleryCard";

type Collection = {
  name: string;
  badge?: string;
};

type GalleryItem = GalleryCardProps & {
  id: number;
};

const categories: string[] = [
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

const collections: Collection[] = [
  {
    name: "Steam Punk",
    badge: "+10",
  },
  {
    name: "Magical Weapons",
  },
];

const modelItem: Omit<GalleryCardProps, "key"> = {
  image: "/gallery/bat-bunny.webp",
  title: "Whimsical bat bunny",
  author: "AquaVortex",
  likes: 5,
  href: "https://studio.tripo3d.ai/workspace?project=12a1e2dc-bc32-4506-bafb-1be989bda190",
};

const galleryItems: GalleryItem[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  ...modelItem,
}));

export default function ModelGallery() {
  const [activeCategory, setActiveCategory] = useState("精选");
  const filteredItems = galleryItems;

  return (
    <section className="model-gallery">
      <div className="model-gallery__container">
        <div className="model-gallery__header">
          <h2>模型画廊</h2>
          <button type="button" className="model-gallery__filter">
            筛选与排序
            <svg
              aria-hidden="true"
              role="presentation"
              focusable="false"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        <div className="model-gallery__categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={
                activeCategory === category
                  ? "model-gallery__category model-gallery__category--active"
                  : "model-gallery__category"
              }
            >
              {category}
            </button>
          ))}
        </div>

        <div className="model-gallery__collections">
          <button type="button" className="model-gallery__join">
            <span>✨</span>
            加入精选
          </button>
          {collections.map((collection) => (
            <div key={collection.name} className="model-gallery__collection">
              {collection.badge && (
                <span className="model-gallery__badge">{collection.badge}</span>
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

        <div className="model-gallery__grid">
          {filteredItems.map((item) => (
            <GalleryCard key={item.id} {...item} />
          ))}
        </div>

        <div className="model-gallery__more">
          <button type="button">加载更多</button>
        </div>
      </div>
    </section>
  );
}
