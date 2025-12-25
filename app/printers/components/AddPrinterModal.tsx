/**
 * 添加打印机弹窗组件
 *
 * 功能说明:
 * - 提供表单界面供用户绑定新打印机
 * - 包含连接测试功能，提前验证配置是否正确
 * - 支持表单验证和错误提示
 *
 * 设计特点:
 * - Apple 风格的模态弹窗动画
 * - 遮罩层毛玻璃效果
 * - 表单输入样式与现有设计一致
 * - 加载状态的视觉反馈
 */

"use client";

import { useState } from "react";
import type { AddPrinterFormData } from "@/types/printer";
import { toast } from "@/lib/toast";

/**
 * 组件属性接口
 */
interface AddPrinterModalProps {
  /** 弹窗是否打开 */
  isOpen: boolean;

  /** 关闭弹窗回调 */
  onClose: () => void;

  /** 提交表单回调（返回 Promise，用于处理异步提交） */
  onSubmit: (data: AddPrinterFormData) => Promise<void>;
}

/**
 * 添加打印机弹窗组件
 *
 * @param isOpen - 弹窗是否打开
 * @param onClose - 关闭回调
 * @param onSubmit - 提交回调
 * @returns 弹窗 UI
 */
export default function AddPrinterModal({
  isOpen,
  onClose,
  onSubmit,
}: AddPrinterModalProps) {
  // 表单数据状态
  const [formData, setFormData] = useState<AddPrinterFormData>({
    name: "",
    model: "",
    ipAddress: "",
    apiKey: "",
  });

  // 测试连接加载状态
  const [isTesting, setIsTesting] = useState(false);

  // 提交表单加载状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 错误信息状态
  const [error, setError] = useState("");

  /**
   * 测试连接处理函数
   *
   * 验证打印机 IP 和 API Key 是否正确
   */
  const handleTestConnection = async () => {
    // 设置加载状态
    setIsTesting(true);
    // 清空之前的错误信息
    setError("");

    try {
      // 模拟测试连接 API 调用
      // TODO: 替换为实际的 API 调用
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 测试成功，显示提示
      toast.success("✅ 连接成功!");
    } catch (err) {
      // 测试失败，设置错误信息
      setError("连接失败，请检查 IP 地址和 API Key");
    } finally {
      // 取消加载状态
      setIsTesting(false);
    }
  };

  /**
   * 提交表单处理函数
   *
   * @param e - 表单提交事件
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // 阻止表单默认提交行为
    e.preventDefault();

    // 设置提交加载状态
    setIsSubmitting(true);
    // 清空之前的错误信息
    setError("");

    try {
      // 调用父组件传入的提交函数
      await onSubmit(formData);

      // 提交成功，关闭弹窗
      onClose();

      // 重置表单数据
      setFormData({
        name: "",
        model: "",
        ipAddress: "",
        apiKey: "",
      });
    } catch (err) {
      // 提交失败，设置错误信息
      setError(err instanceof Error ? err.message : "添加失败");
    } finally {
      // 取消加载状态
      setIsSubmitting(false);
    }
  };

  // 如果弹窗未打开，不渲染任何内容
  if (!isOpen) {
    return null;
  }

  return (
    // 遮罩层 - 毛玻璃效果 + 淡入动画
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in-up"
      onClick={onClose}
    >
      {/* 弹窗容器 - 阻止点击事件冒泡 */}
      <div
        className="glass-panel w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================== 头部 ==================== */}
        <div className="border-b border-white/5 p-6">
          <div className="flex items-center justify-between">
            {/* 标题 */}
            <h2 className="text-lg font-semibold text-white">添加打印机</h2>

            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              {/* 关闭图标 */}
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ==================== 表单内容 ==================== */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* 打印机名称 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              打印机名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例如: 办公室打印机 A"
              required
              className="w-full rounded-lg border border-white/10 bg-[#242424] px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-yellow-1 focus:outline-none focus:ring-1 focus:ring-yellow-1/20"
            />
          </div>

          {/* 打印机型号 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              型号 *
            </label>
            <select
              value={formData.model}
              onChange={(e) =>
                setFormData({ ...formData, model: e.target.value })
              }
              required
              className="w-full rounded-lg border border-white/10 bg-[#242424] px-3 py-2 text-sm text-white focus:border-yellow-1 focus:outline-none focus:ring-1 focus:ring-yellow-1/20"
            >
              <option value="">选择型号</option>
              <option value="Bambu Lab X1">Bambu Lab X1</option>
              <option value="Bambu Lab P1">Bambu Lab P1</option>
              <option value="Creality Ender 3">Creality Ender 3</option>
              <option value="Prusa i3 MK3">Prusa i3 MK3</option>
              <option value="Custom">自定义型号</option>
            </select>
          </div>

          {/* IP 地址 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              IP 地址 *
            </label>
            <input
              type="text"
              value={formData.ipAddress}
              onChange={(e) =>
                setFormData({ ...formData, ipAddress: e.target.value })
              }
              placeholder="例如: 192.168.1.100"
              required
              className="w-full rounded-lg border border-white/10 bg-[#242424] px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-yellow-1 focus:outline-none focus:ring-1 focus:ring-yellow-1/20"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              API Key *
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) =>
                setFormData({ ...formData, apiKey: e.target.value })
              }
              placeholder="从打印机设置中获取"
              required
              className="w-full rounded-lg border border-white/10 bg-[#242424] px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-yellow-1 focus:outline-none focus:ring-1 focus:ring-yellow-1/20"
            />
            <p className="mt-1.5 text-xs text-white/50">
              提示: 在打印机的设置菜单中可以找到 API 访问密钥
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {error}
            </div>
          )}

          {/* ==================== 按钮组 ==================== */}
          <div className="flex gap-3 pt-2">
            {/* 测试连接按钮 */}
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={
                isTesting || !formData.ipAddress || !formData.apiKey
              }
              className="btn-secondary flex flex-1 items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  {/* 加载动画 */}
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  测试中...
                </>
              ) : (
                <>
                  {/* Wi-Fi 图标 */}
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
                      d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                    />
                  </svg>
                  测试连接
                </>
              )}
            </button>

            {/* 确认添加按钮 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex flex-1 items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  {/* 加载动画 */}
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  添加中...
                </>
              ) : (
                "确认添加"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
