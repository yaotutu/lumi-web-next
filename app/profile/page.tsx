"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import ProfileSidebar from "./components/ProfileSidebar";
import ProfileInfo from "./components/ProfileInfo";
import CreationHistory from "./components/CreationHistory";
import Favorites from "./components/Favorites";
import AccountSettings from "./components/AccountSettings";
// 认证状态管理
import { useIsAuthenticated, useIsLoaded } from "@/stores/auth-store";
// 登录弹窗管理
import { loginModalActions } from "@/stores/login-modal-store";

/**
 * 个人中心页面
 * 包含 4 个模块:个人资料、创作历史、收藏夹、账户设置
 */
export default function ProfilePage() {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<"info" | "history" | "favorites" | "settings">("info");

	// 认证状态
	const isAuthenticated = useIsAuthenticated();
	const isAuthLoaded = useIsLoaded();

	// 检查登录状态:未登录时自动弹出登录弹窗
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	if (isAuthLoaded && !isAuthenticated) {
		loginModalActions.open("profile");
	}

	// 渲染当前选中的内容
	const renderContent = () => {
		switch (activeTab) {
			case "info":
				return <ProfileInfo />;
			case "history":
				return <CreationHistory />;
			case "favorites":
				return <Favorites />;
			case "settings":
				return <AccountSettings />;
			default:
				return <ProfileInfo />;
		}
	};

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-[#000000] text-white">
			{/* 顶部导航栏 */}
			<Navigation />

			{/* 主内容区域 */}
			<div className="flex flex-1 overflow-hidden">
				{/* 左侧边栏导航 */}
				<ProfileSidebar activeTab={activeTab} onTabChange={setActiveTab} />

				{/* 右侧内容区 */}
				<div className="flex-1 overflow-y-auto p-6">
					<div className="mx-auto max-w-5xl">{renderContent()}</div>
				</div>
			</div>
		</div>
	);
}
