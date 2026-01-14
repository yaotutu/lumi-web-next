/**
 * 打印机详情卡片组件
 *
 * 功能说明:
 * - 显示单台打印机的完整详细信息
 * - 大尺寸卡片，适合作为页面主要内容
 * - 包含设备信息、实时状态、当前任务、打印进度
 *
 * 设计要点:
 * - 左右分栏布局：左侧信息展示 + 右侧快速操作
 * - 大号进度环形图，醒目展示打印进度
 * - 状态信息分层展示，清晰易读
 * - 响应式设计，移动端自动调整为上下布局
 */

"use client";

import type { Printer } from "@/types/printer";

/**
 * 状态颜色配置映射表
 */
const PRINTER_STATUS_COLORS = {
  ONLINE: {
    bg: "bg-green-500/10",
    border: "border-green-500/40",
    text: "text-green-500",
    dot: "bg-green-500",
  },
  OFFLINE: {
    bg: "bg-white/5",
    border: "border-white/10",
    text: "text-white/40",
    dot: "bg-white/40",
  },
  PRINTING: {
    bg: "bg-yellow-1/10",
    border: "border-yellow-1/40",
    text: "text-yellow-1",
    dot: "bg-yellow-1",
  },
  PAUSED: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/40",
    text: "text-yellow-500",
    dot: "bg-yellow-500",
  },
  ERROR: {
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    text: "text-red-500",
    dot: "bg-red-500",
  },
} as const;

/**
 * 组件属性接口
 */
interface PrinterDetailCardProps {
  /** 打印机数据 */
  printer: Printer;

  /** 暂停打印回调 */
  onPause: () => void;

  /** 继续打印回调 */
  onResume: () => void;

  /** 停止打印回调 */
  onStop: () => void;

  /** 打开设置回调 */
  onSettings: () => void;
}

/**
 * 打印机详情卡片组件
 */
export default function PrinterDetailCard({
  printer,
  onPause,
  onResume,
  onStop,
  onSettings,
}: PrinterDetailCardProps) {
  // 获取当前状态对应的颜色配置
  const statusColors = PRINTER_STATUS_COLORS[printer.status];

  // 状态文本映射
  const statusText = {
    ONLINE: "在线空闲",
    OFFLINE: "离线",
    PRINTING: "打印中",
    PAUSED: "已暂停",
    ERROR: "错误",
  }[printer.status];

  /**
   * 格式化剩余时间
   */
  const formatTimeRemaining = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  /**
   * 格式化打印时长
   */
  const formatPrintDuration = (startTime: Date): string => {
    const duration = Date.now() - startTime.getTime();
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);

    if (hours > 0) {
      return `已打印 ${hours}小时 ${minutes}分钟`;
    }
    return `已打印 ${minutes}分钟`;
  };

  /**
   * 停止打印处理函数（二次确认）
   */
  const handleStop = () => {
    const confirmed = confirm(
      `确定要停止打印任务 "${printer.currentJob?.name}" 吗?\n\n此操作不可恢复，已打印的部分将无法继续。`,
    );

    if (confirmed) {
      onStop();
    }
  };

  return (
    // 卡片容器 - 大尺寸玻璃拟态卡片，打印中时添加黄色边框光晕
    <div
      className={`glass-panel overflow-hidden transition-all duration-300 ${
        printer.status === "PRINTING"
          ? "border-yellow-1/30 shadow-[0_0_24px_rgba(255,217,61,0.15)]"
          : ""
      }`}
    >
      {/* ==================== 顶部状态栏 ==================== */}
      <div className="border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 左侧：打印机名称和型号 */}
          <div>
            <h2 className="text-xl font-bold text-white">{printer.name}</h2>
            <p className="mt-1 text-sm text-white/60">{printer.model}</p>
          </div>

          {/* 右侧：状态徽章 */}
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${statusColors.bg} ${statusColors.border} border`}
          >
            {/* 状态指示点 - 打印中时脉冲动画 */}
            <div
              className={`h-2.5 w-2.5 rounded-full ${statusColors.dot} ${
                printer.status === "PRINTING" ? "animate-pulse" : ""
              }`}
            />
            <span className={statusColors.text}>{statusText}</span>
          </div>
        </div>
      </div>

      {/* ==================== 主内容区域 ==================== */}
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        {/* 左侧：打印进度和任务信息（占 2/3 宽度） */}
        <div className="lg:col-span-2">
          {printer.status === "PRINTING" || printer.status === "PAUSED" ? (
            // 打印中或暂停 - 显示详细进度信息
            <div className="space-y-6">
              {/* 任务名称 */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/50">
                  当前任务
                </p>
                <h3 className="text-2xl font-bold text-white">
                  {printer.currentJob?.name}
                </h3>
              </div>

              {/* 大号圆形进度指示器 */}
              <div className="flex items-center justify-center py-8">
                <div className="relative h-48 w-48">
                  {/* 发光效果层 - 仅在打印中时显示 */}
                  {printer.status === "PRINTING" && (
                    <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-1/20 blur-xl" />
                  )}

                  {/* SVG 圆环 */}
                  <svg
                    className="relative h-full w-full -rotate-90 transform"
                    viewBox="0 0 200 200"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* 背景圆环 */}
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-white/10"
                    />
                    {/* 进度圆环 */}
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      className={
                        printer.status === "PRINTING"
                          ? "text-yellow-1"
                          : "text-yellow-500"
                      }
                      style={{
                        strokeDasharray: `${2 * Math.PI * 90}`,
                        strokeDashoffset: `${
                          2 *
                          Math.PI *
                          90 *
                          (1 - (printer.currentJob?.progress || 0) / 100)
                        }`,
                        transition: "stroke-dashoffset 0.5s ease",
                      }}
                    />
                  </svg>

                  {/* 中心文字 - 进度百分比 */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-5xl font-bold text-white">
                      {printer.currentJob?.progress}%
                    </div>
                    <div className="mt-2 text-sm text-white/60">
                      {printer.status === "PRINTING" ? "打印中" : "已暂停"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 时间信息网格 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 剩余时间 */}
                <div className="rounded-lg bg-white/5 p-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/50">
                    剩余时间
                  </p>
                  <p className="text-xl font-semibold text-white">
                    {formatTimeRemaining(
                      printer.currentJob?.timeRemaining || 0,
                    )}
                  </p>
                </div>

                {/* 已打印时长 */}
                <div className="rounded-lg bg-white/5 p-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/50">
                    已打印时长
                  </p>
                  <p className="text-xl font-semibold text-white">
                    {formatPrintDuration(
                      printer.currentJob?.startedAt || new Date(),
                    )}
                  </p>
                </div>
              </div>

              {/* 开始时间 */}
              <div className="text-center text-sm text-white/50">
                开始于{" "}
                {printer.currentJob?.startedAt.toLocaleString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ) : printer.status === "ONLINE" ? (
            // 在线空闲 - 显示待机状态
            <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
              <div className="mb-4 text-6xl">✨</div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                打印机空闲中
              </h3>
              <p className="text-sm text-white/60">等待打印任务...</p>
            </div>
          ) : printer.status === "OFFLINE" ? (
            // 离线 - 显示离线提示
            <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
              <div className="mb-4 text-6xl opacity-40">💤</div>
              <h3 className="mb-2 text-xl font-semibold text-white/80">
                打印机离线
              </h3>
              <p className="text-sm text-white/50">
                {printer.lastOnline
                  ? `最后在线: ${new Date(printer.lastOnline).toLocaleString("zh-CN")}`
                  : "请检查打印机连接"}
              </p>
            </div>
          ) : (
            // 错误状态
            <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
              <div className="mb-4 text-6xl">⚠️</div>
              <h3 className="mb-2 text-xl font-semibold text-red-500">
                打印机错误
              </h3>
              <p className="text-sm text-white/60">
                {printer.errorMessage || "发生未知错误"}
              </p>
            </div>
          )}
        </div>

        {/* 右侧：快速操作面板（占 1/3 宽度） */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
            快速操作
          </h3>

          {printer.status === "PRINTING" || printer.status === "PAUSED" ? (
            // 打印中/暂停 - 显示控制按钮
            <div className="space-y-3">
              {/* 暂停/继续按钮 - 使用黄色主题 */}
              <button
                type="button"
                onClick={printer.status === "PRINTING" ? onPause : onResume}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-1/60 bg-yellow-1/10 px-4 py-2.5 text-sm font-medium text-yellow-1 transition-all hover:border-yellow-1 hover:bg-yellow-1/20 hover:shadow-[0_0_16px_rgba(255,217,61,0.25)]"
              >
                {printer.status === "PRINTING" ? (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 9v6m4-6v6"
                      />
                    </svg>
                    暂停打印
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                    </svg>
                    继续打印
                  </>
                )}
              </button>

              {/* 停止按钮 - 危险操作 */}
              <button
                type="button"
                onClick={handleStop}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-500 transition-all hover:border-red-500/50 hover:bg-red-500/20"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                  />
                </svg>
                停止打印
              </button>

              {/* 分隔线 */}
              <div className="border-t border-white/10 pt-3" />
            </div>
          ) : null}

          {/* 设置按钮 - 始终显示 */}
          <button
            type="button"
            onClick={onSettings}
            className="btn-secondary flex w-full items-center justify-center gap-2"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            打印机设置
          </button>

          {/* 设备信息卡片 */}
          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
              设备信息
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">型号</span>
                <span className="font-medium text-white">{printer.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">状态</span>
                <span className={statusColors.text}>{statusText}</span>
              </div>
              {printer.lastOnline && (
                <div className="flex justify-between">
                  <span className="text-white/60">最后在线</span>
                  <span className="text-white">
                    {new Date(printer.lastOnline).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
