"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequestDelete, apiRequestGet } from "@/lib/api-client";
import { adaptTasksResponse } from "@/lib/utils/task-adapter-client";
import type { TaskWithDetails } from "@/types";

/**
 * 创作历史模块
 * 完全复用原历史记录页面的逻辑和UI
 */
export default function CreationHistory() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载创作历史数据
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError(null);

      // ✅ 使用 apiRequestGet,自动处理错误和 Toast
      const result = await apiRequestGet<TaskWithDetails[]>("/api/tasks", {
        autoToast: false, // 禁用自动 Toast,使用自定义错误 UI
      });

      if (result.success) {
        // ✅ 适配后端数据格式(与原历史记录页面保持一致)
        // 后端返回 { items: [...], total: number } 格式
        const rawData = { data: result.data as any, status: "success" as const };
        const data = adaptTasksResponse(rawData);

        // 类型守卫：确保是成功响应
        if (data.status === "success") {
          const tasksArray = Array.isArray(data.data) ? data.data : [];
          setTasks(tasksArray);
        }
      } else {
        // 失败时设置错误状态(用于显示错误 UI)
        setError(result.error.message);
      }

      setLoading(false);
    };

    fetchTasks();
  }, []);

  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    const confirmed = window.confirm("确定要删除这个任务吗?");
    if (!confirmed) return;

    // ✅ 使用 apiRequestDelete,自动处理错误和 Toast
    const result = await apiRequestDelete(
      `/api/tasks/${taskId}`,
      {
        toastType: "success",
        toastContext: "删除任务",
      },
    );

    if (result.success) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
    // 失败时已自动显示 Toast,无需额外处理
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: "等待中",
      GENERATING_IMAGES: "生成图片中",
      IMAGES_READY: "图片已就绪",
      GENERATING_MODEL: "生成3D中",
      COMPLETED: "已完成",
      FAILED: "失败",
      CANCELLED: "已取消",
      IMAGE_PENDING: "等待中",
      IMAGE_GENERATING: "生成图片中",
      IMAGE_COMPLETED: "图片已就绪",
      MODEL_PENDING: "等待中",
      MODEL_GENERATING: "生成3D中",
    };
    return statusMap[status] || status;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      PENDING: "text-white/60",
      GENERATING_IMAGES: "text-blue-400",
      IMAGES_READY: "text-yellow-1",
      GENERATING_MODEL: "text-blue-400",
      COMPLETED: "text-green-500",
      FAILED: "text-red-500",
      CANCELLED: "text-white/40",
      IMAGE_PENDING: "text-white/60",
      IMAGE_GENERATING: "text-blue-400",
      IMAGE_COMPLETED: "text-yellow-1",
      MODEL_PENDING: "text-white/60",
      MODEL_GENERATING: "text-blue-400",
    };
    return colorMap[status] || "text-white/60";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold text-white">创作历史</h2>
        <p className="mt-1 text-sm text-white/60">查看你的所有创作记录</p>
      </div>

      {/* 内容区域 */}
      {loading ? (
        // 加载状态
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-1/30 border-t-yellow-1" />
        </div>
      ) : error ? (
        // 错误状态
        <div className="glass-panel py-16 text-center">
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
              onClick={() => router.push("/workspace")}
              className="btn-primary px-4 py-2"
            >
              去创作
            </button>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        // 空状态
        <div className="glass-panel flex flex-col items-center justify-center py-12">
          <p className="text-white/60">暂无任务记录</p>
          <button
            type="button"
            onClick={() => router.push("/workspace")}
            className="btn-primary mt-4"
          >
            开始创作
          </button>
        </div>
      ) : (
        // 任务网格
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              role="button"
              tabIndex={0}
              className="glass-panel group cursor-pointer overflow-hidden transition-all hover:border-yellow-1/30 text-left"
              onClick={() => router.push(`/workspace?taskId=${task.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/workspace?taskId=${task.id}`);
                }
              }}
            >
              {/* 缩略图 */}
              <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-white/5 to-[#0d0d0d]">
                {(() => {
                  // 查找第一张有 URL 的图片
                  const firstImageWithUrl = task.images.find(
                    (img) => img.imageUrl,
                  );
                  const imageUrl = firstImageWithUrl?.imageUrl ?? null;

                  return imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt="Task thumbnail"
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-4xl">🎨</span>
                    </div>
                  );
                })()}

                {/* 状态标签 */}
                <div
                  className={`absolute right-2 top-2 rounded-lg bg-black/80 px-2 py-1 text-xs font-medium backdrop-blur-sm ${getStatusColor(task.status)}`}
                >
                  {getStatusText(task.status)}
                </div>
              </div>

              {/* 任务信息 */}
              <div className="p-4">
                <h3 className="mb-2 line-clamp-2 text-sm font-medium text-white">
                  {task.originalPrompt || "未命名任务"}
                </h3>

                <div className="mb-3 flex items-center gap-3 text-xs text-white/50">
                  <span>{task.images.length} 张图片</span>
                  {task.model != null && <span>• 已生成3D</span>}
                </div>

                <div className="text-xs text-white/40">
                  {new Date(task.createdAt).toLocaleString("zh-CN")}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="border-t border-white/10 p-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTask(task.id);
                  }}
                  className="w-full rounded-lg bg-red-500/10 py-2 text-xs font-medium text-red-500 transition-all hover:bg-red-500/20"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
