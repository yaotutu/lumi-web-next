"use client";

import { useSearchParams } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import ImageGrid from "@/components/workspace/ImageGrid";
import ModelPreview from "@/components/workspace/ModelPreview";

export default function WorkspacePage() {
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt") || "";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black text-white">
      <Navigation />
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* 左侧:输入与生成区域 */}
        <div className="flex w-1/2 flex-col gap-4 overflow-hidden">
          <ImageGrid initialPrompt={prompt} />
        </div>

        {/* 右侧:3D预览区域 */}
        <div className="flex w-1/2 flex-col overflow-hidden">
          <ModelPreview />
        </div>
      </div>
    </div>
  );
}
