import { cn } from "@/lib/cn";
import type { AutosaveStatus } from "@/hooks/useAutosaveBlocks";

interface SaveIndicatorProps {
  status: AutosaveStatus;
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === "idle") return <span className="text-xs text-transparent" aria-hidden />;
  if (status === "error") {
    return (
      <span role="alert" className="text-xs text-destructive">
        저장 실패
      </span>
    );
  }
  return (
    <span
      className={cn(
        "text-xs",
        status === "saving" ? "text-muted-ink" : "text-brand",
      )}
      aria-live="polite"
    >
      {status === "saving" ? "저장 중..." : "저장됨 ✓"}
    </span>
  );
}
