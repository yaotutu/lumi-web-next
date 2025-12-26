"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequestGet, apiRequestPost } from "@/lib/api-client";
import SkeletonCard from "@/components/ui/SkeletonCard";
import ModelDetailModal from "@/app/home/components/ModelDetailModal";
import GalleryCard from "@/app/home/components/GalleryCard";
import type { Model } from "@/types";
import { useUser } from "@/stores/auth-store";

/**
 * 收藏夹模块
 * 展示用户收藏的 3D 模型
 */
export default function Favorites() {
  const router = useRouter();
  const user = useUser();

  const [favorites, setFavorites] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "models" | "images">("all");
  const [error, setError] = useState<string | null>(null);

  // 模型详情弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // 交互状态管理（点赞/收藏）
  const [interactionStatuses, setInteractionStatuses] = useState<
    Record<string, { isLiked: boolean; isFavorited: boolean }>
  >({});

  // 加载收藏数据
  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      setError(null);

      // ✅ 使用 apiRequestGet,自动处理错误和 Toast
      const result = await apiRequestGet<Model[]>("/api/users/favorites", {
        autoToast: false, // 禁用自动 Toast,使用自定义错误 UI
      });

      if (result.success) {
        // 确保 data 是数组
        const favoritesArray = Array.isArray(result.data) ? result.data : [];
        setFavorites(favoritesArray);

        // 批量加载交互状态（如果用户已登录）
        if (user && favoritesArray.length > 0) {
          const modelIds = favoritesArray.map((m) => m.id);
          await loadInteractionStatuses(modelIds);
        }
      } else {
        // 失败时设置错误状态(用于显示错误 UI)
        setError(result.error.message);
      }

      setLoading(false);
    };

    fetchFavorites();
  }, [user]);

  /**
   * 批量加载用户的交互状态（点赞/收藏）
   */
  const loadInteractionStatuses = async (modelIds: string[]) => {
    if (modelIds.length === 0) {
      return;
    }

    try {
      // 🔥 可选认证：无论用户是否登录，都调用接口获取交互状态
      // 后端会根据 Token 自动判断是否返回用户特定的交互数据
      const result = await apiRequestPost<{
        isAuthenticated: boolean;
        interactions: Record<
          string,
          { isLiked: boolean; isFavorited: boolean }
        >;
      }>("/api/gallery/models/batch-interactions", { modelIds });

      if (result.success) {
        if (result.data.isAuthenticated) {
          // ✅ 已登录：使用后端返回的用户交互状态
          setInteractionStatuses(result.data.interactions);
        } else {
          // ⚠️ 未登录：清空交互状态（所有模型都显示为未点赞、未收藏）
          setInteractionStatuses({});
        }
      }
    } catch (err) {
      console.error("批量加载交互状态失败:", err);
    }
  };

  // 打开模型详情弹窗
  const handleView = (modelId: string) => {
    setSelectedModelId(modelId);
    setIsModalOpen(true);
  };

  // 关闭模型详情弹窗
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedModelId(null);
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">我的收藏</h2>
            <p className="mt-1 text-sm text-white/60">查看你收藏的内容</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // 渲染空状态
  if (error) {
    return (
      <div className="glass-panel py-16 text-center animate-fade-in">
        <div className="mb-4 text-6xl">⚠️</div>
        <h3 className="mb-2 text-lg font-semibold text-white">加载失败</h3>
        <p className="mb-4 text-sm text-white/60">{error}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-secondary px-4 py-2"
          >
            刷新页面
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="btn-primary px-4 py-2"
          >
            去模型广场
          </button>
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center py-16 animate-fade-in">
        <div className="mb-4 text-6xl">⭐</div>
        <h3 className="mb-2 text-lg font-semibold text-white">暂无收藏内容</h3>
        <p className="mb-6 text-sm text-white/60">
          去模型广场发现更多精彩作品吧!
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="btn-primary"
        >
          去逛逛
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题和筛选器 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">我的收藏</h2>
          <p className="mt-1 text-sm text-white/60">
            共收藏 {favorites.length} 个内容
          </p>
        </div>

        {/* 类型筛选 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              filter === "all"
                ? "border-yellow-1 bg-yellow-1/10 text-yellow-1"
                : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => setFilter("models")}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              filter === "models"
                ? "border-yellow-1 bg-yellow-1/10 text-yellow-1"
                : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            3D 模型
          </button>
          <button
            type="button"
            onClick={() => setFilter("images")}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              filter === "images"
                ? "border-yellow-1 bg-yellow-1/10 text-yellow-1"
                : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            图片
          </button>
        </div>
      </div>

      {/* 收藏网格 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {favorites.map((model) => (
          <div key={model.id} className="relative">
            {/* 使用 GalleryCard 显示模型 */}
            <GalleryCard
              modelId={model.id}
              image={model.previewImageUrl || "/placeholder.png"}
              title={model.name || "未命名模型"}
              author={model.user?.name || "未知作者"}
              likes={model.likeCount}
              favorites={model.favoriteCount || 0}
              onClick={handleView}
              initialInteractionStatus={interactionStatuses[model.id]}
            />
          </div>
        ))}
      </div>

      {/* 模型详情弹窗 */}
      <ModelDetailModal
        isOpen={isModalOpen}
        modelId={selectedModelId}
        onClose={handleCloseModal}
      />
    </div>
  );
}
