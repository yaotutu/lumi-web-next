import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-foreground-subtle">{icon}</div>}
      <h3 className="mb-2 text-lg font-medium text-foreground-muted">
        {title}
      </h3>
      {description && (
        <p className="mb-6 max-w-md text-sm text-foreground-subtle">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-lg bg-yellow-1 px-6 py-2.5 text-sm font-medium text-black transition hover:brightness-110"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * 预定义的空状态变体
 */

export function NoModelsEmptyState({ onCreateClick }: { onCreateClick?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      }
      title="暂无3D模型"
      description="还没有生成任何3D模型,快去创建第一个吧!"
      action={
        onCreateClick
          ? {
              label: "开始创建",
              onClick: onCreateClick,
            }
          : undefined
      }
    />
  );
}

export function NoResultsEmptyState({ onReset }: { onReset?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title="未找到相关内容"
      description="尝试调整筛选条件或搜索关键词"
      action={
        onReset
          ? {
              label: "重置筛选",
              onClick: onReset,
            }
          : undefined
      }
    />
  );
}

export function NoImagesEmptyState() {
  return (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="M21 15.5 16.5 11 9 18" />
          <path d="m12 14-3 3" />
        </svg>
      }
      title="等待生成图片"
      description="在上方输入描述,点击生成按钮开始创作"
    />
  );
}

export function ErrorEmptyState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16 text-red-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      }
      title="加载失败"
      description={message || "出现了一些问题,请稍后重试"}
      action={
        onRetry
          ? {
              label: "重新加载",
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}
