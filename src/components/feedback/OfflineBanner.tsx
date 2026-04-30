import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const qc = useQueryClient();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      qc.resumePausedMutations();
      qc.invalidateQueries({ refetchType: "active" });
    }
  }, [online, qc]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-status-progressBg text-status-progressFg text-sm py-2 px-4 flex items-center gap-2 border-b border-line"
    >
      <WifiOff className="w-4 h-4" />
      <span>오프라인 — 변경 사항이 저장되지 않을 수 있어요. 연결되면 자동으로 새로고침됩니다.</span>
    </div>
  );
}
