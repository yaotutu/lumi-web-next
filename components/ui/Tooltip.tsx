"use client";

import type { ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  disabled?: boolean;
}

export default function Tooltip({
  content,
  children,
  position = "top",
  disabled = false,
}: TooltipProps) {
  // 如果 disabled 为 true，不显示 tooltip
  if (disabled) {
    return <>{children}</>;
  }

  // 根据位置计算 tooltip 位置样式
  const positionClasses = {
    top: "-top-10 left-1/2 -translate-x-1/2",
    bottom: "-bottom-10 left-1/2 -translate-x-1/2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="group relative inline-block">
      {children}
      <span
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-white shadow-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${positionClasses[position]}`}
      >
        {content}
      </span>
    </div>
  );
}
