/**
 * 打印机卡片组件
 *
 * 功能说明:
 * - 显示单个打印机的详细信息和状态
 * - 提供打印控制操作（暂停/继续/停止）
 * - 实时显示打印进度和剩余时间
 *
 * 设计要点:
 * - 卡片分为三个区域：头部（状态）+ 主体（进度）+ 底部（操作）
 * - 状态通过颜色编码立即传达设备状态
 * - 打印进度条使用渐变 + 流动动画效果
 * - 停止按钮使用红色警告 + 二次确认防止误操作
 */

"use client";

import type { Printer } from "@/types/printer";

/**
 * 状态颜色配置映射表
 *
 * 定义每种打印机状态对应的视觉样式
 */
const PRINTER_STATUS_COLORS = {
  ONLINE: {
    bg: "bg-green-500/10", // 浅绿色背景
    border: "border-green-500/40", // 绿色边框
    text: "text-green-500", // 绿色文字
    dot: "bg-green-500", // 状态指示点
  },
  OFFLINE: {
    bg: "bg-white/5", // 浅灰色背景
    border: "border-white/10", // 灰色边框
    text: "text-white/40", // 灰色文字
    dot: "bg-white/40", // 灰色状态点
  },
  PRINTING: {
    bg: "bg-blue-500/10", // 浅蓝色背景
    border: "border-blue-500/40", // 蓝色边框
    text: "text-blue-500", // 蓝色文字
    dot: "bg-blue-500", // 蓝色状态点
  },
  PAUSED: {
    bg: "bg-yellow-500/10", // 浅橙色背景
    border: "border-yellow-500/40", // 橙色边框
    text: "text-yellow-500", // 橙色文字
    dot: "bg-yellow-500", // 橙色状态点
  },
  ERROR: {
    bg: "bg-red-500/10", // 浅红色背景
    border: "border-red-500/40", // 红色边框
    text: "text-red-500", // 红色文字
    dot: "bg-red-500", // 红色状态点
  },
} as const;

/**
 * 组件属性接口
 */
interface PrinterCardProps {
  /** 打印机数据 */
  printer: Printer;

  /** 暂停打印回调 */
  onPause: () => void;

  /** 继续打印回调 */
  onResume: () => void;

  /** 停止打印回调 */
  onStop: () => void;

  /** 查看打印历史回调 */
  onViewHistory: () => void;
}

/**
 * 打印机卡片组件
 *
 * @param printer - 打印机数据
 * @param onPause - 暂停回调
 * @param onResume - 继续回调
 * @param onStop - 停止回调
 * @param onViewHistory - 查看历史回调
 * @returns 打印机卡片 UI
 */
export default function PrinterCard({
  printer,
  onPause,
  onResume,
  onStop,
  onViewHistory,
}: PrinterCardProps) {
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
   *
   * @param seconds - 剩余秒数
   * @returns 格式化后的时间字符串（如 "2h 30m" 或 "45m"）
   */
  const formatTimeRemaining = (seconds: number): string => {
    // 计算小时数
    const hours = Math.floor(seconds / 3600);
    // 计算分钟数
    const minutes = Math.floor((seconds % 3600) / 60);

    // 如果有小时，显示小时和分钟
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    // 否则只显示分钟
    return `${minutes}m`;
  };

  /**
   * 停止打印处理函数
   *
   * 显示二次确认对话框，防止误操作
   */
  const handleStop = () => {
    // 使用原生 confirm 对话框进行二次确认
    const confirmed = confirm(
      `确定要停止打印任务 "${printer.currentJob?.name}" 吗?\n\n此操作不可恢复。`
    );

    // 用户确认后才执行停止操作
    if (confirmed) {
      onStop();
    }
  };

  return (
    // 卡片容器 - 使用 .glass-panel 保持设计一致性
    <div
      className={`glass-panel overflow-hidden transition-all duration-300 hover:border-yellow-1/30 ${
        printer.status === "PRINTING" ? "border-blue-500/20" : ""
      } ${printer.status === "ERROR" ? "border-red-500/20" : ""}`}
    >
      {/* ==================== 头部: 打印机信息 + 状态 ==================== */}
      <div className="border-b border-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          {/* 左侧: 打印机信息 */}
          <div className="flex-1">
            {/* 打印机名称 */}
            <h3 className="mb-1 text-base font-semibold text-white">
              {printer.name}
            </h3>

            {/* 型号 */}
            <p className="text-xs text-white/60">{printer.model}</p>
          </div>

          {/* 右侧: 状态徽章 */}
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${statusColors.bg} ${statusColors.border} border`}
          >
            {/* 状态指示点 - 打印中时添加脉冲动画 */}
            <div
              className={`h-2 w-2 rounded-full ${statusColors.dot} ${
                printer.status === "PRINTING" ? "animate-pulse" : ""
              }`}
            />
            <span className={statusColors.text}>{statusText}</span>
          </div>
        </div>

        {/* 错误信息 - 仅在 ERROR 状态时显示 */}
        {printer.status === "ERROR" && printer.errorMessage && (
          <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
            <div className="flex items-start gap-2">
              {/* 警告图标 */}
              <svg
                className="mt-0.5 h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="flex-1">{printer.errorMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 主体: 打印进度/空闲状态 ==================== */}
      <div className="p-4">
        {/* 打印中或暂停 - 显示进度信息 */}
        {printer.status === "PRINTING" || printer.status === "PAUSED" ? (
          <div className="space-y-3">
            {/* 任务名称 */}
            <div className="flex items-center gap-2">
              {/* 文档图标 */}
              <svg
                className="h-4 w-4 shrink-0 text-white/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="flex-1 truncate text-sm text-white">
                {printer.currentJob?.name}
              </span>
            </div>

            {/* 进度条容器 */}
            <div className="space-y-2">
              {/* 进度百分比 + 剩余时间 */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white">
                  {printer.currentJob?.progress}%
                </span>
                <span className="text-white/60">
                  剩余{" "}
                  {formatTimeRemaining(printer.currentJob?.timeRemaining || 0)}
                </span>
              </div>

              {/* 进度条 */}
              <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                {/* 进度填充 - 渐变 + 动画 */}
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    printer.status === "PRINTING"
                      ? "bg-gradient-to-r from-blue-500 to-blue-400"
                      : "bg-gradient-to-r from-yellow-500 to-yellow-400"
                  }`}
                  style={{ width: `${printer.currentJob?.progress}%` }}
                >
                  {/* 流动光效 - 仅在打印中显示 */}
                  {printer.status === "PRINTING" && (
                    <div
                      className="h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      style={{
                        backgroundSize: "200% 100%",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 开始时间 */}
            <div className="text-xs text-white/50">
              开始于{" "}
              {printer.currentJob?.startedAt.toLocaleString("zh-CN", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ) : printer.status === "ONLINE" ? (
          // 在线空闲 - 显示占位提示
          <div className="flex items-center justify-center py-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl opacity-60">✨</div>
              <p className="text-xs text-white/50">打印机空闲中，等待任务</p>
            </div>
          </div>
        ) : (
          // 离线 - 显示最后在线时间
          <div className="flex items-center justify-center py-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl opacity-40">💤</div>
              <p className="text-xs text-white/50">
                {printer.lastOnline
                  ? `最后在线: ${new Date(printer.lastOnline).toLocaleString("zh-CN")}`
                  : "打印机离线"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 底部: 操作按钮 ==================== */}
      <div className="border-t border-white/5 p-3">
        {printer.status === "PRINTING" || printer.status === "PAUSED" ? (
          // 打印中/暂停 - 显示控制按钮
          <div className="flex gap-2">
            {/* 暂停/继续按钮 */}
            <button
              type="button"
              onClick={printer.status === "PRINTING" ? onPause : onResume}
              className="btn-secondary flex flex-1 items-center justify-center gap-2 text-xs"
            >
              {printer.status === "PRINTING" ? (
                <>
                  {/* 暂停图标 */}
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
                      d="M10 9v6m4-6v6"
                    />
                  </svg>
                  暂停
                </>
              ) : (
                <>
                  {/* 播放图标 */}
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
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                  </svg>
                  继续
                </>
              )}
            </button>

            {/* 停止按钮 - 危险操作，使用红色 */}
            <button
              type="button"
              onClick={handleStop}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-500 transition-all hover:border-red-500/50 hover:bg-red-500/20"
            >
              {/* 停止图标 */}
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
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              停止
            </button>
          </div>
        ) : (
          // 其他状态 - 显示历史记录按钮
          <button
            type="button"
            onClick={onViewHistory}
            className="btn-secondary flex w-full items-center justify-center gap-2 text-xs"
          >
            {/* 历史图标 */}
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            打印历史
          </button>
        )}
      </div>
    </div>
  );
}
