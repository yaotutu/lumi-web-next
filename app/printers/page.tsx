/**
 * 打印机管理页面（单打印机版本）
 *
 * 路由: /printers
 *
 * 功能说明:
 * - 针对单打印机场景优化的专属页面
 * - 大尺寸详情卡片展示打印机状态
 * - 实时监控打印进度和设备状态
 * - 横向滚动的打印历史记录
 *
 * 页面状态:
 * - 空状态: 引导用户绑定第一台打印机
 * - 已绑定: 显示打印机详情和历史记录
 * - 加载状态: 显示加载动画
 */

"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/layout/Navigation";
import EmptyPrinterState from "./components/EmptyPrinterState";
import PrinterDetailCard from "./components/PrinterDetailCard";
import PrintHistory from "./components/PrintHistory";
import AddPrinterModal from "./components/AddPrinterModal";
import type { Printer, AddPrinterFormData } from "@/types/printer";
import type { PrintTask } from "./components/PrintHistory";
import { toast } from "@/lib/toast";

/**
 * 打印机管理页面组件
 */
export default function PrintersPage() {
  // 打印机数据状态（单个打印机）
  const [printer, setPrinter] = useState<Printer | null>(null);

  // 打印历史记录状态
  const [printHistory, setPrintHistory] = useState<PrintTask[]>([]);

  // 页面加载状态
  const [loading, setLoading] = useState(true);

  // 添加打印机弹窗显示状态
  const [showAddModal, setShowAddModal] = useState(false);

  /**
   * 加载打印机数据
   */
  const fetchPrinter = async () => {
    try {
      // TODO: 替换为实际的 API 调用
      // const result = await apiRequestGet<Printer>('/api/printer');
      // if (result.success) {
      //   setPrinter(result.data);
      // }

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 示例数据 - 打印中状态
      const mockPrinter: Printer = {
        id: "1",
        name: "我的 3D 打印机",
        model: "Bambu Lab X1 Carbon",
        status: "PRINTING",
        currentJob: {
          name: "可爱小猫模型.3mf",
          progress: 67,
          timeRemaining: 4320, // 72 分钟
          startedAt: new Date(Date.now() - 3600000 * 2), // 2 小时前开始
        },
      };

      setPrinter(mockPrinter);
    } catch (error) {
      console.error("加载打印机数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载打印历史记录
   */
  const fetchPrintHistory = async () => {
    try {
      // TODO: 替换为实际的 API 调用
      // const result = await apiRequestGet<PrintTask[]>('/api/printer/history');
      // if (result.success) {
      //   setPrintHistory(result.data);
      // }

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 示例数据
      const mockHistory: PrintTask[] = [
        {
          id: "1",
          name: "可爱小猫模型.3mf",
          status: "PRINTING",
          startedAt: new Date(Date.now() - 7200000), // 2小时前
          progress: 67,
        },
        {
          id: "2",
          name: "迷你花瓶.3mf",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 86400000), // 1天前
          completedAt: new Date(Date.now() - 82800000),
          duration: 3600, // 1小时
        },
        {
          id: "3",
          name: "齿轮配件.3mf",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 172800000), // 2天前
          completedAt: new Date(Date.now() - 169200000),
          duration: 3600,
        },
        {
          id: "4",
          name: "手机支架.3mf",
          status: "FAILED",
          startedAt: new Date(Date.now() - 259200000), // 3天前
          completedAt: new Date(Date.now() - 257400000),
          duration: 1800,
        },
        {
          id: "5",
          name: "装饰摆件.3mf",
          status: "COMPLETED",
          startedAt: new Date(Date.now() - 345600000), // 4天前
          completedAt: new Date(Date.now() - 341000000),
          duration: 4600,
        },
      ];

      setPrintHistory(mockHistory);
    } catch (error) {
      console.error("加载打印历史失败:", error);
    }
  };

  /**
   * 组件挂载时加载数据
   */
  useEffect(() => {
    // 加载打印机数据
    fetchPrinter();

    // 如果已绑定打印机，加载历史记录
    if (printer) {
      fetchPrintHistory();
    }

    // 设置轮询定时器（每 5 秒刷新一次）
    const interval = setInterval(() => {
      if (printer) {
        fetchPrinter();
      }
    }, 5000);

    // 组件卸载时清除定时器
    return () => {
      clearInterval(interval);
    };
  }, []);

  /**
   * 当打印机数据加载后，加载历史记录
   */
  useEffect(() => {
    if (printer) {
      fetchPrintHistory();
    }
  }, [printer?.id]);

  /**
   * 添加打印机处理函数
   */
  const handleAddPrinter = async (data: AddPrinterFormData) => {
    try {
      // TODO: 替换为实际的 API 调用
      // const result = await apiRequestPost<Printer>('/api/printer', data);
      // if (result.success) {
      //   setPrinter(result.data);
      //   setShowAddModal(false);
      // } else {
      //   throw new Error(result.error.message);
      // }

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 创建新打印机对象
      const newPrinter: Printer = {
        id: Date.now().toString(),
        name: data.name,
        model: data.model,
        status: "ONLINE",
      };

      // 设置打印机数据
      setPrinter(newPrinter);

      // 关闭弹窗
      setShowAddModal(false);
    } catch (error) {
      // 抛出错误，由弹窗组件处理
      throw new Error(error instanceof Error ? error.message : "添加失败");
    }
  };

  /**
   * 暂停打印处理函数
   */
  const handlePause = async () => {
    if (!printer) return;

    try {
      // TODO: 替换为实际的 API 调用
      // await apiRequestPatch('/api/printer/pause', {});

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 乐观更新
      setPrinter({ ...printer, status: "PAUSED" });
    } catch (error) {
      console.error("暂停打印失败:", error);
    }
  };

  /**
   * 继续打印处理函数
   */
  const handleResume = async () => {
    if (!printer) return;

    try {
      // TODO: 替换为实际的 API 调用
      // await apiRequestPatch('/api/printer/resume', {});

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 乐观更新
      setPrinter({ ...printer, status: "PRINTING" });
    } catch (error) {
      console.error("继续打印失败:", error);
    }
  };

  /**
   * 停止打印处理函数
   */
  const handleStop = async () => {
    if (!printer) return;

    try {
      // TODO: 替换为实际的 API 调用
      // await apiRequestPatch('/api/printer/stop', {});

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 乐观更新
      setPrinter({ ...printer, status: "ONLINE", currentJob: undefined });
    } catch (error) {
      console.error("停止打印失败:", error);
    }
  };

  /**
   * 打开设置处理函数
   */
  const handleSettings = () => {
    // TODO: 实现设置页面或弹窗
    console.log("打开设置");
    toast.info("打印机设置功能即将上线...");
  };

  /**
   * 点击任务卡片处理函数
   */
  const handleTaskClick = (task: PrintTask) => {
    // TODO: 实现任务详情页面或弹窗
    console.log("查看任务详情:", task);
    toast.info(`查看任务详情: ${task.name}\n\n此功能即将上线...`);
  };

  return (
    // 页面容器
    <div className="flex h-screen flex-col overflow-hidden bg-[#000000] text-white">
      {/* 导航栏 */}
      <Navigation />

      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 内容容器 */}
        <div className="mx-auto max-w-7xl space-y-6">
          {/* ==================== 页面标题 ==================== */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">打印机管理</h1>
              <p className="mt-1 text-sm text-white/50">
                {printer ? "实时监控打印进度和设备状态" : "还没有绑定打印机"}
              </p>
            </div>

            {/* 替换打印机按钮（仅在已绑定时显示） */}
            {printer && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="btn-secondary flex items-center gap-2"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                更换打印机
              </button>
            )}
          </div>

          {/* ==================== 内容区域 ==================== */}
          {loading ? (
            // 加载中
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-yellow-1/30 border-t-yellow-1" />
            </div>
          ) : !printer ? (
            // 空状态 - 引导用户添加打印机
            <EmptyPrinterState onAddPrinter={() => setShowAddModal(true)} />
          ) : (
            // 已绑定打印机 - 显示详情和历史
            <>
              {/* 打印机详情卡片 */}
              <PrinterDetailCard
                printer={printer}
                onPause={handlePause}
                onResume={handleResume}
                onStop={handleStop}
                onSettings={handleSettings}
              />

              {/* 打印历史记录 */}
              <PrintHistory
                tasks={printHistory}
                onTaskClick={handleTaskClick}
              />
            </>
          )}
        </div>
      </div>

      {/* ==================== 添加/更换打印机弹窗 ==================== */}
      <AddPrinterModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddPrinter}
      />
    </div>
  );
}
