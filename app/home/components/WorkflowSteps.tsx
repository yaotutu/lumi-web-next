// WorkflowSteps.tsx - 首页工作流程步骤展示组件
"use client";

import React, { useState } from "react";

// 流程步骤配置
const WORKFLOW_STEPS = [
  {
    icon: "✍️",
    title: "输入描述",
    time: "~5秒",
    description: "用自然语言描述你想要的3D物体",
    detail: "例如：我要一个可爱的恐龙",
    bgGradient: "from-purple-500/10 to-pink-500/10",
    borderColor: "border-purple-500/20",
  },
  {
    icon: "🎨",
    title: "选择图片",
    time: "~15秒",
    description: "AI自动生成4张候选图片",
    detail: "挑选最符合你预期的一张",
    bgGradient: "from-pink-500/10 to-yellow-500/10",
    borderColor: "border-pink-500/20",
  },
  {
    icon: "📦",
    title: "生成模型",
    time: "~10秒",
    description: "AI将图片转换为3D模型",
    detail: "自动生成高质量可打印模型",
    bgGradient: "from-yellow-500/10 to-green-500/10",
    borderColor: "border-yellow-500/20",
  },
  {
    icon: "🖨️",
    title: "一键打印",
    time: "⚡",
    description: "直接发送到3D打印机",
    detail: "无需额外处理，开箱即用",
    bgGradient: "from-green-500/10 to-yellow-1/20",
    borderColor: "border-yellow-1/50",
    highlight: true, // 标记为重点步骤
  },
];

/**
 * WorkflowSteps - 展示从创意到打印的完整工作流程
 * 突出"一键打印"核心优势
 */
export default function WorkflowSteps() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="mt-8 mb-12">
      {/* 标题区域 */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-white mb-2">
          从创意到实物，只需 4 步
        </h3>
        <p className="text-sm text-white/60">
          全程约 30 秒 · 无需任何 3D 建模经验 · 完全免费
        </p>
      </div>

      {/* 流程卡片容器 - 响应式布局 */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-3 max-w-5xl mx-auto px-4">
        {WORKFLOW_STEPS.map((step, index) => (
          <React.Fragment key={step.title}>
            {/* 单个步骤卡片 */}
            {/* biome-ignore lint/a11y/useSemanticElements: This is a presentational grouping, not a form fieldset */}
            <div
              className={`
                workflow-step relative flex-1 w-full md:w-auto min-w-0 group
              `}
              style={{ animationDelay: `${index * 0.1}s` }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              role="group"
              aria-label={`步骤 ${index + 1}: ${step.title}`}
            >
              <div
                className={`
                  relative overflow-hidden rounded-xl
                  bg-gradient-to-br ${step.bgGradient}
                  border ${step.borderColor}
                  backdrop-blur-sm
                  p-4 text-center
                  min-h-[180px] flex flex-col justify-center
                  transition-all duration-300 ease-out
                  ${
                    hoveredIndex === index
                      ? "scale-105 shadow-xl border-opacity-60"
                      : "hover:border-opacity-40"
                  }
                  ${step.highlight ? "ring-2 ring-yellow-1/20" : ""}
                `}
              >
                {/* 高亮标签 - 仅在"一键打印"步骤显示 */}
                {step.highlight && (
                  <div className="absolute top-0 right-0 bg-yellow-1 text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                    核心优势
                  </div>
                )}

                {/* 步骤编号 */}
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/80">
                  {index + 1}
                </div>

                {/* 图标 */}
                <div
                  className={`
                    text-4xl mb-2
                    transition-transform duration-300
                    ${hoveredIndex === index ? "scale-110" : ""}
                  `}
                >
                  {step.icon}
                </div>

                {/* 标题 */}
                <h4 className="text-base font-semibold text-white mb-1">
                  {step.title}
                </h4>

                {/* 时间标签 */}
                <div
                  className={`
                    inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2
                    ${
                      step.highlight
                        ? "bg-yellow-1/20 text-yellow-1"
                        : "bg-white/10 text-white/70"
                    }
                  `}
                >
                  {step.time}
                </div>

                {/* 描述 */}
                <p className="text-sm text-white/80 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>

            {/* 箭头连接 - 桌面端横向，移动端纵向 */}
            {index < WORKFLOW_STEPS.length - 1 && (
              <>
                {/* 桌面端：横向箭头 */}
                <div className="hidden md:flex items-center flex-shrink-0 pt-0">
                  <svg
                    className="w-6 h-6 text-white/30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="下一步"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>

                {/* 移动端：纵向箭头 */}
                <div className="md:hidden flex justify-center py-2">
                  <svg
                    className="w-6 h-6 text-white/30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="下一步"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 13l5 5m0 0l5-5m-5 5V6"
                    />
                  </svg>
                </div>
              </>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 底部核心优势说明 */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-1/10 border border-yellow-1/30">
          <span className="text-lg">⚡</span>
          <span className="text-sm font-medium text-yellow-1">
            业界首创：AI生成的模型可直接打印，无需后处理
          </span>
        </div>
      </div>
    </div>
  );
}
