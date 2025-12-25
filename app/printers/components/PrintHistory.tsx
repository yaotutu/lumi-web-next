/**
 * 打印历史组件
 *
 * 功能说明:
 * - 显示最近的打印任务历史记录
 * - 横向滚动卡片列表，支持左右箭头按钮导航
 * - 每个任务卡片显示缩略图、名称、状态、时间
 *
 * 设计要点:
 * - 横向滚动布局，左右箭头按钮控制滚动
 * - 任务状态用颜色区分（成功/失败/进行中）
 * - 卡片悬停效果，提升交互体验
 */

"use client";

/**
 * 打印任务历史记录接口
 */
export interface PrintTask {
  /** 任务 ID */
  id: string;

  /** 任务名称（模型文件名） */
  name: string;

  /** 任务状态 */
  status: "COMPLETED" | "FAILED" | "PRINTING" | "CANCELLED";

  /** 缩略图 URL（可选） */
  thumbnailUrl?: string;

  /** 开始时间 */
  startedAt: Date;

  /** 完成时间（仅完成或失败状态） */
  completedAt?: Date;

  /** 打印进度（仅进行中状态，0-100） */
  progress?: number;

  /** 打印时长（秒） */
  duration?: number;
}

/**
 * 组件属性接口
 */
interface PrintHistoryProps {
  /** 打印任务历史列表 */
  tasks: PrintTask[];

  /** 点击任务卡片回调 */
  onTaskClick?: (task: PrintTask) => void;
}

/**
 * 打印历史组件
 */
export default function PrintHistory({ tasks, onTaskClick }: PrintHistoryProps) {
  /**
   * 格式化打印时长
   */
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  /**
   * 获取状态显示信息
   */
  const getStatusInfo = (status: PrintTask["status"]) => {
    switch (status) {
      case "COMPLETED":
        return {
          text: "已完成",
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          icon: "✓",
        };
      case "FAILED":
        return {
          text: "失败",
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          icon: "✕",
        };
      case "PRINTING":
        return {
          text: "打印中",
          color: "text-yellow-1",
          bgColor: "bg-yellow-1/10",
          borderColor: "border-yellow-1/30",
          icon: "⟳",
        };
      case "CANCELLED":
        return {
          text: "已取消",
          color: "text-white/40",
          bgColor: "bg-white/5",
          borderColor: "border-white/10",
          icon: "⊘",
        };
    }
  };

  /**
   * 格式化相对时间
   */
  const formatRelativeTime = (date: Date): string => {
    const now = Date.now();
    const diff = now - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) {
      return `${days}天前`;
    }
    if (hours > 0) {
      return `${hours}小时前`;
    }
    if (minutes > 0) {
      return `${minutes}分钟前`;
    }
    return "刚刚";
  };

  // 如果没有历史记录
  if (tasks.length === 0) {
    return (
      <div className="glass-panel p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-3 text-4xl opacity-40">📋</div>
          <p className="text-sm text-white/50">暂无打印历史记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      {/* 标题栏 */}
      <div className="border-b border-white/5 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">打印历史</h2>
        <p className="mt-1 text-sm text-white/50">共 {tasks.length} 条记录</p>
      </div>

      {/* 网格布局 - 响应式 */}
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tasks.map((task) => {
          const statusInfo = getStatusInfo(task.status);

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onTaskClick?.(task)}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/5 text-left transition-all hover:border-yellow-1/30 hover:bg-white/8"
            >
              {/* 缩略图区域 */}
              <div className="relative aspect-square overflow-hidden bg-white/5">
                {task.thumbnailUrl ? (
                  <img
                    src={task.thumbnailUrl}
                    alt={task.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl opacity-20">
                    🖨️
                  </div>
                )}

                {/* 状态徽章 */}
                <div className="absolute right-2 top-2">
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.bgColor} ${statusInfo.borderColor} border backdrop-blur-sm`}
                  >
                    <span className={statusInfo.color}>{statusInfo.icon}</span>
                    <span className={statusInfo.color}>{statusInfo.text}</span>
                  </div>
                </div>

                {/* 进度条 */}
                {task.status === "PRINTING" && task.progress !== undefined && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-1 to-yellow-1/80 transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* 任务信息 */}
              <div className="p-4">
                <h3 className="mb-2 truncate text-sm font-semibold text-white">
                  {task.name}
                </h3>

                <div className="space-y-1 text-xs text-white/50">
                  <div className="flex items-center justify-between">
                    <span>开始时间</span>
                    <span>{formatRelativeTime(task.startedAt)}</span>
                  </div>

                  {task.duration && (
                    <div className="flex items-center justify-between">
                      <span>打印时长</span>
                      <span>{formatDuration(task.duration)}</span>
                    </div>
                  )}

                  {task.status === "PRINTING" && task.progress !== undefined && (
                    <div className="flex items-center justify-between font-medium text-yellow-1">
                      <span>进度</span>
                      <span>{task.progress}%</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
