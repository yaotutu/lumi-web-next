interface GenerationProgressProps {
  progress: number;
}

export default function GenerationProgress({
  progress,
}: GenerationProgressProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground-muted">正在生成...</span>
        <span className="font-medium text-foreground">{progress}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full bg-gradient-to-r from-purple-1 to-yellow-1 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-center text-xs text-foreground-subtle">
        模型生成需要一些时间,请耐心等待...
      </div>
    </div>
  );
}
