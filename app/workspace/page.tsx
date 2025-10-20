"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Navigation from "@/components/layout/Navigation";
import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
import type { TaskWithDetails } from "@/types";
import {
  adaptTaskResponse,
  adaptTasksResponse,
} from "@/lib/utils/task-adapter-client";
import ImageGrid from "./components/ImageGrid";
import ModelPreview from "./components/ModelPreview";

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );

  // 初始化：从 URL 参数加载任务
  useEffect(() => {
    const initializeTask = async () => {
      try {
        if (taskId) {
          // 场景 1: 有 taskId，加载已存在的任务
          const response = await fetch(`/api/tasks/${taskId}`);
          const rawData = await response.json();
          const data = adaptTaskResponse(rawData); // ✅ 适配后端数据

          if (data.success) {
            setTask(data.data);
            if (data.data.selectedImageIndex !== null && data.data.selectedImageIndex !== undefined) {
              setSelectedImageIndex(data.data.selectedImageIndex);
            }
          } else {
            console.error("Failed to load task:", rawData.error);
          }
        } else {
          // 场景 2: 无任何参数，加载最新的任务
          const response = await fetch("/api/tasks?limit=1");
          const rawData = await response.json();
          const data = adaptTasksResponse(rawData); // ✅ 适配后端数据

          if (data.success && data.data.length > 0) {
            const latestTask = data.data[0];
            // 更新 URL 为最新任务 ID
            router.replace(`/workspace?taskId=${latestTask.id}`);
            setTask(latestTask);
            if (latestTask.selectedImageIndex !== null && latestTask.selectedImageIndex !== undefined) {
              setSelectedImageIndex(latestTask.selectedImageIndex);
            }
          } else {
            // 没有任何任务时，保持空状态
            console.log("No tasks found");
          }
        }
      } catch (error) {
        console.error("Failed to initialize task:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeTask();
    // router 在组件生命周期内稳定，不需要添加到依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // 轮询任务状态和队列状态
  useEffect(() => {
    if (!task?.id) return;

    // 检查是否需要轮询：
    // 1. 图片生成中
    // 2. 模型生成中（检查 task.status）
    // 3. 有任何模型正在生成（检查 task.models）
    const hasGeneratingModels = task.models?.some(
      (m) => !m.generationStatus || m.generationStatus === "PENDING" || m.generationStatus === "GENERATING"
    );

    const needsPolling =
      task.status === "IMAGE_PENDING" ||
      task.status === "IMAGE_GENERATING" ||
      task.status === "MODEL_PENDING" ||
      task.status === "MODEL_GENERATING" ||
      hasGeneratingModels;

    if (!needsPolling) {
      console.log("⏸️ 无需轮询：所有任务已完成");
      return;
    }

    console.log("▶️ 启动轮询：", {
      taskStatus: task.status,
      hasGeneratingModels,
      modelsStatus: task.models?.map(m => ({
        id: m.id,
        status: m.generationStatus,
        modelUrl: m.modelUrl
      }))
    });

    // 立即执行一次轮询（不等待首次interval触发）
    const pollOnce = async () => {
      try {
        // 获取任务状态（Worker架构下不需要队列状态）
        const taskResponse = await fetch(`/api/tasks/${task.id}`);
        const rawTaskData = await taskResponse.json();
        const taskData = adaptTaskResponse(rawTaskData); // ✅ 适配后端数据

        if (taskData.success) {
          setTask(taskData.data);

          // 如果任务完成，确保获取到最新数据后再停止轮询
          // 对于 MODEL_COMPLETED 状态，检查是否已有完成的模型
          if (taskData.data.status === "MODEL_COMPLETED") {
            const hasCompletedModel = taskData.data.models.some(
              (m) => m.generationStatus === "COMPLETED",
            );
            if (hasCompletedModel) {
              console.log("模型生成完成，已获取到最新模型数据，停止轮询");
              return false; // 有完成的模型，停止轮询
            }
            console.log("任务状态为 MODEL_COMPLETED，但尚未获取到完成的模型，继续轮询");
            return true; // 没有完成的模型，继续轮询
          }

          // 其他完成状态直接停止轮询
          if (
            taskData.data.status === "IMAGE_COMPLETED" ||
            taskData.data.status === "FAILED" ||
            taskData.data.status === "CANCELLED"
          ) {
            return false; // 返回false表示应该停止轮询
          }
        }

        return true; // 返回true表示继续轮询
      } catch (error) {
        console.error("Failed to poll status:", error);
        return true; // 出错时继续轮询
      }
    };

    // 立即执行一次
    pollOnce();

    // 设置定时器持续轮询
    const interval = setInterval(async () => {
      const shouldContinue = await pollOnce();
      if (!shouldContinue) {
        clearInterval(interval);
      }
    }, 1000); // 每秒轮询一次

    return () => clearInterval(interval);
  }, [task?.id, task?.status]);

  // 处理图片选择（仅更新索引，不触发生成）
  const handleImageSelect = (imageIndex: number) => {
    console.log(`📌 用户选择了图片 ${imageIndex}`);
    setSelectedImageIndex(imageIndex);
  };

  // 处理3D模型生成（发送API请求触发生成）
  const handleGenerate3D = async (imageIndex: number) => {
    setSelectedImageIndex(imageIndex);

    // 立即更新本地任务状态，给用户即时反馈
    if (task) {
      // 乐观更新：立即将状态设置为 MODEL_PENDING，让 ModelPreview 显示生成中状态
      setTask({
        ...task,
        selectedImageIndex: imageIndex,
        status: "MODEL_PENDING",
        modelGenerationStartedAt: new Date(),
      });

      try {
        // 只需要更新 selectedImageIndex，后台会自动检测并开始生成3D模型
        console.log(`🔵 发送PATCH请求: taskId=${task.id}, imageIndex=${imageIndex}`);
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedImageIndex: imageIndex }),
        });

        console.log(`🔵 收到响应: status=${response.status}`);
        const rawData = await response.json();
        console.log(`🔵 响应数据:`, rawData);
        const data = adaptTaskResponse(rawData); // ✅ 适配后端数据

        if (data.success) {
          // 后台队列会自动处理3D模型生成，前端轮询Task状态即可
          console.log("✅ 图片选择成功，3D模型生成已加入队列");
          // 保持乐观更新的状态，不要立即覆盖
          // 让轮询来更新实际状态，避免状态闪烁
          console.log("⏳ 保持 MODEL_PENDING 状态，等待轮询更新");
        } else {
          console.error("❌ 图片选择失败:", data.message || rawData.message || "Unknown error");
          alert(`选择图片失败: ${data.message || rawData.message || "Unknown error"}`);
          // 回滚乐观更新
          setTask({ ...task, selectedImageIndex: imageIndex });
        }
      } catch (error) {
        console.error("❌ 请求异常:", error);
        alert(`请求失败: ${error instanceof Error ? error.message : "网络错误"}`);
        // 回滚乐观更新
        setTask({ ...task, selectedImageIndex: imageIndex });
      }
    }
  };

  if (loading) {
    return <WorkspaceSkeleton />;
  }

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="glass-panel flex max-w-md flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 text-5xl">📋</div>
          <h3 className="mb-2 text-lg font-semibold text-white">暂无任务</h3>
          <p className="mb-6 text-sm text-white/60">
            从首页创建新任务或查看历史记录
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="btn-primary"
            >
              创建任务
            </button>
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

  return (
    <>
      {/* 左侧:输入与生成区域 - 自适应宽度以保持色块正方形 */}
      <div className="flex w-full shrink-0 flex-col gap-4 overflow-hidden lg:w-auto">
        <ImageGrid
          initialPrompt={task.prompt}
          onImageSelect={handleImageSelect}
          onGenerate3D={handleGenerate3D}
          task={task}
          taskId={task.id}
        />
      </div>

      {/* 右侧:3D预览区域 - 占据剩余空间 */}
      <div className="flex w-full flex-1 flex-col overflow-hidden">
        <ModelPreview
          imageIndex={selectedImageIndex}
          prompt={task.prompt}
          task={task}
          taskId={task.id}
          onGenerate3D={handleGenerate3D}
        />
      </div>
    </>
  );
}

function WorkspaceLoading() {
  return <WorkspaceSkeleton />;
}

export default function WorkspacePage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#141414] text-white">
      <Navigation />
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <Suspense fallback={<WorkspaceLoading />}>
          <WorkspaceContent />
        </Suspense>
      </div>
    </div>
  );
}
