/**
 * 工作台页面 (Workspace Page)
 *
 * 核心功能：
 * 1. 图片生成：输入文本描述 → 生成 4 张图片
 * 2. 图片选择：从 4 张图片中选择一张
 * 3. 3D 模型生成：将选中的图片转换为 3D 模型
 * 4. 实时更新：通过轮询机制实时获取任务状态
 *
 * 架构特点：
 * - 左右分栏布局：左侧图片生成，右侧模型预览
 * - 状态驱动：task 对象包含所有任务信息
 * - 轮询机制：每秒检查任务状态，智能停止
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
// 任务数据类型定义（包含图片、模型等完整信息）
import type { TaskWithDetails } from "@/types";
// 后端数据适配器（将后端返回的数据转换为前端需要的格式）
import {
  adaptTaskResponse,
  adaptTasksResponse,
} from "@/lib/utils/task-adapter-client";
// 左侧图片生成和选择组件
import ImageGrid from "./components/ImageGrid";
// 右侧 3D 模型预览组件
import ModelPreview from "./components/ModelPreview";

/**
 * 工作台核心内容组件
 *
 * 职责：
 * - 管理任务状态（加载、轮询、更新）
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
  }, [taskId]); // 依赖项：taskId 变化时重新执行

  // ============================================
  // Effect 2: 任务状态轮询
  // ============================================
  /**
   * 触发条件：task.id 或 task.status 变化时
   *
   * 作用：实时更新任务状态
   * - 图片生成进度
   * - 模型生成进度
   * - 任务完成/失败状态
   *
   * 轮询机制：
   * - 频率：每 1 秒请求一次
   * - 智能停止：任务完成后自动停止轮询
   * - 错误处理：请求失败时继续轮询，避免中断
   *
   * 为什么用轮询而不是 WebSocket？
   * 1. 简单可靠：兼容所有部署环境（包括 Serverless）
   * 2. 任务周期长：图片生成 5-10 秒，模型生成 2-5 分钟
   * 3. 智能停止：任务完成后立即停止，不浪费资源
   */
  useEffect(() => {
    // 如果没有任务 ID，不启动轮询
    if (!task?.id) return;

    // ========================================
    // 第 1 步：判断是否需要轮询
    // ========================================

    // 检查是否有模型正在生成
    // 遍历所有模型，只要有一个处于 PENDING 或 GENERATING 状态就需要轮询
    const hasGeneratingModels = task.models?.some(
      (m) =>
        !m.generationStatus ||                  // 状态为空（刚创建）
        m.generationStatus === "PENDING" ||     // 等待生成
        m.generationStatus === "GENERATING",    // 生成中
    );

    // 需要轮询的条件（任意一个满足即可）：
    const needsPolling =
      task.status === "IMAGE_PENDING" ||      // 图片等待生成
      task.status === "IMAGE_GENERATING" ||   // 图片生成中
      task.status === "MODEL_PENDING" ||      // 模型等待生成
      task.status === "MODEL_GENERATING" ||   // 模型生成中
      hasGeneratingModels;                     // 有任何模型正在生成

    // 如果不需要轮询，提前退出
    if (!needsPolling) {
      console.log("⏸️ 无需轮询：所有任务已完成");
      return;
    }

    // 打印轮询启动信息（调试用）
    console.log("▶️ 启动轮询：", {
      taskStatus: task.status,
      hasGeneratingModels,
      modelsStatus: task.models?.map((m) => ({
        id: m.id,
        status: m.generationStatus,
        modelUrl: m.modelUrl,
      })),
    });

    // ========================================
    // 第 2 步：定义轮询函数
    // ========================================
    /**
     * 单次轮询：获取最新任务状态
     *
     * 返回值：
     * - true：继续轮询
     * - false：停止轮询
     */
    const pollOnce = async () => {
      try {
        // 1. 请求任务最新状态
        const taskResponse = await fetch(`/api/tasks/${task.id}`);
        const rawTaskData = await taskResponse.json();

        // 2. 适配后端数据格式
        const taskData = adaptTaskResponse(rawTaskData);

        if (taskData.success) {
          // 3. 更新本地任务状态
          // 注意：每次 fetch 返回的都是新对象，React 能检测到变化

          // ✅ 保留前端 UI 状态，避免乐观更新被后端数据覆盖

          // 检查当前选中的图片是否有正在生成的模型
          const currentSelectedImageIndex = task.selectedImageIndex ?? taskData.data.selectedImageIndex;
          let currentImageHasGeneratingModel = false;

          // ✅ 添加安全检查：确保 taskData.data.images 存在
          if (
            currentSelectedImageIndex !== null &&
            currentSelectedImageIndex !== undefined &&
            taskData.data.images &&
            Array.isArray(taskData.data.images)
          ) {
            // 从后端返回的数据中找到当前选中的图片
            const currentImage = taskData.data.images.find(
              (img: any) => img.index === currentSelectedImageIndex
            );

            // 检查这张图片是否有正在生成的模型
            if (currentImage) {
              // 检查 images[].generatedModel
              const imageModel = (currentImage as any).generatedModel;

              // 如果这张图片有模型，检查模型状态
              if (imageModel) {
                // 从 task.models 中找到完整的模型数据（包含 generationStatus）
                const fullModel = taskData.data.models?.find((m: any) => m.id === imageModel.id);
                const modelStatus = fullModel?.generationStatus;

                // 如果模型正在生成中（GENERATING 或刚创建还没状态）
                currentImageHasGeneratingModel = (
                  !modelStatus ||
                  modelStatus === "GENERATING" ||
                  modelStatus === "PENDING"
                );
              }
            }
          }

          const preservedTask = {
            ...taskData.data,

            // 保留 selectedImageIndex（adapter 会强制设置为 undefined）
            selectedImageIndex: currentSelectedImageIndex,

            // 🔥 新的保留逻辑：基于当前图片的模型状态，而不是全局 task.status
            //
            // 关键问题：多张图片场景下，全局 task.status 无法准确反映单张图片的状态
            //
            // 场景1：单张图片生成模型
            //   点击"生成模型" → 乐观更新 status="MODEL_PENDING" → 轮询立即触发
            //   → 后端还没创建模型 → status="IMAGE_COMPLETED" → 保留 MODEL_PENDING
            //
            // 场景2：多张图片场景（第一张已有模型，生成第二张）
            //   第一张图片有模型（已完成）→ task.status = "MODEL_COMPLETED"
            //   点击第二张图片"生成模型" → 乐观更新 status="MODEL_PENDING"
            //   → 轮询返回 status="MODEL_COMPLETED"（因为第一张图片的模型已完成！）
            //   → ❌ 旧逻辑：检查 task.status === "MODEL_PENDING" → 失败！因为后端返回 "MODEL_COMPLETED"
            //   → ✅ 新逻辑：检查当前图片是否有正在生成的模型 → 没有 → 保留 MODEL_PENDING
            status: (() => {
              // 如果当前是 MODEL_PENDING（乐观更新），且当前图片没有正在生成的模型
              // 说明后端还没创建模型记录，保留 MODEL_PENDING
              //
              // 注意：不再检查 task.status === "MODEL_PENDING"，因为在多图片场景下可能是 "MODEL_COMPLETED"
              if (
                task.status === "MODEL_PENDING" &&
                !currentImageHasGeneratingModel &&
                currentSelectedImageIndex !== null
              ) {
                console.log("🔒 保留 MODEL_PENDING 状态（后端还没创建模型记录）", {
                  当前选中图片: currentSelectedImageIndex,
                  后端返回status: taskData.data.status,
                  当前图片有生成中模型: currentImageHasGeneratingModel,
                });
                return "MODEL_PENDING";
              }

              // 否则使用后端返回的状态
              return taskData.data.status;
            })(),

            // ✅ 保留乐观更新时添加的 modelGenerationStartedAt
            modelGenerationStartedAt: task.modelGenerationStartedAt ?? taskData.data.modelGenerationStartedAt,
          };

          console.log("🔄 轮询更新 task 状态:", {
            原始status: taskData.data.status,
            保留后status: preservedTask.status,
            原始selectedImageIndex: taskData.data.selectedImageIndex,
            保留后selectedImageIndex: preservedTask.selectedImageIndex,
            原始models数量: taskData.data.models?.length || 0,
            保留后models数量: preservedTask.models?.length || 0,
          });

          setTask(preservedTask);

          // ========================================
          // 智能停止逻辑
          // ========================================

          // 特殊情况：MODEL_COMPLETED 状态
          // 为什么特殊处理？
          // - 任务状态可能比模型数据更新快
          // - 需要确保前端拿到完整的模型数据后再停止轮询
          if (taskData.data.status === "MODEL_COMPLETED") {
            // 检查是否真的有完成的模型数据
            const hasCompletedModel = taskData.data.models.some(
              (m) => m.generationStatus === "COMPLETED",
            );

            if (hasCompletedModel) {
              // 模型数据已完整，可以停止轮询
              console.log("✅ 模型生成完成，已获取到最新模型数据，停止轮询");
              return false; // 返回 false = 停止轮询
            }

            // 模型数据尚未返回，继续轮询
            console.log(
              "⏳ 任务状态为 MODEL_COMPLETED，但尚未获取到完成的模型，继续轮询",
            );
            return true; // 返回 true = 继续轮询
          }

          // 其他完成状态：直接停止轮询
          if (
            taskData.data.status === "IMAGE_COMPLETED" ||  // 图片生成完成（未选择图片）
            taskData.data.status === "FAILED" ||           // 任务失败
            taskData.data.status === "CANCELLED"           // 任务取消
          ) {
            console.log(`✅ 任务已完成：${taskData.data.status}，停止轮询`);
            return false; // 返回 false = 停止轮询
          }
        }

        // 默认：继续轮询
        return true;
      } catch (error) {
        // 错误处理：请求失败时继续轮询
        // 原因：避免网络抖动导致轮询中断
        console.error("❌ 轮询请求失败:", error);
        return true; // 返回 true = 继续轮询
      }
    };

    // ========================================
    // 第 3 步：启动轮询
    // ========================================

    // 立即执行一次轮询（不等待首次 interval 触发）
    // 好处：用户打开页面后立即看到最新状态
    pollOnce();

    // 设置定时器持续轮询
    const interval = setInterval(async () => {
      // 执行一次轮询，获取返回值
      const shouldContinue = await pollOnce();

      // 如果返回 false，清除定时器停止轮询
      if (!shouldContinue) {
        clearInterval(interval);
      }
    }, 1000); // 每 1 秒轮询一次

    // 清理函数：组件卸载时清除定时器
    return () => clearInterval(interval);
  }, [task?.id, task?.status]); // 依赖项：任务 ID 或状态变化时重新启动轮询

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
      // 实际状态会在轮询时自动更新
      console.log("🚀 乐观更新: 设置 MODEL_PENDING 状态", {
        imageIndex,
        previousStatus: task.status,
        newStatus: "MODEL_PENDING",
      });

      setTask({
        ...task,                                 // 保留其他字段
        selectedImageIndex: imageIndex,          // 更新选中的图片
        status: "MODEL_PENDING",                 // 设置为"等待生成"
        modelGenerationStartedAt: new Date(),    // 记录开始时间
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

        // 适配后端数据格式
        const data = adaptTaskResponse(rawData);

        if (data.success) {
          // ========================================
          // 成功：立即合并新模型到 task 状态
          // ========================================
          // 后台 Worker 会自动生成 3D 模型
          // 前端通过轮询机制自动更新进度
          console.log("✅ 图片选择成功，3D 模型生成已加入队列");

          // 从响应中提取新创建的模型
          const newModel = rawData.model;

          if (newModel) {
            console.log("🔥 立即合并新模型到 task 状态", {
              modelId: newModel.id,
              sourceImageId: newModel.sourceImageId,
              imageIndex
            });

            // 更新 task 状态，添加新模型
            setTask(prev => {
              // 安全检查：确保 prev 和 prev.images 存在
              if (!prev || !prev.images) {
                console.error("❌ task 状态异常，无法合并新模型");
                return prev;
              }

              return {
                ...prev,
                selectedImageIndex: imageIndex,
                status: "MODEL_GENERATING", // 明确设置为生成中
                models: [...(prev.models || []), newModel], // 添加新模型到数组
                images: prev.images.map(img =>
                  img.index === imageIndex
                    ? { ...img, generatedModel: newModel } // 关联到对应图片
                    : img
                ),
                modelGenerationStartedAt: new Date(),
              };
            });

            console.log("✅ 新模型已合并，轮询将继续更新进度");
          } else {
            console.warn("⚠️ API 响应中没有 model 字段");
          }
        } else {
          // ========================================
          // 失败：回滚乐观更新
          // ========================================
          console.error(
            "❌ 图片选择失败:",
            data.message || rawData.message || "Unknown error",
          );

          // 显示错误提示
          alert(
            `选择图片失败: ${data.message || rawData.message || "Unknown error"}`,
          );

          // 回滚到之前的状态
          console.log("⏪ 回滚乐观更新（请求失败）", previousTaskState);
          setTask({
            ...task,
            status: previousTaskState.status,
            selectedImageIndex: imageIndex,  // 保留用户选择
            modelGenerationStartedAt: previousTaskState.modelGenerationStartedAt,
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
          selectedImageIndex: imageIndex,  // 保留用户选择
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
          initialPrompt={task.prompt}                  // 传入任务的提示词（用于显示）
          onImageSelect={handleImageSelect}            // 图片选择回调（预览用）
          onGenerate3D={handleGenerate3D}              // 3D 生成回调（确认生成）
          task={task}                                  // 完整的任务数据
          taskId={task.id}                             // 任务 ID
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
          imageIndex={selectedImageIndex}              // 当前选中的图片索引
          prompt={task.prompt}                          // 任务提示词
          task={task}                                   // 完整的任务数据
          taskId={task.id}                              // 任务 ID
          onGenerate3D={handleGenerate3D}               // 3D 生成回调
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
