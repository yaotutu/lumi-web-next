/**
 * 队列状态显示组件
 * 显示当前队列中的任务数量和状态
 */
"use client";

interface QueueStatusProps {
  pending: number; // 等待中的任务数
  running: number; // 运行中的任务数
  maxConcurrent: number; // 最大并发数
}

export default function QueueStatus({
  pending,
  running,
  maxConcurrent,
}: QueueStatusProps) {
  // 如果没有任务在队列中,不显示
  if (pending === 0 && running === 0) {
    return null;
  }

  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-3">
        {/* 图标 */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-1/10">
          <svg
            className="h-4 w-4 text-yellow-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* 队列信息 */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">任务队列</span>
            {running > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-1" />
                <span className="text-xs text-yellow-1">生成中</span>
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-white/60">
            <span>
              运行中: <span className="text-white">{running}</span>/
              {maxConcurrent}
            </span>
            {pending > 0 && (
              <span>
                等待中: <span className="text-white">{pending}</span>
              </span>
            )}
          </div>
        </div>

        {/* 进度条 */}
        {pending > 0 && (
          <div className="text-xs text-white/60">
            前面还有{" "}
            <span className="text-yellow-1 font-semibold">{pending}</span>{" "}
            个任务
          </div>
        )}
      </div>
    </div>
  );
}
