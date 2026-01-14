"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequestGet, apiRequestPost } from "@/lib/api-client";
import { useUser, useIsLoaded } from "@/stores/auth-store";
import { useModal } from "../hooks/useModal";
import { useScrollReveal } from "../hooks/useScrollReveal";
import type { GalleryCardProps } from "./GalleryCard";
import GalleryCard from "./GalleryCard";
import ModelDetailModal from "./ModelDetailModal";
import SkeletonCard from "@/components/ui/SkeletonCard";

// UserAsset 类型（从 API 返回）
type UserAsset = {
  id: string;
  name: string;
  previewImageUrl: string | null;
  likeCount: number;
  favoriteCount: number;
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
function mapUserAssetToGalleryCard(
  asset: UserAsset,
  onCardClick: (modelId: string) => void,
  interactionStatuses?: Record<
    string,
    { isLiked: boolean; isFavorited: boolean }
  >,
): GalleryCardProps {
  const status = interactionStatuses?.[asset.id];

  return {
    modelId: asset.id,
    image: asset.previewImageUrl || "/placeholder.png",
    title: asset.name,
    author: asset.user?.name || "匿名用户",
    likes: asset.likeCount,
    favorites: asset.favoriteCount,
    onClick: onCardClick, // 使用点击回调而不是 href
    initialInteractionStatus: status
      ? {
          isLiked: status.isLiked,
          isFavorited: status.isFavorited,
        }
      : undefined,
  };
}

export default function ModelGallery() {
  // 弹窗状态管理
  const { isOpen, currentModelId, openModal, closeModal } = useModal();

  // 滚动显示动画
  const { ref: galleryRef, isVisible } = useScrollReveal({ threshold: 0.1 });

  // 认证状态
  const user = useUser();
  const isLoaded = useIsLoaded();

  // 状态管理
  const [models, setModels] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("latest");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [interactionStatuses, setInteractionStatuses] = useState<
    Record<string, { isLiked: boolean; isFavorited: boolean }>
  >({});

  // 每次加载的数量
  const LIMIT = 20;

  /**
   * 处理模型卡片点击事件
   * @param modelId 模型ID
   */
  const handleCardClick = useCallback(
    (modelId: string) => {
      openModal(modelId);
    },
    [openModal],
  );

  /**
   * 批量加载用户的交互状态
   * @param modelIds 模型ID数组
   */
  const loadInteractionStatuses = useCallback(
    async (modelIds: string[]) => {
      console.log("🔍 [批量加载交互状态] 开始", {
        hasUser: !!user,
        userId: user?.id,
        modelIdsCount: modelIds.length,
        modelIds: modelIds.slice(0, 3), // 只显示前3个
      });

      // 🔥 可选认证：无论用户是否登录，都调用接口获取交互状态
      // 后端会根据 Token 自动判断是否返回用户特定的交互数据
      console.log("📤 [批量加载交互状态] 发送请求", {
        url: "/api/gallery/models/batch-interactions",
        modelIds,
      });

      const result = await apiRequestPost<{
        isAuthenticated: boolean;
        interactions: Record<
          string,
          { isLiked: boolean; isFavorited: boolean }
        >;
      }>("/api/gallery/models/batch-interactions", { modelIds });

      console.log("📥 [批量加载交互状态] 收到响应", {
        success: result.success,
      });

      if (result.success) {
        console.log("✅ [批量加载交互状态] 成功", {
          isAuthenticated: result.data.isAuthenticated,
          interactionsCount: Object.keys(result.data.interactions).length,
        });

        if (result.data.isAuthenticated) {
          // ✅ 已登录：使用后端返回的用户交互状态
          setInteractionStatuses(result.data.interactions);
        } else {
          // ⚠️ 未登录：清空交互状态（所有模型都显示为未点赞、未收藏）
          setInteractionStatuses({});
        }
      } else {
        console.error("❌ [批量加载交互状态] 失败:", result.error.message);
      }
    },
    [user], // 🔥 保留 user 依赖（虽然逻辑上不需要判断，但保留用于日志调试）
  );

  /**
   * 加载模型数据
   * @param reset 是否重置列表（用于切换排序）
   */
  const loadModels = useCallback(
    async (reset = false) => {
      setLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;
      const result = await apiRequestGet<{
        items: UserAsset[];
        hasMore: boolean;
      }>(
        `/api/gallery/models?sortBy=${sortBy}&limit=${LIMIT}&offset=${currentOffset}`,
      );

      if (result.success) {
        const galleryData = result.data;

        // 调试：检查 galleryData 和 items
        console.log("🔍 galleryData:", galleryData);
        console.log("🔍 galleryData.items:", galleryData.items);

        const newModels = galleryData.items || []; // 防御性：如果 items 不存在则使用空数组

        // 更新模型列表
        setModels((prev) => (reset ? newModels : [...prev, ...newModels]));
        setHasMore(galleryData.hasMore);
        setOffset(reset ? LIMIT : currentOffset + LIMIT);

        // 批量加载交互状态
        if (newModels.length > 0) {
          const modelIds = newModels.map((model: UserAsset) => model.id);
          await loadInteractionStatuses(modelIds);
        }
      } else {
        console.error("加载模型失败:", result.error.message);
        setError(result.error.message);
      }

      setLoading(false);
    },
    [sortBy, offset, loadInteractionStatuses],
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
    ...mapUserAssetToGalleryCard(model, handleCardClick, interactionStatuses),
  }));

  return (
    <section className="model-gallery" ref={galleryRef}>
      <div
        className={`model-gallery__container transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
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
                  <SkeletonCard
                    key={`skeleton-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items don't have stable IDs
                      index
                    }`}
                  />
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

        {/* 模型详情弹窗 */}
        <ModelDetailModal
          isOpen={isOpen}
          modelId={currentModelId}
          onClose={closeModal}
        />
      </div>
    </section>
  );
}
