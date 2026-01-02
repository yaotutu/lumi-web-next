"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useUser } from "@/stores/auth-store";
import { authActions } from "@/stores/auth-store";
import { toast } from "@/lib/toast";
import { apiRequestPost } from "@/lib/api-client";

/**
 * 个人资料模块
 * 包含:头像、基本信息、统计数据
 */
export default function ProfileInfo() {
  const user = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 表单状态 - 使用空字符串初始化,避免 hydration 错误
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  // 当 user 数据加载后,同步到表单状态
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio((user as any).bio || "");
    }
  }, [user]);

  // 从用户对象中获取统计数据
  // 如果 stats 不存在，使用默认值 0
  const stats = [
    {
      label: "3D 模型",
      value: user?.stats?.totalModels?.toString() || "0",
      icon: "🎲",
    },
    {
      label: "收藏",
      value: user?.stats?.favoritedModelsCount?.toString() || "0",
      icon: "⭐",
    },
    {
      label: "浏览量",
      value: user?.stats?.totalViews?.toString() || "0",
      icon: "👁",
    },
  ];

  // 处理保存
  const handleSave = async () => {
    // 验证用户名不为空
    if (!name.trim()) {
      toast.error("用户名不能为空");
      return;
    }

    // 验证用户是否已登录
    if (!user?.id) {
      toast.error("用户未登录");
      return;
    }

    setIsLoading(true);

    try {
      // 调用后端 API 更新用户名（使用 nick_name 字段）
      const result = await apiRequestPost("/api/users/update", {
        id: user.id,
        nick_name: name.trim(),
      });

      if (result.success) {
        toast.success("个人资料保存成功");
        // 刷新认证状态以获取最新的用户信息
        await authActions.refreshAuth();
        // 退出编辑模式
        setIsEditing(false);
      } else {
        toast.error(result.error.message || "保存失败");
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    setName(user?.name || "");
    setBio("");
    setIsEditing(false);
  };

  // 处理头像上传
  const handleAvatarUpload = () => {
    // TODO: 实现头像上传功能
    toast.info("头像上传功能开发中...");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">个人资料</h2>
          <p className="mt-1 text-sm text-white/60">查看和管理你的个人信息</p>
        </div>

        {/* 编辑按钮 */}
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="btn-secondary flex items-center gap-2 px-4 py-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            编辑资料
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="btn-secondary px-4 py-2"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="btn-primary flex items-center gap-2 px-4 py-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  保存中...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  保存
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 个人信息卡片 */}
      <div className="glass-panel p-6">
        <div className="flex flex-col items-start gap-6 md:flex-row">
          {/* 头像 */}
          <div className="relative group">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white/10">
              {(user as any)?.avatar ? (
                <Image
                  src={(user as any).avatar}
                  alt="头像"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-1/20 to-purple-1/20 text-4xl">
                  👤
                </div>
              )}
            </div>

            {/* 更换头像按钮 */}
            <button
              type="button"
              onClick={handleAvatarUpload}
              className="absolute inset-0 flex h-full w-full translate-y-1/4 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              title="更换头像"
            >
              <div className="flex flex-col items-center gap-1 text-white">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-xs font-medium">更换头像</span>
              </div>
            </button>
          </div>

          {/* 信息表单 */}
          <div className="flex-1 space-y-4">
            {/* 用户名 */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="w-20 shrink-0 text-sm font-medium text-white/60">
                用户名
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-[#242424] px-4 py-2 text-sm text-white focus:border-yellow-1 focus:outline-none"
                  placeholder="请输入用户名"
                />
              ) : (
                <span className="text-sm font-medium text-white">
                  {user?.name || "未设置"}
                </span>
              )}
            </div>

            {/* 邮箱 */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="w-20 shrink-0 text-sm font-medium text-white/60">
                邮箱
              </span>
              <span className="text-sm text-white/90">
                {user?.email || "未绑定"}
              </span>
            </div>

            {/* 个人简介 */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <span className="w-20 shrink-0 text-sm font-medium text-white/60">
                个人简介
              </span>
              {isEditing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="flex-1 resize-none rounded-lg border border-white/10 bg-[#242424] px-4 py-2 text-sm text-white focus:border-yellow-1 focus:outline-none"
                  rows={3}
                  placeholder="介绍一下自己..."
                />
              ) : (
                <span className="text-sm text-white/90">
                  {(user as any)?.bio || "这个人很懒,还没有填写个人简介"}
                </span>
              )}
            </div>

            {/* 注册时间 */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="w-20 shrink-0 text-sm font-medium text-white/60">
                注册时间
              </span>
              <span className="text-sm text-white/60">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("zh-CN")
                  : "未知"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 统计数据 */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">统计数据</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-panel p-4 text-center">
              <div className="mb-2 text-3xl">{stat.icon}</div>
              <div className="mb-1 text-2xl font-bold text-yellow-1">
                {stat.value}
              </div>
              <div className="text-xs text-white/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
