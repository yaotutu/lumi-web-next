/**
 * 空状态组件 - 引导用户绑定第一台打印机
 *
 * 功能说明:
 * - 当用户还没有绑定任何打印机时显示此组件
 * - 提供友好的引导文案和操作按钮
 * - 降低用户首次使用的焦虑感
 *
 * 设计要点:
 * - 使用大图标吸引注意力
 * - 清晰的文案说明功能价值
 * - 主要操作按钮使用 .btn-primary 突出显示
 * - 提供帮助文档链接作为次要操作
 */

"use client";

/**
 * 组件属性接口
 */
interface EmptyPrinterStateProps {
  /** 点击"添加打印机"按钮的回调函数 */
  onAddPrinter: () => void;
}

/**
 * 空状态组件
 *
 * @param onAddPrinter - 添加打印机回调函数
 * @returns 空状态 UI
 */
export default function EmptyPrinterState({
  onAddPrinter,
}: EmptyPrinterStateProps) {
  return (
    // 外层容器 - 垂直居中显示
    <div className="flex h-full min-h-[400px] items-center justify-center">
      {/* 空状态卡片容器 - 使用 .glass-panel 保持设计一致性 */}
      <div className="glass-panel max-w-md p-12 text-center fade-in-up">
        {/* 图标区域 - 大尺寸打印机图标吸引注意力 */}
        <div className="mb-6 text-6xl opacity-80">🖨️</div>

        {/* 标题 - 使用 text-white 确保可读性 */}
        <h3 className="mb-3 text-xl font-semibold text-white">
          还没有绑定打印机
        </h3>

        {/* 描述文案 - 使用 text-white/60 降低视觉权重 */}
        <p className="mb-8 text-sm leading-relaxed text-white/60">
          绑定你的 3D 打印机，即可远程监控打印进度、控制打印任务，让 3D
          打印更高效
        </p>

        {/* 操作按钮组 - 移动端垂直排列，桌面端水平排列 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {/* 主要操作按钮 - 使用 .btn-primary 作为最突出的交互元素 */}
          <button
            type="button"
            onClick={onAddPrinter}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {/* 加号图标 */}
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            添加打印机
          </button>

          {/* 次要操作按钮 - 使用 .btn-secondary 降低视觉优先级 */}
          <button
            type="button"
            onClick={() => window.open("/docs/printer-setup", "_blank")}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            {/* 帮助图标 */}
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
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            查看教程
          </button>
        </div>
      </div>
    </div>
  );
}
