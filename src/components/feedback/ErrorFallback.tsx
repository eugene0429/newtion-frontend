import { AlertTriangle, RotateCw, RefreshCw } from "lucide-react";

interface Props {
  title: string;
  message: string;
  errorId: string;
  onRetry?: () => void;
  fullscreen?: boolean;
}

export function ErrorFallback({
  title,
  message,
  errorId,
  onRetry,
  fullscreen = false,
}: Props) {
  return (
    <div
      role="alert"
      className={
        fullscreen
          ? "min-h-screen flex items-center justify-center bg-page p-6"
          : "rounded-card border border-line bg-card p-6 max-w-md mx-auto"
      }
    >
      <div className="text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-cta mx-auto" aria-hidden />
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="text-sm text-muted-ink">{message}</p>
        <p className="text-[10px] text-muted-ink font-mono">
          오류 ID: {errorId}
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-brand text-white hover:opacity-90"
            >
              <RotateCw className="w-3.5 h-3.5" />
              재시도
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-line text-ink hover:bg-page"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
