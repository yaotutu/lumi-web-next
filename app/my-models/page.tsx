"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  apiRequestGet,
  apiRequestDelete,
  apiRequestPatch,
} from "@/lib/api-client";
import type { Model } from "@/types";
import SkeletonCard from "@/components/ui/SkeletonCard";
import { NoModelsEmptyState } from "@/components/ui/EmptyState";
import Navigation from "@/components/layout/Navigation";
import { useModal } from "@/app/home/hooks/useModal";
import ModelDetailModal from "@/app/home/components/ModelDetailModal";
import { toast } from "@/lib/toast";
import { useUser } from "@/stores/auth-store";
import GalleryCard from "@/app/home/components/GalleryCard";

/**
 * 我的模型管理页面
 * 功能：展示、筛选、编辑、删除用户创建的 3D 模型
 */
export default function MyModelsPage() {
  const router = useRouter();
  const user = useUser();

  // ==================== 弹窗状态管理 ====================
  const { isOpen, currentModelId, openModal, closeModal } = useModal();

  // ==================== 状态管理 ====================
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [publicCount, setPublicCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // 交互状态管理（点赞/收藏）
  const [interactionStatuses, setInteractionStatuses] = useState<
    Record<string, { isLiked: boolean; isFavorited: boolean }>
  >({});

  // 筛选和排序状态
  const [visibilityFilter, setVisibilityFilter] = useState<
    "all" | "PUBLIC" | "PRIVATE"
  >("all");
  const [sortBy, setSortBy] = useState<"latest" | "name" | "popular">("latest");

  // ==================== 数据加载 ====================
  /**
   * 加载用户模型列表
   */
  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (visibilityFilter !== "all")
        params.append("visibility", visibilityFilter);
      if (sortBy !== "latest") params.append("sortBy", sortBy);
      params.append("limit", "20");
      params.append("offset", "0");

      const result = await apiRequestGet<{
        items: Model[];
        total: number;
        publicCount: number;
        hasMore: boolean;
      }>(`/api/users/models?${params.toString()}`);

      if (result.success) {
        const modelList = result.data.items;
        setModels(modelList);
        setTotalCount(result.data.total);
        setPublicCount(result.data.publicCount);
        setHasMore(result.data.hasMore);

        // 批量加载交互状态（如果用户已登录）
        if (user && modelList.length > 0) {
          const modelIds = modelList.map((m) => m.id);
          await loadInteractionStatuses(modelIds);
        }
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
      console.error("加载模型列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    fetchModels();
  }, [visibilityFilter, sortBy, user]);

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

  // ==================== 操作处理 ====================
  /**
   * 删除模型
   */
  const handleDelete = async (modelId: string, modelName: string) => {
    // 二次确认
    const confirmed = window.confirm(
      `确定要删除模型 "${modelName}" 吗？此操作不可恢复。`,
    );
    if (!confirmed) return;

    try {
      const result = await apiRequestDelete(`/api/models/${modelId}`);

      if (result.success) {
        // 从列表中移除（乐观更新）
        setModels((prev) => prev.filter((m) => m.id !== modelId));
        setTotalCount((prev) => prev - 1);
        toast.success("删除成功");
      } else {
        toast.error(`删除失败: ${result.error.message}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除失败";
      toast.error(`删除失败: ${message}`);
      console.error("删除模型失败:", err);
    }
  };

  /**
   * 切换模型可见性
   */
  const handleToggleVisibility = async (
    modelId: string,
    currentVisibility: "PUBLIC" | "PRIVATE",
  ) => {
    const newVisibility = currentVisibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    const actionText = newVisibility === "PUBLIC" ? "发布" : "设为私有";

    try {
      const result = await apiRequestPatch(
        `/api/models/${modelId}/visibility`,
        {
          visibility: newVisibility,
        },
      );

      if (result.success) {
        // 更新本地状态
        setModels((prev) =>
          prev.map((m) =>
            m.id === modelId
              ? {
                  ...m,
                  visibility: newVisibility,
                  publishedAt:
                    newVisibility === "PUBLIC"
                      ? new Date().toISOString()
                      : null,
                }
              : m,
          ),
        );

        // 更新统计数据
        if (newVisibility === "PUBLIC") {
          setPublicCount((prev) => prev + 1);
        } else {
          setPublicCount((prev) => prev - 1);
        }

        toast.success(`${actionText}成功`);
      } else {
        toast.error(`${actionText}失败: ${result.error.message}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "操作失败";
      toast.error(`${actionText}失败: ${message}`);
      console.error("切换可见性失败:", err);
    }
  };

  /**
   * 查看模型详情（打开弹窗）
   */
  const handleView = (modelId: string) => {
    // 打开模型详情弹窗（复用模型广场的预览功能）
    openModal(modelId);
  };

  // ==================== 渲染辅助函数 ====================
  /**
   * 获取可见性标签样式
   */
  const getVisibilityBadge = (visibility: "PUBLIC" | "PRIVATE") => {
    if (visibility === "PUBLIC") {
      return "bg-green-500/20 text-green-500";
    }
    return "bg-white/10 text-white/60";
  };

  /**
   * 获取可见性文本
   */
  const getVisibilityText = (visibility: "PUBLIC" | "PRIVATE") => {
    return visibility === "PUBLIC" ? "已发布" : "私有";
  };

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // ==================== 主渲染 ====================
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#000000] text-white">
      {/* 顶部导航栏 */}
      <Navigation />

      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          {/* ==================== 页面头部 ==================== */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">我的模型</h1>
              <p className="mt-1 text-sm text-white/60">
                管理你生成的所有 3D 模型
              </p>
            </div>

            {/* 统计信息 */}
            <div className="flex gap-4">
              <div className="glass-panel px-4 py-2">
                <span className="text-white/60 text-sm">总模型数：</span>
                <span className="font-semibold text-white">{totalCount}</span>
              </div>
              <div className="glass-panel px-4 py-2">
                <span className="text-white/60 text-sm">已发布：</span>
                <span className="font-semibold text-green-500">
                  {publicCount}
                </span>
              </div>
            </div>
          </div>

          {/* ==================== 筛选和排序栏 ==================== */}
          <div className="mb-6 flex items-center gap-4">
            {/* 可见性筛选 */}
            <select
              value={visibilityFilter}
              onChange={(e) =>
                setVisibilityFilter(
                  e.target.value as "all" | "PUBLIC" | "PRIVATE",
                )
              }
              className="model-gallery__filter rounded-lg bg-[#0d0d0d] border border-white/10 px-4 py-2 text-sm text-white focus:border-yellow-1/50 focus:outline-none"
            >
              <option value="all">全部</option>
              <option value="PUBLIC">已发布</option>
              <option value="PRIVATE">私有</option>
            </select>

            {/* 排序方式 */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "latest" | "name" | "popular")
              }
              className="model-gallery__filter rounded-lg bg-[#0d0d0d] border border-white/10 px-4 py-2 text-sm text-white focus:border-yellow-1/50 focus:outline-none"
            >
              <option value="latest">最新创建</option>
              <option value="name">名称</option>
              <option value="popular">最受欢迎</option>
            </select>
          </div>

          {/* ==================== 内容区域 ==================== */}
          {loading ? (
            // 骨架屏加载状态
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            // 错误状态
            <div className="text-center py-12">
              <div className="mb-4 text-4xl">⚠️</div>
              <p className="text-sm text-white/60 mb-4">加载失败: {error}</p>
              <button
                type="button"
                className="btn-primary"
                onClick={fetchModels}
              >
                重试
              </button>
            </div>
          ) : models.length === 0 ? (
            // 空状态
            <NoModelsEmptyState
              onCreateClick={() => router.push("/workspace")}
            />
          ) : (
            // 模型网格
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {models.map((model) => (
                <div key={model.id} className="relative">
                  {/* 使用 GalleryCard 显示模型 */}
                  <GalleryCard
                    modelId={model.id}
                    image={model.previewImageUrl || "/placeholder.png"}
                    title={model.name || "未命名模型"}
                    author={model.user?.name || "我"}
                    likes={model.likeCount}
                    favorites={model.favoriteCount || 0}
                    onClick={handleView}
                    initialInteractionStatus={interactionStatuses[model.id]}
                  />

                  {/* 额外的管理按钮（发布/删除） */}
                  <div className="absolute right-2 top-2 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(model.id, model.visibility);
                      }}
                      className={`rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                        model.visibility === "PUBLIC"
                          ? "bg-white/10 text-white/80 hover:bg-white/20"
                          : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                      }`}
                    >
                      {model.visibility === "PUBLIC" ? "私有" : "发布"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(model.id, model.name || "未命名模型");
                      }}
                      className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500 transition-all hover:bg-red-500/20"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ==================== 加载更多按钮 ==================== */}
          {!loading && hasMore && models.length > 0 && (
            <div className="mt-8 text-center">
              <button
                type="button"
                className="btn-primary"
                disabled={loading}
                onClick={() => {}}
              >
                {loading ? "加载中..." : "加载更多"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==================== 模型详情弹窗（复用模型广场的预览功能） ==================== */}
      <ModelDetailModal
        isOpen={isOpen}
        modelId={currentModelId}
        onClose={closeModal}
      />
    </div>
  );
}
