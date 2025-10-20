"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "@/components/layout/Navigation";
import type { TaskWithDetails } from "@/types";
import { getProxiedImageUrl } from "@/lib/utils/proxy-url";
import { adaptTasksResponse } from "@/lib/utils/task-adapter-client";

export default function HistoryPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/tasks");
        const rawData = await response.json();
        const data = adaptTasksResponse(rawData); // ✅ 适配后端数据

        if (data.success) {
          setTasks(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("确定要删除这个任务吗？")) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: "等待中",
      GENERATING_IMAGES: "生成图片中",
      IMAGES_READY: "图片已就绪",
      GENERATING_MODEL: "生成3D中",
      COMPLETED: "已完成",
      FAILED: "失败",
      CANCELLED: "已取消",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      PENDING: "text-white/60",
      GENERATING_IMAGES: "text-blue-400",
      IMAGES_READY: "text-yellow-1",
      GENERATING_MODEL: "text-blue-400",
      COMPLETED: "text-green-500",
      FAILED: "text-red-500",
      CANCELLED: "text-white/40",
    };
    return colorMap[status] || "text-white/60";
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#000000] text-white">
      <Navigation />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-6 text-2xl font-bold text-white">任务历史</h1>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-1/30 border-t-yellow-1" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass-panel flex flex-col items-center justify-center py-12">
              <p className="text-white/60">暂无任务记录</p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="btn-primary mt-4"
              >
                开始创建
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="glass-panel group cursor-pointer overflow-hidden transition-all hover:border-yellow-1/30"
                  onClick={() => router.push(`/workspace?taskId=${task.id}`)}
                >
                  {/* 缩略图 */}
                  <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-white/5 to-[#0d0d0d]">
                    {task.images.length > 0 ? (
                      <img
                        src={getProxiedImageUrl(
                          (task.images[task.selectedImageIndex ?? 0] as any)?.url ||
                            task.images[task.selectedImageIndex ?? 0]?.imageUrl ||
                            (task.images[0] as any)?.url ||
                            task.images[0].imageUrl,
                        )}
                        alt="Task thumbnail"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-4xl">🎨</span>
                      </div>
                    )}

                    {/* 状态标签 */}
                    <div
                      className={`absolute right-2 top-2 rounded-lg bg-black/80 px-2 py-1 text-xs font-medium ${getStatusColor(task.status)}`}
                    >
                      {getStatusText(task.status)}
                    </div>
                  </div>

                  {/* 任务信息 */}
                  <div className="p-4">
                    <h3 className="mb-2 line-clamp-2 text-sm font-medium text-white">
                      {task.prompt}
                    </h3>

                    <div className="mb-3 flex items-center gap-3 text-xs text-white/50">
                      <span>{task.images.length} 张图片</span>
                      {task.models?.length > 0 && <span>• 已生成3D</span>}
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
      </div>
    </div>
  );
}
