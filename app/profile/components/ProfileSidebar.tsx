"use client";

import { useState } from "react";

/**
 * 侧边栏导航项类型
 */
type TabType = "info" | "history" | "favorites" | "settings";

interface NavItem {
	id: TabType;
	label: string;
	icon: string;
}

// 导航菜单配置
const NAV_ITEMS: NavItem[] = [
	{ id: "info", label: "个人资料", icon: "👤" },
	{ id: "history", label: "创作历史", icon: "🎨" },
	{ id: "favorites", label: "收藏夹", icon: "⭐" },
	{ id: "settings", label: "账户设置", icon: "⚙️" },
];

interface ProfileSidebarProps {
	activeTab: TabType;
	onTabChange: (tab: TabType) => void;
}

/**
 * 个人中心侧边栏导航组件
 */
export default function ProfileSidebar({ activeTab, onTabChange }: ProfileSidebarProps) {
	return (
		<aside className="hidden w-60 border-r border-white/10 md:block">
			<div className="flex h-full flex-col">
				{/* 标题 */}
				<div className="border-b border-white/10 p-6">
					<h1 className="text-xl font-bold text-white">个人中心</h1>
					<p className="mt-1 text-sm text-white/60">管理你的账户和内容</p>
				</div>

				{/* 导航菜单 */}
				<nav className="flex-1 overflow-y-auto p-4">
					<ul className="space-y-1">
						{NAV_ITEMS.map((item) => {
							const isActive = activeTab === item.id;

							return (
								<li key={item.id}>
									<button
										type="button"
										onClick={() => onTabChange(item.id)}
										className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
											isActive
												? "bg-yellow-1/10 text-yellow-1"
												: "text-white/70 hover:bg-white/5 hover:text-white"
										}`}
									>
										<span className="text-base">{item.icon}</span>
										<span>{item.label}</span>

										{/* 选中指示器 */}
										{isActive && (
											<span className="ml-auto h-2 w-2 rounded-full bg-yellow-1" />
										)}
									</button>
								</li>
							);
						})}
					</ul>
				</nav>
			</div>
		</aside>
	);
}

/**
 * 移动端顶部横向滚动导航组件
 */
export function ProfileMobileNav({ activeTab, onTabChange }: ProfileSidebarProps) {
	return (
		<div className="border-b border-white/10 md:hidden">
			{/* 标题 */}
			<div className="border-b border-white/10 p-4">
				<h1 className="text-lg font-bold text-white">个人中心</h1>
			</div>

			{/* 横向滚动导航 */}
			<nav className="flex gap-2 overflow-x-auto p-4 scrollbar-hide">
				{NAV_ITEMS.map((item) => {
					const isActive = activeTab === item.id;

					return (
						<button
							key={item.id}
							type="button"
							onClick={() => onTabChange(item.id)}
							className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
								isActive
									? "border-yellow-1 bg-yellow-1/10 text-yellow-1"
									: "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
							}`}
						>
							<span>{item.icon}</span>
							<span>{item.label}</span>
						</button>
					);
				})}
			</nav>
		</div>
	);
}
