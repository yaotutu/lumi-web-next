"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiGet } from "@/lib/api-client";
import SkeletonCard from "@/components/ui/SkeletonCard";
import type { Model } from "@/types";

/**
 * 收藏夹模块
 * 展示用户收藏的 3D 模型
 */
export default function Favorites() {
	const router = useRouter();
	const [favorites, setFavorites] = useState<Model[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<"all" | "models" | "images">("all");
	const [error, setError] = useState<string | null>(null);

	// 加载收藏数据
	useEffect(() => {
		const fetchFavorites = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await apiGet("/api/users/favorites");
				const data = await response.json();

				// biome-ignore lint/suspicious/noExplicitAny: API 返回类型不确定
				if (data.status === "success") {
					// 确保 data.data 是数组
					const favoritesArray = Array.isArray(data.data) ? data.data : [];
					setFavorites(favoritesArray);
				} else {
					setError("加载收藏失败");
				}
			} catch (err) {
				console.error("加载收藏夹失败:", err);
				const errorMessage = err instanceof Error ? err.message : "加载收藏失败,请稍后重试";
				setError(errorMessage);
			} finally {
				setLoading(false);
			}
		};

		fetchFavorites();
	}, []);

	// 取消收藏
	const handleUnfavorite = async (modelId: string) => {
		try {
			// TODO: 调用取消收藏 API
			setFavorites((prev) => prev.filter((m) => m.id !== modelId));
		} catch (error) {
			console.error("取消收藏失败:", error);
		}
	};

	// 查看模型详情
	const handleView = (modelId: string) => {
		router.push(`/gallery/${modelId}`);
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
				<p className="mb-6 text-sm text-white/60">去模型广场发现更多精彩作品吧!</p>
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
					<div
						key={model.id}
						className="gallery-card group relative overflow-hidden transition-all hover:scale-[1.02]"
					>
						{/* 模型预览图 */}
						<div className="relative aspect-square w-full overflow-hidden">
							{model.previewImageUrl ? (
								<Image
									src={model.previewImageUrl}
									alt={model.name || "未命名模型"}
									fill
									className="object-cover transition-transform group-hover:scale-105"
								/>
							) : (
								<div className="flex h-full items-center justify-center bg-gradient-to-br from-white/5 to-[#0d0d0d]">
									<span className="text-4xl">🎨</span>
								</div>
							)}

							{/* 渐变遮罩 */}
							<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

							{/* 悬停操作按钮 */}
							<div className="absolute inset-x-0 bottom-0 translate-y-full p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => handleView(model.id)}
										className="flex-1 rounded-lg bg-yellow-1 py-2 text-center text-sm font-semibold text-black transition-all hover:bg-yellow-1/90"
									>
										查看详情
									</button>
									<button
										type="button"
										onClick={() => handleUnfavorite(model.id)}
										className="rounded-lg bg-red-500/80 px-3 py-2 text-white transition-all hover:bg-red-500"
										title="取消收藏"
									>
										<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							</div>
						</div>

						{/* 模型信息 */}
						<div className="p-4">
							<h3 className="mb-2 line-clamp-2 text-sm font-medium text-white">
								{model.name || "未命名模型"}
							</h3>

							{model.description && (
								<p className="mb-3 line-clamp-2 text-xs text-white/60">
									{model.description}
								</p>
							)}

							{/* 统计数据 */}
							<div className="flex items-center gap-3 text-xs text-white/50">
								<span className="flex items-center gap-1">
									<svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
										<path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
									</svg>
									{model.likeCount}
								</span>
								<span className="flex items-center gap-1">
									<svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
										<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
										<path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
									</svg>
									{model.viewCount}
								</span>
							</div>
						</div>

						{/* 收藏标记 */}
						<div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-1 text-black shadow-lg">
							<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
								<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539 1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
							</svg>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
