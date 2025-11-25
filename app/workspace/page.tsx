/**
 * 工作台页面 (Workspace Page)
 *
 * 核心功能：
 * 1. 图片生成：输入文本描述 → 生成 4 张图片
 * 2. 图片选择：从 4 张图片中选择一张
 * 3. 3D 模型生成：将选中的图片转换为 3D 模型
 * 4. 实时更新：通过 SSE (Server-Sent Events) 实时获取任务状态
 *
 * 架构特点：
 * - 左右分栏布局：左侧图片生成，右侧模型预览
 * - 状态驱动：task 对象包含所有任务信息
 * - SSE 机制：服务器主动推送状态更新，实时性 < 100ms
 * - 乐观更新：用户操作后立即反馈，无需等待服务器响应
 */
"use client";

// Next.js 路由和参数钩子
import { useRouter, useSearchParams } from "next/navigation";
// React 核心钩子
import { Suspense, useEffect, useState } from "react";
// 全局导航组件
import Navigation from "@/components/layout/Navigation";
// 加载中的骨架屏组件
import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
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
 * - 管理任务状态（加载、SSE 监听、更新）
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
          const response = await fetch(`/api/tasks/${taskId}`);
          const rawData = await response.json();

          // 2. 适配后端数据（将 Worker 架构的数据转换为前端需要的格式）
          const data = adaptTaskResponse(rawData);

          if (data.success) {
            // 3. 更新任务状态
            setTask(data.data);

            // 4. 恢复用户之前选中的图片（如果有）
            if (
              data.data.selectedImageIndex !== null &&
              data.data.selectedImageIndex !== undefined
            ) {
              setSelectedImageIndex(data.data.selectedImageIndex);
            }
          } else {
            console.error("Failed to load task:", rawData.error);
          }
        } else {
          // ========================================
          // 场景 2: URL 无 taskId，加载最新任务
          // ========================================
          // 适用于：用户直接访问 /workspace

          // 1. 请求最新的一个任务
          const response = await fetch("/api/tasks?limit=1");
          const rawData = await response.json();

          // 2. 适配任务列表数据
          const data = adaptTasksResponse(rawData);

          if (data.success && data.data.length > 0) {
            const latestTask = data.data[0];

            // 3. 更新 URL 为最新任务 ID（用户刷新页面时能保持状态）
            router.replace(`/workspace?taskId=${latestTask.id}`);

            // 4. 更新任务状态
            setTask(latestTask);

            // 5. 恢复选中的图片
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
  // Effect 2: SSE 实时状态推送
  // ============================================
  /**
   * SSE 实时推送：实时接收任务状态更新
   *
   * 作用：实时更新任务状态
   * - 图片生成进度（image:generating, image:completed）
   * - 模型生成进度（model:generating, model:progress, model:completed）
   * - 任务失败（image:failed, model:failed）
   *
   * SSE 机制：
   * - 建立持久连接，服务器主动推送
   * - 自动重连：网络断开后浏览器自动恢复连接
   * - 实时性：Worker 完成操作立即推送，延迟 < 100ms
   *
   * 为什么用 SSE 而不是轮询？
   * 1. 实时性更好：Worker 完成立即推送，无延迟
   * 2. 减少服务器压力：不再每秒轮询数据库
   * 3. 用户体验更好：进度更新更流畅
   */
  useEffect(() => {
    // 如果没有任务 ID，不建立连接
    if (!taskId) return;

    console.log("🔌 建立 SSE 连接", { taskId });

    // 创建 EventSource 连接
    const eventSource = new EventSource(`/api/tasks/${taskId}/events`);

    // ========================================
    // 事件处理函数
    // ========================================

    /**
     * 处理 task:init 事件（连接建立后的初始状态）
     * 注意：不直接 setTask，避免触发 useEffect 重新运行导致连接被关闭
     * 如果需要同步最新状态，可以选择性更新字段
     */
    eventSource.addEventListener("task:init", (event) => {
      const initialTask = JSON.parse(event.data);
      console.log("📥 收到初始状态", initialTask);

      // 只更新可能变化的字段，避免触发 useEffect 重新运行
      setTask((prev) => {
        if (!prev || prev.id !== initialTask.id) {
          // 如果是新任务，完全替换
          return initialTask;
        }
        // 如果是同一个任务，只更新需要同步的字段（如图片状态和模型状态）
        return {
          ...prev,
          images: initialTask.images || prev.images,
          model: initialTask.model || prev.model, // 同步模型状态
          status: initialTask.status || prev.status,
        };
      });
    });

    /**
     * 处理 image:generating 事件
     */
    eventSource.addEventListener("image:generating", (event) => {
      const { imageId, index } = JSON.parse(event.data);
      console.log(`🖼️ 图片 ${index} 开始生成`, { imageId });

      setTask((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          images: prev.images?.map((img) =>
            img.index === index ? { ...img, imageStatus: "GENERATING" } : img,
          ),
        };
      });
    });

    /**
     * 处理 image:completed 事件
     */
    eventSource.addEventListener("image:completed", (event) => {
      const { imageId, index, imageUrl } = JSON.parse(event.data);
      console.log(`✅ 图片 ${index} 生成完成`, { imageId, imageUrl });

      setTask((prev) => {
        if (!prev) return prev;

        const updatedImages = prev.images?.map((img) =>
          img.index === index
            ? {
                ...img,
                imageStatus: "COMPLETED" as const,
                imageUrl,
                completedAt: new Date(),
              }
            : img,
        );

        // 检查是否所有图片都已完成
        const allImagesCompleted = updatedImages?.every(
          (img) => img.imageStatus === "COMPLETED",
        );

        return {
          ...prev,
          images: updatedImages,
          status: allImagesCompleted ? "IMAGE_COMPLETED" : prev.status,
        } as any;
      });
    });

    /**
     * 处理 image:failed 事件
     */
    eventSource.addEventListener("image:failed", (event) => {
      const { imageId, index, errorMessage } = JSON.parse(event.data);
      console.error(`❌ 图片 ${index} 生成失败`, { imageId, errorMessage });

      setTask((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          images: prev.images?.map((img) =>
            img.index === index
              ? {
                  ...img,
                  imageStatus: "FAILED",
                  errorMessage,
                  failedAt: new Date(),
                }
              : img,
          ),
        };
      });
    });

    /**
     * 处理 model:generating 事件
     */
    eventSource.addEventListener("model:generating", (event) => {
      const { modelId, providerJobId } = JSON.parse(event.data);
      console.log(`🎨 模型开始生成`, { modelId, providerJobId });

      setTask((prev) => {
        if (!prev) return prev;

        // 新架构：检查 task.model（1:1 关系）
        if (!prev.model || prev.model.id !== modelId) {
          console.warn("⚠️ 收到 model:generating 事件，但模型不匹配", {
            modelId,
            currentModelId: prev.model?.id,
          });
          return prev;
        }

        // 新架构：更新 task.model（1:1 关系）
        const updatedModel = {
          ...prev.model,
          generationStatus: "GENERATING",
          progress: 0,
        };

        return {
          ...prev,
          status: "MODEL_GENERATING",
          phase: "MODEL_GENERATION",
          model: updatedModel as any,
        } as any;
      });
    });

    /**
     * 处理 model:progress 事件
     */
    eventSource.addEventListener("model:progress", (event) => {
      const { modelId, progress, status } = JSON.parse(event.data);
      console.log(`⏳ 模型生成进度更新: ${progress}%`, { modelId, status });

      setTask((prev) => {
        if (!prev) return prev;

        // 新架构：优先检查 task.model（1:1 关系）
        if (!prev.model || prev.model.id !== modelId) {
          console.warn("⚠️ 收到 model:progress 事件，但模型不匹配", {
            modelId,
            currentModelId: prev.model?.id,
          });
          return prev;
        }

        // 修复：正确设置状态，优先使用服务器返回的 status
        const generationStatus =
          status || (progress >= 100 ? "COMPLETED" : "GENERATING");

        const updatedModel = {
          ...prev.model,
          generationStatus,
          progress,
          // 如果进度达到100%，标记为完成
          ...(progress >= 100 && { completedAt: new Date() }),
        };

        return {
          ...prev,
          status: progress >= 100 ? "COMPLETED" : "MODEL_GENERATING",
          phase: progress >= 100 ? "COMPLETED" : "MODEL_GENERATION",
          model: updatedModel as any,
          ...(progress >= 100 && { completedAt: new Date() }),
        } as any;
      });
    });

    /**
     * 处理 model:completed 事件
     */
    eventSource.addEventListener("model:completed", (event) => {
      const { modelId, modelUrl, previewImageUrl, format } = JSON.parse(
        event.data,
      );
      console.log(`✅ 模型生成完成`, { modelId, modelUrl });

      setTask((prev) => {
        if (!prev) return prev;

        // 新架构：直接更新 task.model（1:1 关系）
        const updatedModel =
          prev.model?.id === modelId
            ? {
                ...prev.model,
                generationStatus: "COMPLETED",
                progress: 100,
                modelUrl,
                previewImageUrl,
                format,
                completedAt: new Date(),
              }
            : prev.model;

        return {
          ...prev,
          status: "COMPLETED", // 新架构：COMPLETED（不是 MODEL_COMPLETED）
          phase: "COMPLETED",
          model: updatedModel as any,
          completedAt: new Date(),
        } as any;
      });
    });

    /**
     * 处理 model:failed 事件
     */
    eventSource.addEventListener("model:failed", (event) => {
      const { modelId, errorMessage } = JSON.parse(event.data);
      console.error(`❌ 模型生成失败`, { modelId, errorMessage });

      setTask((prev) => {
        if (!prev) return prev;

        const updatedModel =
          prev.model?.id === modelId
            ? {
                ...prev.model,
                generationStatus: "FAILED",
                errorMessage,
                failedAt: new Date(),
              }
            : prev.model;

        return {
          ...prev,
          status: "FAILED",
          model: updatedModel as any,
        };
      });
    });

    /**
     * 处理连接打开
     */
    eventSource.onopen = () => {
      console.log("✅ SSE 连接已建立");
    };

    /**
     * 处理连接错误
     */
    eventSource.onerror = (error) => {
      console.error("❌ SSE 连接错误", error);
      // EventSource 会自动重连，无需手动处理
    };

    // ========================================
    // 清理函数：组件卸载时关闭连接
    // ========================================
    return () => {
      console.log("🔌 关闭 SSE 连接", { taskId });
      eventSource.close();
    };
  }, [taskId]); // 依赖项：URL 中的 taskId 变化时重新建立连接

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
      // 实际状态会通过 SSE 事件自动更新
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
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedImageIndex: imageIndex }),
        });

        console.log(`🔵 收到响应: status=${response.status}`);
        const rawData = await response.json();
        console.log(`🔵 响应数据:`, rawData);

        // ⚠️ 注意：这里不需要 adaptTaskResponse
        // 因为 PATCH /api/tasks/[id] 返回的是简化格式（只有 model 和 selectedImageIndex）
        // 不是完整的 GenerationRequest 对象

        if (rawData.success) {
          // ========================================
          // 成功：立即合并新模型到 task 状态
          // ========================================
          // 后台 Worker 会自动生成 3D 模型
          // 前端通过 SSE 事件自动更新进度
          console.log("✅ 图片选择成功，3D 模型生成已加入队列");

          // 从响应中提取新创建的模型
          const newModel = rawData.model;

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

            console.log("✅ 新模型已合并，SSE 将继续推送进度更新");
          } else {
            console.warn("⚠️ API 响应中没有 model 字段");
          }
        } else {
          // ========================================
          // 失败：回滚乐观更新
          // ========================================
          console.error(
            "❌ 图片选择失败:",
            rawData.message || rawData.error || "Unknown error",
          );

          // 显示错误提示
          alert(
            `选择图片失败: ${rawData.message || rawData.error || "Unknown error"}`,
          );

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
