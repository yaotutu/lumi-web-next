"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import ImageGrid from "@/components/workspace/ImageGrid";
import ModelPreview from "@/components/workspace/ModelPreview";

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
      <div className="flex w-1/2 flex-col gap-4 overflow-hidden">
        <ImageGrid initialPrompt={prompt} onGenerate3D={handleGenerate3D} />
      </div>

      {/* 右侧:3D预览区域 */}
      <div className="flex w-1/2 flex-col overflow-hidden">
        <ModelPreview
          imageIndex={selectedImageIndex}
          prompt={currentPrompt}
        />
      </div>
    </>
  );
}

function WorkspaceLoading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-1 border-t-transparent" />
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black text-white">
      <Navigation />
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        <Suspense fallback={<WorkspaceLoading />}>
          <WorkspaceContent />
        </Suspense>
      </div>
    </div>
  );
}
