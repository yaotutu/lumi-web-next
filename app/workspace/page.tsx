"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Navigation from "@/components/layout/Navigation";
import QueueStatus from "@/components/ui/QueueStatus";
import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
import type { TaskWithDetails } from "@/types";
import ImageGrid from "./components/ImageGrid";
import ModelPreview from "./components/ModelPreview";

// 队列状态接口
interface QueueStatusData {
  pending: number;
  running: number;
  completed: number;
  maxConcurrent: number;
  maxQueueSize: number;
}

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );
  const [queueStatus, setQueueStatus] = useState<QueueStatusData | null>(null);

  // 初始化：从 URL 参数加载任务
  useEffect(() => {
    const initializeTask = async () => {
      try {
        if (taskId) {
          // 场景 1: 有 taskId，加载已存在的任务
          const response = await fetch(`/api/tasks/${taskId}`);
          const data = await response.json();

          if (data.success) {
            setTask(data.data);
            if (data.data.selectedImageIndex !== null) {
              setSelectedImageIndex(data.data.selectedImageIndex);
            }
          } else {
            console.error("Failed to load task:", data.error);
          }
        } else {
          // 场景 2: 无任何参数，加载最新的任务
          const response = await fetch("/api/tasks?limit=1");
          const data = await response.json();

          if (data.success && data.data.length > 0) {
            const latestTask = data.data[0];
            // 更新 URL 为最新任务 ID
            router.replace(`/workspace?taskId=${latestTask.id}`);
            setTask(latestTask);
            if (latestTask.selectedImageIndex !== null) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // 轮询任务状态和队列状态
  useEffect(() => {
    if (!task?.id) return;

    // 只有在生成中的状态才需要轮询
    const needsPolling =
      task.status === "PENDING" ||
      task.status === "GENERATING_IMAGES" ||
      task.status === "GENERATING_MODEL";

    if (!needsPolling) return;

    // 立即执行一次轮询（不等待首次interval触发）
    const pollOnce = async () => {
      try {
        // 同时获取任务状态和队列状态
        const [taskResponse, queueResponse] = await Promise.all([
          fetch(`/api/tasks/${task.id}`),
          fetch("/api/queue/status"),
        ]);

        const taskData = await taskResponse.json();
        const queueData = await queueResponse.json();

        if (taskData.success) {
          setTask(taskData.data);

          // 如果任务完成或失败，清除队列状态
          if (
            taskData.data.status === "IMAGES_READY" ||
            taskData.data.status === "MODEL_READY" ||
            taskData.data.status === "FAILED" ||
            taskData.data.status === "COMPLETED"
          ) {
            setQueueStatus(null); // 清除队列状态
            return false; // 返回false表示应该停止轮询
          }
        }

        // 只有在任务还在进行中时才更新队列状态
        if (queueData.success) {
          setQueueStatus(queueData.data);
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

  const handleGenerate3D = async (imageIndex: number) => {
    setSelectedImageIndex(imageIndex);

    // 保存选中的图片索引，后台会自动触发3D模型生成队列
    if (task) {
      try {
        // 只需要更新 selectedImageIndex，后台会自动检测并开始生成3D模型
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedImageIndex: imageIndex }),
        });

        const data = await response.json();

        if (data.success) {
          // 后台队列会自动处理3D模型生成，前端轮询Task状态即可
          console.log("图片选择成功，3D模型生成已加入队列");
        } else {
          console.error("Failed to select image:", data.error);
        }
      } catch (error) {
        console.error("Failed to select image:", error);
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
      {/* 队列状态显示(悬浮在顶部) */}
      {queueStatus && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 animate-[fade-in-up_0.3s_ease-out]">
          <QueueStatus
            pending={queueStatus.pending}
            running={queueStatus.running}
            maxConcurrent={queueStatus.maxConcurrent}
          />
        </div>
      )}

      {/* 左侧:输入与生成区域 - 自适应宽度以保持色块正方形 */}
      <div className="flex w-full shrink-0 flex-col gap-4 overflow-hidden lg:w-auto">
        <ImageGrid
          initialPrompt={task.prompt}
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
    <div className="flex h-screen flex-col overflow-hidden bg-[#000000] text-white">
      <Navigation />
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <Suspense fallback={<WorkspaceLoading />}>
          <WorkspaceContent />
        </Suspense>
      </div>
    </div>
  );
}
