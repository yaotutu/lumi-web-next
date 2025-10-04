"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import ImageGrid from "@/components/workspace/ImageGrid";
import ModelPreview from "@/components/workspace/ModelPreview";
import { WorkspaceSkeleton } from "@/components/ui/Skeleton";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt") || "";
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [currentPrompt, setCurrentPrompt] = useState(prompt);

  const handleGenerate3D = (imageIndex: number, imagePrompt: string) => {
    setSelectedImageIndex(imageIndex);
    setCurrentPrompt(imagePrompt);
  };

  return (
    <>
      {/* 左侧:输入与生成区域 */}
      <div className="flex w-full flex-col gap-4 overflow-hidden lg:w-2/5">
        <ImageGrid initialPrompt={prompt} onGenerate3D={handleGenerate3D} />
      </div>

      {/* 右侧:3D预览区域 */}
      <div className="flex w-full flex-col overflow-hidden lg:w-3/5">
        <ModelPreview
          imageIndex={selectedImageIndex}
          prompt={currentPrompt}
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
    <div className="flex h-screen flex-col overflow-hidden bg-black text-white">
      <Navigation />
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <Suspense fallback={<WorkspaceLoading />}>
          <WorkspaceContent />
        </Suspense>
      </div>
    </div>
  );
}
