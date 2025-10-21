"use client";

import { useCallback, useEffect, useState } from "react";
import type { GalleryCardProps } from "./GalleryCard";
import GalleryCard from "./GalleryCard";

// UserAsset 类型（从 API 返回）
type UserAsset = {
  id: string;
  name: string;
  previewImageUrl: string | null;
  likeCount: number;
  user: {
    id: string;
    name: string | null;
  } | null;
};

// 排序方式类型
type SortBy = "latest" | "popular";

// 集合类型
type Collection = {
  name: string;
  badge?: string;
};

// 集合数据（保留 UI 占位）
const collections: Collection[] = [
  {
    name: "Steam Punk",
    badge: "+10",
  },
  {
    name: "Magical Weapons",
  },
];

/**
 * 将 UserAsset 映射为 GalleryCardProps
 */
function mapUserAssetToGalleryCard(asset: UserAsset): GalleryCardProps {
  return {
    image: asset.previewImageUrl || "/placeholder.png",
    title: asset.name,
    author: asset.user?.name || "匿名用户",
    likes: asset.likeCount,
    href: `/gallery/${asset.id}`, // 跳转到详情页
  };
}

export default function ModelGallery() {
  // 状态管理
  const [models, setModels] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("latest");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 每次加载的数量
  const LIMIT = 20;

  /**
   * 加载模型数据
   * @param reset 是否重置列表（用于切换排序）
   */
  const loadModels = useCallback(
    async (reset = false) => {
      setLoading(true);
      setError(null);

      try {
        const currentOffset = reset ? 0 : offset;
        const response = await fetch(
          `/api/gallery/models?sortBy=${sortBy}&limit=${LIMIT}&offset=${currentOffset}`,
        );

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          // 更新模型列表
          setModels((prev) =>
            reset ? data.data.models : [...prev, ...data.data.models],
          );
          setHasMore(data.data.hasMore);
          setOffset(reset ? LIMIT : currentOffset + LIMIT);
        } else {
          throw new Error(data.error?.message || "加载失败");
        }
      } catch (err) {
        console.error("加载模型失败:", err);
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [sortBy, offset],
  );

  /**
   * 首次加载数据
   */
  useEffect(() => {
    loadModels(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅在首次渲染时执行

  /**
   * 切换排序方式
   */
  const handleSortChange = useCallback(
    (newSortBy: SortBy) => {
      setSortBy(newSortBy);
      setOffset(0);
      // 重新加载数据
      loadModels(true);
    },
    [loadModels],
  );

  /**
   * 加载更多
   */
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadModels(false);
    }
  }, [loading, hasMore, loadModels]);

  // 将模型数据映射为卡片数据
  const galleryItems = models.map((model) => ({
    id: model.id,
    ...mapUserAssetToGalleryCard(model),
  }));

  return (
    <section className="model-gallery">
      <div className="model-gallery__container">
        {/* 顶部标题和排序 */}
        <div className="model-gallery__header">
          <h2>模型画廊</h2>
          <div className="relative">
            <select
              className="model-gallery__filter"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortBy)}
            >
              <option value="latest">最新发布</option>
              <option value="popular">最受欢迎</option>
            </select>
          </div>
        </div>

        {/* 集合区域（保留 UI 占位） */}
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

        {/* 错误提示 */}
        {error && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-sm text-white/60">加载失败: {error}</p>
            <button
              type="button"
              className="mt-4 btn-primary"
              onClick={() => loadModels(true)}
            >
              重试
            </button>
          </div>
        )}

        {/* 模型网格 */}
        {!error && (
          <>
            {galleryItems.length > 0 ? (
              <div className="model-gallery__grid">
                {galleryItems.map((item) => (
                  <GalleryCard key={item.id} {...item} />
                ))}
              </div>
            ) : !loading ? (
              // 空状态
              <div className="text-center py-24">
                <div className="text-6xl mb-4">🎨</div>
                <p className="text-lg text-white/80 mb-2">暂无公开模型</p>
                <p className="text-sm text-white/50">
                  成为第一个发布作品的人吧
                </p>
              </div>
            ) : null}

            {/* 加载状态（首次加载） */}
            {loading && galleryItems.length === 0 && (
              <div className="model-gallery__grid">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div
                    key={`skeleton-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items don't have stable IDs
                      index
                    }`}
                    className="gallery-card animate-pulse"
                  >
                    <div className="gallery-card__media bg-white/5" />
                    <div className="gallery-card__meta">
                      <div className="h-4 bg-white/10 rounded mb-2" />
                      <div className="flex justify-between">
                        <div className="h-3 bg-white/5 rounded w-20" />
                        <div className="h-3 bg-white/5 rounded w-10" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 加载更多按钮 */}
            {hasMore && galleryItems.length > 0 && (
              <div className="model-gallery__more">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className={loading ? "opacity-50 cursor-not-allowed" : ""}
                >
                  {loading ? (
                    <>
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white mr-2" />
                      加载中...
                    </>
                  ) : (
                    "加载更多"
                  )}
                </button>
              </div>
            )}

            {/* 已加载全部 */}
            {!hasMore && galleryItems.length > 0 && (
              <div className="text-center py-8 text-sm text-white/50">
                已加载全部 {galleryItems.length} 个模型
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
