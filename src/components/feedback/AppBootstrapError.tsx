import { useMemo } from "react";
import { ErrorFallback } from "./ErrorFallback";
import { errorId as makeId } from "@/lib/errorId";

interface Props {
  error: unknown;
  onRetry: () => void;
}

export function AppBootstrapError({ error, onRetry }: Props) {
  const message =
    error instanceof Error ? error.message : "워크스페이스를 불러올 수 없어요";
  const id = useMemo(() => makeId(), [error]);
  return (
    <ErrorFallback
      fullscreen
      title="Newtion 을 시작할 수 없어요"
      message={message}
      errorId={id}
      onRetry={onRetry}
    />
  );
}
