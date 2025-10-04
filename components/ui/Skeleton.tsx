import type { ComponentPropsWithoutRef } from "react";

export interface SkeletonProps extends ComponentPropsWithoutRef<"div"> {
  variant?: "rectangle" | "circle" | "text";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export default function Skeleton({
  variant = "rectangle",
  width,
  height,
  className = "",
  ...props
}: SkeletonProps) {
  const baseStyles =
    "animate-pulse bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2 bg-[length:200%_100%]";

  const variantStyles = {
    rectangle: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-4",
  };

  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
      {...props}
    />
  );
}

/**
 * 图片卡片骨架屏
 */
export function ImageCardSkeleton() {
  return (
    <div className="glass-panel flex flex-col gap-3 overflow-hidden p-5">
      <Skeleton height={120} />
      <div className="space-y-2">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </div>
    </div>
  );
}

/**
 * Workspace 加载骨架屏
 */
export function WorkspaceSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
      {/* 左侧骨架 */}
      <div className="flex w-full flex-col gap-4 lg:w-2/5">
        <div className="glass-panel flex h-64 flex-col gap-3 p-5">
          <Skeleton height={20} width="40%" />
          <Skeleton height={100} />
          <div className="flex justify-end gap-2">
            <Skeleton height={36} width={100} />
          </div>
        </div>
        <div className="glass-panel flex flex-1 flex-col gap-3 p-5">
          <Skeleton height={20} width="40%" />
          <div className="grid flex-1 grid-cols-2 gap-2.5">
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
          <Skeleton height={40} />
        </div>
      </div>

      {/* 右侧骨架 */}
      <div className="glass-panel flex w-full flex-col lg:w-3/5">
        <div className="relative flex flex-1 items-center justify-center border-b border-border-subtle">
          <Skeleton width={200} height={200} />
        </div>
        <div className="p-5">
          <div className="mb-3 space-y-2">
            <Skeleton height={16} width="30%" />
            <Skeleton height={12} width="50%" />
            <Skeleton height={12} width="50%" />
          </div>
          <Skeleton height={40} />
        </div>
      </div>
    </div>
  );
}

/**
 * 画廊网格骨架屏
 */
export function GalleryGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="gallery-card">
          <Skeleton height={200} className="rounded-none" />
          <div className="p-4">
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" className="mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
