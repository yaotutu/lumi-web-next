'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiRequestGet, apiRequestDelete, apiRequestPatch } from '@/lib/api-client';
import type { Model } from '@/types';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { NoModelsEmptyState } from '@/components/ui/EmptyState';
import Navigation from '@/components/layout/Navigation';
import { useModal } from '@/app/home/hooks/useModal';
import ModelDetailModal from '@/app/home/components/ModelDetailModal';

/**
 * 我的模型管理页面
 * 功能：展示、筛选、编辑、删除用户创建的 3D 模型
 */
export default function MyModelsPage() {
	const router = useRouter();

	// ==================== 弹窗状态管理 ====================
	const { isOpen, currentModelId, openModal, closeModal } = useModal();

	// ==================== 状态管理 ====================
	const [models, setModels] = useState<Model[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [totalCount, setTotalCount] = useState(0);
	const [publicCount, setPublicCount] = useState(0);
	const [hasMore, setHasMore] = useState(false);

	// 筛选和排序状态
	const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'PUBLIC' | 'PRIVATE'>('all');
	const [sortBy, setSortBy] = useState<'latest' | 'name' | 'popular'>('latest');

	// ==================== 数据加载 ====================
	/**
	 * 加载用户模型列表
	 */
	const fetchModels = async () => {
		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams();
			if (visibilityFilter !== 'all') params.append('visibility', visibilityFilter);
			if (sortBy !== 'latest') params.append('sortBy', sortBy);
			params.append('limit', '20');
			params.append('offset', '0');

			const result = await apiRequestGet<{
				items: Model[];
				total: number;
				publicCount: number;
				hasMore: boolean;
			}>(`/api/users/models?${params.toString()}`);

			if (result.success) {
				setModels(result.data.items);
				setTotalCount(result.data.total);
				setPublicCount(result.data.publicCount);
				setHasMore(result.data.hasMore);
			} else {
				setError(result.error.message);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : '加载失败';
			setError(message);
			console.error('加载模型列表失败:', err);
		} finally {
			setLoading(false);
		}
	};

	// 组件挂载时加载数据
	useEffect(() => {
		fetchModels();
	}, [visibilityFilter, sortBy]);

	// ==================== 操作处理 ====================
	/**
	 * 删除模型
	 */
	const handleDelete = async (modelId: string, modelName: string) => {
		// 二次确认
		const confirmed = window.confirm(`确定要删除模型 "${modelName}" 吗？此操作不可恢复。`);
		if (!confirmed) return;

		try {
			const result = await apiRequestDelete(`/api/models/${modelId}`);

			if (result.success) {
				// 从列表中移除（乐观更新）
				setModels((prev) => prev.filter((m) => m.id !== modelId));
				setTotalCount((prev) => prev - 1);
				alert('删除成功');
			} else {
				alert(`删除失败: ${result.error.message}`);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : '删除失败';
			alert(`删除失败: ${message}`);
			console.error('删除模型失败:', err);
		}
	};

	/**
	 * 切换模型可见性
	 */
	const handleToggleVisibility = async (modelId: string, currentVisibility: 'PUBLIC' | 'PRIVATE') => {
		const newVisibility = currentVisibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
		const actionText = newVisibility === 'PUBLIC' ? '发布' : '设为私有';

		try {
			const result = await apiRequestPatch(`/api/models/${modelId}/visibility`, {
				visibility: newVisibility,
			});

			if (result.success) {
				// 更新本地状态
				setModels((prev) =>
					prev.map((m) =>
						m.id === modelId
							? { ...m, visibility: newVisibility, publishedAt: newVisibility === 'PUBLIC' ? new Date().toISOString() : null }
							: m,
					),
				);

				// 更新统计数据
				if (newVisibility === 'PUBLIC') {
					setPublicCount((prev) => prev + 1);
				} else {
					setPublicCount((prev) => prev - 1);
				}

				alert(`${actionText}成功`);
			} else {
				alert(`${actionText}失败: ${result.error.message}`);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : '操作失败';
			alert(`${actionText}失败: ${message}`);
			console.error('切换可见性失败:', err);
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
	const getVisibilityBadge = (visibility: 'PUBLIC' | 'PRIVATE') => {
		if (visibility === 'PUBLIC') {
			return 'bg-green-500/20 text-green-500';
		}
		return 'bg-white/10 text-white/60';
	};

	/**
	 * 获取可见性文本
	 */
	const getVisibilityText = (visibility: 'PUBLIC' | 'PRIVATE') => {
		return visibility === 'PUBLIC' ? '已发布' : '私有';
	};

	/**
	 * 格式化文件大小
	 */
	const formatFileSize = (bytes: number | null) => {
		if (!bytes) return '-';
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
							<p className="mt-1 text-sm text-white/60">管理你生成的所有 3D 模型</p>
						</div>

						{/* 统计信息 */}
						<div className="flex gap-4">
							<div className="glass-panel px-4 py-2">
								<span className="text-white/60 text-sm">总模型数：</span>
								<span className="font-semibold text-white">{totalCount}</span>
							</div>
							<div className="glass-panel px-4 py-2">
								<span className="text-white/60 text-sm">已发布：</span>
								<span className="font-semibold text-green-500">{publicCount}</span>
							</div>
						</div>
					</div>

					{/* ==================== 筛选和排序栏 ==================== */}
					<div className="mb-6 flex items-center gap-4">
						{/* 可见性筛选 */}
						<select
							value={visibilityFilter}
							onChange={(e) => setVisibilityFilter(e.target.value as 'all' | 'PUBLIC' | 'PRIVATE')}
							className="model-gallery__filter rounded-lg bg-[#0d0d0d] border border-white/10 px-4 py-2 text-sm text-white focus:border-yellow-1/50 focus:outline-none"
						>
							<option value="all">全部</option>
							<option value="PUBLIC">已发布</option>
							<option value="PRIVATE">私有</option>
						</select>

						{/* 排序方式 */}
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as 'latest' | 'name' | 'popular')}
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
							<button type="button" className="btn-primary" onClick={fetchModels}>
								重试
							</button>
						</div>
					) : models.length === 0 ? (
						// 空状态
						<NoModelsEmptyState onCreateClick={() => router.push('/workspace')} />
					) : (
						// 模型网格
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{models.map((model) => (
								<ModelCard
									key={model.id}
									model={model}
									onView={handleView}
									onDelete={handleDelete}
									onToggleVisibility={handleToggleVisibility}
									getVisibilityBadge={getVisibilityBadge}
									getVisibilityText={getVisibilityText}
									formatFileSize={formatFileSize}
								/>
							))}
						</div>
					)}

					{/* ==================== 加载更多按钮 ==================== */}
					{!loading && hasMore && models.length > 0 && (
						<div className="mt-8 text-center">
							<button type="button" className="btn-primary" disabled={loading} onClick={() => {}}>
								{loading ? '加载中...' : '加载更多'}
							</button>
						</div>
					)}
				</div>
			</div>

			{/* ==================== 模型详情弹窗（复用模型广场的预览功能） ==================== */}
			<ModelDetailModal isOpen={isOpen} modelId={currentModelId} onClose={closeModal} />
		</div>
	);
}

/**
 * 模型卡片组件
 */
interface ModelCardProps {
	model: Model;
	onView: (modelId: string) => void;
	onDelete: (modelId: string, modelName: string) => void;
	onToggleVisibility: (modelId: string, currentVisibility: 'PUBLIC' | 'PRIVATE') => void;
	getVisibilityBadge: (visibility: 'PUBLIC' | 'PRIVATE') => string;
	getVisibilityText: (visibility: 'PUBLIC' | 'PRIVATE') => string;
	formatFileSize: (bytes: number | null) => string;
}

function ModelCard({
	model,
	onView,
	onDelete,
	onToggleVisibility,
	getVisibilityBadge,
	getVisibilityText,
	formatFileSize,
}: ModelCardProps) {
	return (
		<div className="glass-panel group overflow-hidden transition-all hover:border-yellow-1/30">
			{/* ==================== 模型预览图 ==================== */}
			<div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-white/5 to-[#0d0d0d]">
				{model.previewImageUrl ? (
					<Image src={model.previewImageUrl} alt={model.name} fill className="object-cover transition-transform group-hover:scale-105" />
				) : (
					<div className="flex h-full items-center justify-center">
						<span className="text-4xl">🎨</span>
					</div>
				)}

				{/* 可见性标签 */}
				<div className={`absolute right-2 top-2 rounded-lg px-2 py-1 text-xs font-medium ${getVisibilityBadge(model.visibility)}`}>
					{getVisibilityText(model.visibility)}
				</div>
			</div>

			{/* ==================== 模型信息 ==================== */}
			<div className="p-4">
				<h3 className="mb-2 line-clamp-2 text-sm font-medium text-white">{model.name || '未命名模型'}</h3>

				{model.description && (
					<p className="mb-3 line-clamp-2 text-xs text-white/60">{model.description}</p>
				)}

				{/* 统计数据 */}
				<div className="mb-3 flex items-center gap-3 text-xs text-white/50">
					<span className="flex items-center gap-1">
						👁 {model.viewCount}
					</span>
					<span className="flex items-center gap-1">
						❤️ {model.likeCount}
					</span>
					<span className="flex items-center gap-1">
						📥 {model.downloadCount}
					</span>
				</div>

				{/* 元数据 */}
				<div className="mb-3 flex items-center gap-3 text-xs text-white/50">
					<span>{model.format}</span>
					<span>•</span>
					<span>{formatFileSize(model.fileSize)}</span>
				</div>

				{/* 创建时间 */}
				<div className="text-xs text-white/40">{new Date(model.createdAt).toLocaleString('zh-CN')}</div>
			</div>

			{/* ==================== 操作按钮 ==================== */}
			<div className="border-t border-white/10 p-3 flex gap-2">
				<button
					type="button"
					onClick={() => onView(model.id)}
					className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-medium text-white/80 transition-all hover:bg-white/20"
				>
					查看
				</button>
				<button
					type="button"
					onClick={() => onToggleVisibility(model.id, model.visibility)}
					className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
						model.visibility === 'PUBLIC'
							? 'bg-white/5 text-white/80 hover:bg-white/10'
							: 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
					}`}
				>
					{model.visibility === 'PUBLIC' ? '设为私有' : '发布'}
				</button>
				<button
					type="button"
					onClick={() => onDelete(model.id, model.name || '未命名模型')}
					className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500 transition-all hover:bg-red-500/20"
				>
					删除
				</button>
			</div>
		</div>
	);
}
