"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import ImageGrid from "./components/ImageGrid";
import ModelPreview from "./components/ModelPreview";
import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
import type { TaskWithDetails } from "@/types";

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const prompt = searchParams.get("prompt");

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );

  // 初始化：从 URL 参数创建或加载任务
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
        } else if (prompt) {
          // 场景 2: 有 prompt 但无 taskId，创建新任务
          const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
          });
          const data = await response.json();

          if (data.success) {
            // 更新 URL 为新任务 ID
            router.replace(`/workspace?taskId=${data.data.id}`);
            setTask(data.data);
          } else {
            console.error("Failed to create task:", data.error);
          }
        } else {
          // 场景 3: 无任何参数，加载最新的任务
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
  }, [taskId, prompt, router]);

  const handleGenerate3D = async (imageIndex: number) => {
    setSelectedImageIndex(imageIndex);

    // 保存选中的图片索引到数据库
    if (task) {
      try {
        await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedImageIndex: imageIndex }),
        });
      } catch (error) {
        console.error("Failed to save selected image index:", error);
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
      {/* 左侧:输入与生成区域 */}
      <div className="flex w-full flex-col gap-4 overflow-hidden lg:w-2/5">
        <ImageGrid
          initialPrompt={task.prompt}
          onGenerate3D={handleGenerate3D}
          task={task}
          taskId={task.id}
        />
      </div>

      {/* 右侧:3D预览区域 */}
      <div className="flex w-full flex-col overflow-hidden lg:w-3/5">
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
