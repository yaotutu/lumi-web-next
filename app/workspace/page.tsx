/**
 * 工作台页面 (Workspace Page)
 *
 * 核心功能：
 * 1. 图片生成：输入文本描述 → 生成 4 张图片
 * 2. 图片选择：从 4 张图片中选择一张
 * 3. 3D 模型生成：将选中的图片转换为 3D 模型
 * 4. 实时更新：通过轮询 (Polling) 定期获取任务状态
 *
 * 架构特点：
 * - 左右分栏布局：左侧图片生成，右侧模型预览
 * - 状态驱动：task 对象包含所有任务信息
 * - 轮询机制：每 2 秒查询一次状态，使用 HTTP 304 优化网络流量
 * - 乐观更新：用户操作后立即反馈，无需等待服务器响应
 */
"use client";

// Next.js 路由和参数钩子
import { useRouter, useSearchParams } from "next/navigation";
// React 核心钩子
import { Suspense, useEffect, useRef, useState } from "react";
// 全局导航组件
import Navigation from "@/components/layout/Navigation";
// 加载中的骨架屏组件
import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
// API 响应辅助函数（JSend 格式）
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { getErrorMessage, isSuccess } from "@/lib/utils/api-helpers";
// 后端数据适配器（将后端返回的数据转换为前端需要的格式）
import {
  adaptTaskResponse,
  adaptTasksResponse,
} from "@/lib/utils/task-adapter-client";
// 任务数据类型定义（包含图片、模型等完整信息）
import type { TaskWithDetails } from "@/types";
// 左侧图片生成和选择组件
import ImageGrid from "./components/ImageGrid";
// 右侧 3D 模型预览组件
import ModelPreview from "./components/ModelPreview";

/**
 * 工作台核心内容组件
 *
 * 职责：
 * - 管理任务状态（加载、轮询监听、更新）
 * - 协调左右两侧组件的交互
 * - 处理图片选择和 3D 模型生成
 */
function WorkspaceContent() {
  // Next.js 路由对象，用于页面导航
  const router = useRouter();
  // URL 查询参数对象，用于读取 ?taskId=xxx
  const searchParams = useSearchParams();
  // 从 URL 获取任务 ID（例如：/workspace?taskId=abc123）
  const taskId = searchParams.get("taskId");

  // ============================================
  // 状态管理
  // ============================================

  /**
   * 当前任务的完整数据
   * 包含：
   * - 基本信息：id, prompt, status, createdAt
   * - 图片列表：images[]（4 张图片及其状态）
   * - 模型列表：models[]（生成的 3D 模型及进度）
   * - 选中的图片索引：selectedImageIndex
   */
  const [task, setTask] = useState<TaskWithDetails | null>(null);

  /**
   * 页面加载状态
   * true：显示骨架屏
   * false：显示实际内容
   */
  const [loading, setLoading] = useState(true);

  /**
   * 用户选中的图片索引（0-3）
   * null：未选择
   * number：已选择的图片位置
   */
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );

  /**
   * 轮询相关状态
   * lastUpdatedAt：上次更新时间，用于 HTTP 304 优化
   * pollingIntervalRef：轮询定时器引用
   */
  const lastUpdatedAtRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // Effect 1: 任务初始化
  // ============================================
  /**
   * 触发条件：taskId 变化时
   *
   * 两种场景：
   * 1. URL 有 taskId → 加载指定任务
   * 2. URL 无 taskId → 加载最新任务并更新 URL
   *
   * 流程：
   * 1. 发送 API 请求获取任务数据
   * 2. 适配后端数据格式（Worker 架构 → 前端兼容格式）
   * 3. 更新本地状态
   * 4. 恢复选中的图片（如果有）
   */
  useEffect(() => {
    const initializeTask = async () => {
      try {
        if (taskId) {
          // ========================================
          // 场景 1: URL 有 taskId，加载指定任务
          // ========================================
          // 例如：/workspace?taskId=abc123

          // 1. 请求任务详情
          const response = await apiGet(`/api/tasks/${taskId}`);
          const rawData = await response.json();

          // 2. 适配后端数据（将 Worker 架构的数据转换为前端需要的格式）
          const data = adaptTaskResponse(rawData);

          // JSend 格式判断
          if (data.status === "success") {
            // 3. 更新任务状态
            setTask(data.data);

            // 4. 保存 updatedAt 用于轮询优化
            if (data.data.updatedAt) {
              lastUpdatedAtRef.current = new Date(data.data.updatedAt).toISOString();
            }

            // 5. 恢复用户之前选中的图片（如果有）
            if (
              data.data.selectedImageIndex !== null &&
              data.data.selectedImageIndex !== undefined
            ) {
              setSelectedImageIndex(data.data.selectedImageIndex);
            }
          } else {
            console.error("Failed to load task:", getErrorMessage(rawData));
          }
        } else {
          // ========================================
          // 场景 2: URL 无 taskId，加载最新任务
          // ========================================
          // 适用于：用户直接访问 /workspace

          // 1. 请求最新的一个任务
          const response = await apiGet("/api/tasks?limit=1");
          const rawData = await response.json();

          // 2. 适配任务列表数据
          const data = adaptTasksResponse(rawData);

          // JSend 格式判断
          if (data.status === "success" && data.data.length > 0) {
            const latestTask = data.data[0];

            // 3. 更新 URL 为最新任务 ID（用户刷新页面时能保持状态）
            router.replace(`/workspace?taskId=${latestTask.id}`);

            // 4. 更新任务状态
            setTask(latestTask);

            // 5. 保存 updatedAt 用于轮询优化
            if (latestTask.updatedAt) {
              lastUpdatedAtRef.current = new Date(latestTask.updatedAt).toISOString();
            }

            // 6. 恢复选中的图片
            if (
              latestTask.selectedImageIndex !== null &&
              latestTask.selectedImageIndex !== undefined
            ) {
              setSelectedImageIndex(latestTask.selectedImageIndex);
            }
          } else {
            // 没有任何任务时，保持空状态（后续会显示"暂无任务"提示）
            console.log("No tasks found");
          }
        }
      } catch (error) {
        console.error("Failed to initialize task:", error);
      } finally {
        // 无论成功或失败，都结束加载状态
        setLoading(false);
      }
    };

    initializeTask();

    // 注意：router 在组件生命周期内稳定，不需要添加到依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    taskId, // 3. 更新 URL 为最新任务 ID（用户刷新页面时能保持状态）
    router.replace,
  ]); // 依赖项：taskId 变化时重新执行

  // ============================================
  // Effect 2: 轮询任务状态
  // ============================================
  /**
   * 轮询机制：定期查询任务状态
   *
   * 作用：实时更新任务状态
   * - 图片生成进度（imageStatus: GENERATING, COMPLETED）
   * - 模型生成进度（generationStatus: GENERATING, COMPLETED）
   * - 任务失败（status: FAILED）
   *
   * 轮询策略：
   * - 轮询间隔：2 秒
   * - HTTP 304 优化：使用 since 参数，只在数据更新时返回完整数据
   * - 智能停止：任务完成或失败后停止轮询
   *
   * 架构优势：
   * - 简单：无需维护 WebSocket/SSE 连接
   * - 可靠：HTTP 请求失败后自动重试
   * - 高效：使用 HTTP 304 减少网络流量
   */
  useEffect(() => {
    // 如果没有任务 ID，不启动轮询
    if (!taskId) return;

    console.log("🔄 启动轮询", { taskId });

    /**
     * 执行一次轮询查询
     */
    const pollTaskStatus = async () => {
      try {
        // 构建查询 URL，带上 since 参数用于 HTTP 304 优化
        const queryParams = lastUpdatedAtRef.current
          ? `?since=${encodeURIComponent(lastUpdatedAtRef.current)}`
          : "";
        const url = `/api/tasks/${taskId}/status${queryParams}`;

        // 发送请求
        const response = await apiGet(url);

        // 处理 HTTP 304 Not Modified（数据未更新）
        if (response.status === 304) {
          console.log("📭 任务状态未更新（HTTP 304）");
          return;
        }

        // 解析响应
        const rawData = await response.json();
        const data = adaptTaskResponse(rawData);

        // JSend 格式判断
        if (data.status === "success") {
          const updatedTask = data.data;

          console.log("📥 收到任务状态更新", {
            status: updatedTask.status,
            phase: updatedTask.phase,
            imagesCount: updatedTask.images?.length,
            hasModel: !!updatedTask.model,
          });

          // 更新任务状态
          setTask(updatedTask);

          // 更新 lastUpdatedAt 用于下次轮询
          if (updatedTask.updatedAt) {
            lastUpdatedAtRef.current = new Date(updatedTask.updatedAt).toISOString();
          }

          // 智能停止轮询的条件：
          // 1. 图片生成完成（status: IMAGE_COMPLETED, phase: AWAITING_SELECTION）
          // 2. 模型生成完成（status: COMPLETED, phase: COMPLETED）
          // 3. 任务失败（status: FAILED）
          if (
            updatedTask.status === "IMAGE_COMPLETED" ||  // ✅ 新增：图片全部完成
            updatedTask.status === "COMPLETED" ||
            updatedTask.status === "FAILED" ||
            updatedTask.phase === "COMPLETED"
          ) {
            console.log("✅ 任务已完成，停止轮询", {
              status: updatedTask.status,
              phase: updatedTask.phase,
            });
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        } else {
          console.error("轮询失败:", getErrorMessage(rawData));
        }
      } catch (error) {
        console.error("轮询请求失败:", error);
        // 注意：不停止轮询，让定时器继续运行以便自动重试
      }
    };

    // 立即执行一次轮询
    pollTaskStatus();

    // 启动定时轮询（每 2 秒一次）
    pollingIntervalRef.current = setInterval(pollTaskStatus, 2000);

    // ========================================
    // 清理函数：组件卸载或 taskId 变化时停止轮询
    // ========================================
    return () => {
      console.log("🛑 停止轮询", { taskId });
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [taskId]); // 依赖项：URL 中的 taskId 变化时重新启动轮询

  // ============================================
  // 事件处理函数
  // ============================================

  /**
   * 处理图片选择（预览用）
   *
   * 作用：仅更新选中的图片索引，不触发 3D 模型生成
   * 用途：用户可以先浏览所有图片，再决定生成哪个模型
   *
   * @param imageIndex - 图片索引（0-3）
   */
  const handleImageSelect = (imageIndex: number) => {
    console.log(`📌 用户选择了图片 ${imageIndex}`);
    // 更新本地状态
    setSelectedImageIndex(imageIndex);
  };

  /**
   * 处理 3D 模型生成（确认生成）
   *
   * 作用：
   * 1. 更新选中的图片索引
   * 2. 发送 API 请求，后台 Worker 会自动生成 3D 模型
   * 3. 使用乐观更新，立即给用户反馈
   *
   * 乐观更新原理：
   * - 先更新本地状态（立即显示"生成中"）
   * - 再发送 API 请求
   * - 如果失败，回滚到之前的状态
   *
   * 为什么使用乐观更新？
   * - 提升用户体验：点击后立即有反馈，无需等待服务器响应
   * - 减少感知延迟：用户不会觉得"卡顿"
   *
   * @param imageIndex - 用户选中的图片索引（0-3）
   */
  const handleGenerate3D = async (imageIndex: number) => {
    // 1. 更新选中的图片索引
    setSelectedImageIndex(imageIndex);

    // 确保任务存在
    if (task) {
      // ========================================
      // 第 0 步：保存当前状态（用于失败回滚）
      // ========================================
      const previousTaskState = {
        status: task.status,
        selectedImageIndex: task.selectedImageIndex,
        modelGenerationStartedAt: task.modelGenerationStartedAt,
      };

      // ========================================
      // 第 1 步：乐观更新（立即反馈）
      // ========================================
      // 立即更新本地状态为"模型生成中"，让用户看到进度条
      // 实际状态会通过轮询自动更新
      console.log("🚀 乐观更新: 设置 MODEL_PENDING 状态", {
        imageIndex,
        previousStatus: task.status,
        newStatus: "MODEL_PENDING",
      });

      setTask({
        ...task, // 保留其他字段
        selectedImageIndex: imageIndex, // 更新选中的图片
        status: "MODEL_PENDING", // 设置为"等待生成"
        modelGenerationStartedAt: new Date(), // 记录开始时间
      });

      try {
        // ========================================
        // 第 2 步：发送 API 请求
        // ========================================
        console.log(
          `🔵 发送 PATCH 请求: taskId=${task.id}, imageIndex=${imageIndex}`,
        );

        // 发送请求，更新后端的 selectedImageIndex
        // 后端会自动触发 3D 模型生成（通过 Worker 监听）
        const response = await apiPatch(`/api/tasks/${task.id}`, {
          selectedImageIndex: imageIndex,
        });

        console.log(`🔵 收到响应: status=${response.status}`);
        const rawData = await response.json();
        console.log(`🔵 响应数据:`, rawData);

        // ⚠️ 注意：这里不需要 adaptTaskResponse
        // 因为 PATCH /api/tasks/[id] 返回的是简化格式（只有 model 和 selectedImageIndex）
        // 不是完整的 GenerationRequest 对象

        // JSend 格式判断
        if (isSuccess(rawData)) {
          // ========================================
          // 成功：立即合并新模型到 task 状态
          // ========================================
          // 后台 Worker 会自动生成 3D 模型
          // 前端通过轮询自动更新进度
          console.log("✅ 图片选择成功，3D 模型生成已加入队列");

          // 从响应中提取新创建的模型
          const resultData = rawData.data as { model: any };
          const newModel = resultData.model;

          if (newModel) {
            console.log("🔥 立即合并新模型到 task 状态", {
              modelId: newModel.id,
              sourceImageId: newModel.sourceImageId,
              imageIndex,
            });

            // 更新 task 状态，添加新模型
            setTask((prev) => {
              // 安全检查：确保 prev 和 prev.images 存在
              if (!prev || !prev.images) {
                console.error("❌ task 状态异常，无法合并新模型");
                return prev;
              }

              return {
                ...prev,
                selectedImageIndex: imageIndex,
                status: "MODEL_GENERATING", // 明确设置为生成中
                phase: "MODEL_GENERATION",
                model: {
                  ...newModel,
                  generationStatus: "PENDING", // 新创建的模型初始状态为 PENDING
                  progress: 0,
                },
                images: prev.images.map((img) =>
                  img.index === imageIndex
                    ? { ...img, generatedModel: newModel } // 关联到对应图片
                    : img,
                ),
                modelGenerationStartedAt: new Date(),
              };
            });

            console.log("✅ 新模型已合并，轮询将继续更新进度");

            // ✅ 重新启动轮询（如果之前已停止）
            if (!pollingIntervalRef.current) {
              console.log("🔄 重新启动轮询以监听模型生成进度");
              const pollTaskStatus = async () => {
                try {
                  const queryParams = lastUpdatedAtRef.current
                    ? `?since=${encodeURIComponent(lastUpdatedAtRef.current)}`
                    : "";
                  const url = `/api/tasks/${task.id}/status${queryParams}`;
                  const response = await apiGet(url);

                  if (response.status === 304) {
                    return;
                  }

                  const rawData = await response.json();
                  const data = adaptTaskResponse(rawData);

                  if (data.status === "success") {
                    const updatedTask = data.data;
                    setTask(updatedTask);

                    if (updatedTask.updatedAt) {
                      lastUpdatedAtRef.current = new Date(
                        updatedTask.updatedAt
                      ).toISOString();
                    }

                    // 检查是否需要停止轮询
                    if (
                      updatedTask.status === "COMPLETED" ||
                      updatedTask.status === "FAILED" ||
                      updatedTask.phase === "COMPLETED"
                    ) {
                      console.log("✅ 模型生成完成，停止轮询");
                      if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                      }
                    }
                  }
                } catch (error) {
                  console.error("轮询请求失败:", error);
                }
              };

              // 立即执行一次
              pollTaskStatus();
              // 启动定时轮询
              pollingIntervalRef.current = setInterval(pollTaskStatus, 2000);
            }
          } else {
            console.warn("⚠️ API 响应中没有 model 字段");
          }
        } else {
          // ========================================
          // 失败：回滚乐观更新
          // ========================================
          const errorMessage = getErrorMessage(rawData);
          console.error("❌ 图片选择失败:", errorMessage);

          // 显示错误提示
          alert(`选择图片失败: ${errorMessage}`);

          // 回滚到之前的状态
          console.log("⏪ 回滚乐观更新（请求失败）", previousTaskState);
          setTask({
            ...task,
            status: previousTaskState.status,
            selectedImageIndex: imageIndex, // 保留用户选择
            modelGenerationStartedAt:
              previousTaskState.modelGenerationStartedAt,
          });
        }
      } catch (error) {
        // ========================================
        // 异常：回滚乐观更新并提示用户
        // ========================================
        console.error("❌ 请求异常:", error);

        // 显示错误提示
        alert(
          `请求失败: ${error instanceof Error ? error.message : "网络错误"}`,
        );

        // 回滚到之前的状态
        console.log("⏪ 回滚乐观更新（请求异常）", previousTaskState);
        setTask({
          ...task,
          status: previousTaskState.status,
          selectedImageIndex: imageIndex, // 保留用户选择
          modelGenerationStartedAt: previousTaskState.modelGenerationStartedAt,
        });
      }
    }
  };

  // ============================================
  // 渲染逻辑
  // ============================================

  // 加载中：显示骨架屏
  if (loading) {
    return <WorkspaceSkeleton />;
  }

  // 无任务：显示空状态提示
  if (!task) {
    return (
      <div className="flex h-full items-center justify-center">
        {/* 空状态卡片 */}
        <div className="glass-panel flex max-w-md flex-col items-center justify-center p-12 text-center">
          {/* 图标 */}
          <div className="mb-4 text-5xl">📋</div>

          {/* 标题 */}
          <h3 className="mb-2 text-lg font-semibold text-white">暂无任务</h3>

          {/* 提示文字 */}
          <p className="mb-6 text-sm text-white/60">
            从首页创建新任务或查看历史记录
          </p>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            {/* 跳转到首页创建任务 */}
            <button
              type="button"
              onClick={() => router.push("/")}
              className="btn-primary"
            >
              创建任务
            </button>

            {/* 跳转到历史记录 */}
            <button
              type="button"
              onClick={() => router.push("/history")}
              className="btn-secondary"
            >
              查看历史
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // 正常渲染：左右分栏布局
  // ========================================
  return (
    <>
      {/* ==================== 左侧：图片生成区域 ==================== */}
      {/*
        布局说明：
        - 宽度：移动端全屏，桌面端自适应（保持图片正方形）
        - shrink-0：不允许收缩，确保图片网格不变形
      */}
      <div className="flex w-full shrink-0 flex-col gap-4 overflow-hidden lg:w-auto">
        <ImageGrid
          initialPrompt={task.prompt} // 传入任务的提示词（用于显示）
          onImageSelect={handleImageSelect} // 图片选择回调（预览用）
          onGenerate3D={handleGenerate3D} // 3D 生成回调（确认生成）
          task={task} // 完整的任务数据
          taskId={task.id} // 任务 ID
        />
      </div>

      {/* ==================== 右侧：3D 模型预览区域 ==================== */}
      {/*
        布局说明：
        - flex-1：占据剩余空间
        - overflow-hidden：避免内容溢出
      */}
      <div className="flex w-full flex-1 flex-col overflow-hidden">
        <ModelPreview
          imageIndex={selectedImageIndex} // 当前选中的图片索引
          prompt={task.prompt} // 任务提示词
          task={task} // 完整的任务数据
          taskId={task.id} // 任务 ID
          onGenerate3D={handleGenerate3D} // 3D 生成回调
        />
      </div>
    </>
  );
}

/**
 * 加载组件
 *
 * 作用：Suspense 的 fallback，在 WorkspaceContent 加载时显示
 */
function WorkspaceLoading() {
  return <WorkspaceSkeleton />;
}

/**
 * 工作台页面根组件
 *
 * 职责：
 * - 提供整体布局结构
 * - 包含全局导航栏
 * - 使用 Suspense 实现流式渲染
 *
 * 布局结构：
 * ┌─────────────────────────────────┐
 * │         Navigation              │  ← 顶部导航栏
 * ├─────────────────────────────────┤
 * │  ImageGrid  │  ModelPreview    │  ← 左右分栏
 * │  (图片生成) │  (模型预览)      │
 * │             │                   │
 * └─────────────────────────────────┘
 */
export default function WorkspacePage() {
  return (
    // 最外层容器：全屏高度，深色背景
    <div className="flex h-screen flex-col overflow-hidden bg-[#141414] text-white">
      {/* 顶部导航栏 */}
      <Navigation />

      {/* 主内容区域：左右分栏（响应式：移动端上下，桌面端左右） */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        {/*
          Suspense 流式渲染：
          - 好处：页面可以先显示导航栏，内容异步加载
          - fallback：加载时显示骨架屏
        */}
        <Suspense fallback={<WorkspaceLoading />}>
          <WorkspaceContent />
        </Suspense>
      </div>
    </div>
  );
}
