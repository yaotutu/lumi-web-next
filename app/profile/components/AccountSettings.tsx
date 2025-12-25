"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/stores/auth-store";
import { authActions } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

/**
 * 账户设置模块
 * 包含:基本信息、安全设置、隐私设置、危险操作
 */
export default function AccountSettings() {
	const router = useRouter();
	const user = useUser();
	const [isLoading, setIsLoading] = useState(false);

	// 表单状态 - 使用空字符串初始化,避免 hydration 错误
	const [name, setName] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	// 当 user 数据加载后,同步到表单状态
	useEffect(() => {
		if (user) {
			setName(user.name || "");
		}
	}, [user]);

	// 设置状态
	const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
	const [profileVisibility, setProfileVisibility] = useState<"private" | "public">("private");
	const [modelVisibility, setModelVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");

	// 修改用户名
	const handleUpdateName = async () => {
		if (!name.trim()) {
			alert("用户名不能为空");
			return;
		}

		setIsLoading(true);
		// TODO: 调用 API 更新用户名
		setTimeout(() => {
			setIsLoading(false);
			alert("用户名修改成功");
		}, 1000);
	};

	// 修改密码
	const handleUpdatePassword = async () => {
		if (!currentPassword || !newPassword || !confirmPassword) {
			alert("请填写完整的密码信息");
			return;
		}

		if (newPassword !== confirmPassword) {
			alert("两次输入的密码不一致");
			return;
		}

		if (newPassword.length < 6) {
			alert("新密码长度至少为 6 位");
			return;
		}

		setIsLoading(true);
		// TODO: 调用 API 修改密码
		setTimeout(() => {
			setIsLoading(false);
			alert("密码修改成功");
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		}, 1000);
	};

	// 切换两步验证
	const handleToggleTwoFactor = async () => {
		setIsLoading(true);
		// TODO: 调用 API 切换两步验证
		setTimeout(() => {
			setTwoFactorEnabled(!twoFactorEnabled);
			setIsLoading(false);
			alert(!twoFactorEnabled ? "两步验证已开启" : "两步验证已关闭");
		}, 1000);
	};

	// 注销账号
	const handleDeleteAccount = async () => {
		const confirmed = window.confirm(
			"确定要注销账号吗?此操作不可恢复,所有数据将被永久删除。",
		);

		if (!confirmed) return;

		const doubleConfirmed = window.confirm(
			"这是最后一次确认!注销后无法找回任何数据,确定要继续吗?",
		);

		if (!doubleConfirmed) return;

		setIsLoading(true);
		// TODO: 调用 API 注销账号
		setTimeout(() => {
			setIsLoading(false);
			alert("账号已注销");
			authActions.resetAuth();
			router.push("/");
		}, 1000);
	};

	return (
		<div className="space-y-6 animate-fade-in">
			{/* 页面标题 */}
			<div>
				<h2 className="text-2xl font-bold text-white">账户设置</h2>
				<p className="mt-1 text-sm text-white/60">管理你的账户安全和隐私</p>
			</div>

			{/* 基本信息 */}
			<div className="glass-panel">
				<div className="border-b border-white/10 p-4">
					<h3 className="text-lg font-semibold text-white">基本信息</h3>
				</div>
				<div className="p-4 space-y-4">
					{/* 用户名 */}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<span className="w-32 shrink-0 text-sm font-medium text-white/60">用户名</span>
						<div className="flex flex-1 gap-2">
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="flex-1 rounded-lg border border-white/10 bg-[#242424] px-4 py-2 text-sm text-white focus:border-yellow-1 focus:outline-none"
								placeholder="请输入用户名"
							/>
							<button
								type="button"
								onClick={handleUpdateName}
								disabled={isLoading}
								className="btn-secondary px-4 py-2 whitespace-nowrap"
							>
								{isLoading ? "保存中..." : "修改"}
							</button>
						</div>
					</div>

					{/* 邮箱 (只读) */}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<span className="w-32 shrink-0 text-sm font-medium text-white/60">邮箱</span>
						<span className="text-sm text-white/90">{user?.email || "未绑定"}</span>
					</div>

					{/* 密码 */}
					<div className="border-t border-white/10 pt-4">
						<div className="mb-3 text-sm font-medium text-white">修改密码</div>
						<div className="space-y-3">
							<input
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								className="w-full rounded-lg border border-white/10 bg-[#242424] px-4 py-2 text-sm text-white focus:border-yellow-1 focus:outline-none"
								placeholder="当前密码"
							/>
							<input
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								className="w-full rounded-lg border border-white/10 bg-[#242424] px-4 py-2 text-sm text-white focus:border-yellow-1 focus:outline-none"
								placeholder="新密码"
							/>
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="w-full rounded-lg border border-white/10 bg-[#242424] px-4 py-2 text-sm text-white focus:border-yellow-1 focus:outline-none"
								placeholder="确认新密码"
							/>
							<button
								type="button"
								onClick={handleUpdatePassword}
								disabled={isLoading}
								className="btn-secondary w-full px-4 py-2"
							>
								{isLoading ? "保存中..." : "更新密码"}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* 安全设置 */}
			<div className="glass-panel">
				<div className="border-b border-white/10 p-4">
					<h3 className="text-lg font-semibold text-white">安全设置</h3>
				</div>
				<div className="p-4 space-y-4">
					{/* 两步验证 */}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<div className="text-sm font-medium text-white">两步验证</div>
							<div className="text-xs text-white/60">
								{twoFactorEnabled ? "已开启两步验证" : "未开启两步验证"}
							</div>
						</div>
						<button
							type="button"
							onClick={handleToggleTwoFactor}
							disabled={isLoading}
							className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
								twoFactorEnabled ? "bg-green-500" : "bg-surface-3"
							}`}
						>
							<span
								className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
									twoFactorEnabled ? "translate-x-6" : "translate-x-1"
								}`}
							/>
						</button>
					</div>

					{/* 登录设备 */}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<div className="text-sm font-medium text-white">登录设备</div>
							<div className="text-xs text-white/60">管理已登录的设备</div>
						</div>
						<button
							type="button"
							className="btn-secondary px-4 py-2 text-sm"
							onClick={() => alert("功能开发中...")}
						>
							管理
						</button>
					</div>
				</div>
			</div>

			{/* 隐私设置 */}
			<div className="glass-panel">
				<div className="border-b border-white/10 p-4">
					<h3 className="text-lg font-semibold text-white">隐私设置</h3>
				</div>
				<div className="p-4 space-y-4">
					{/* 个人资料可见性 */}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<span className="w-40 shrink-0 text-sm font-medium text-white/60">
							个人资料可见性
						</span>
						<select
							value={profileVisibility}
							onChange={(e) => setProfileVisibility(e.target.value as any)}
							className="rounded-lg border border-white/10 bg-[#242424] px-4 py-2 text-sm text-white focus:border-yellow-1 focus:outline-none"
						>
							<option value="private">仅自己</option>
							<option value="public">公开</option>
						</select>
					</div>

					{/* 作品默认可见性 */}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<span className="w-40 shrink-0 text-sm font-medium text-white/60">
							作品默认可见性
						</span>
						<select
							value={modelVisibility}
							onChange={(e) => setModelVisibility(e.target.value as any)}
							className="rounded-lg border border-white/10 bg-[#242424] px-4 py-2 text-sm text-white focus:border-yellow-1 focus:outline-none"
						>
							<option value="PRIVATE">私有</option>
							<option value="PUBLIC">公开</option>
						</select>
					</div>
				</div>
			</div>

			{/* 危险操作 */}
			<div className="glass-panel border border-red-500/30">
				<div className="border-b border-red-500/30 p-4">
					<h3 className="text-lg font-semibold text-red-500">危险操作</h3>
				</div>
				<div className="p-4">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<div className="text-sm font-medium text-white">注销账号</div>
							<div className="text-xs text-white/60">
								永久删除账号和所有数据,此操作不可恢复
							</div>
						</div>
						<button
							type="button"
							onClick={handleDeleteAccount}
							disabled={isLoading}
							className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "处理中..." : "注销账号"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
