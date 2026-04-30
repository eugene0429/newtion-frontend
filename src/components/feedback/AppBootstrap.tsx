import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/useWorkspace";
import { AppBootstrapSkeleton } from "./AppBootstrapSkeleton";
import { AppBootstrapError } from "./AppBootstrapError";

interface Props {
  children: ReactNode;
}

export function AppBootstrap({ children }: Props) {
  const ws = useWorkspace();
  const qc = useQueryClient();

  if (ws.isLoading) return <AppBootstrapSkeleton />;
  if (ws.error) {
    return (
      <AppBootstrapError
        error={ws.error}
        onRetry={() =>
          qc.invalidateQueries({ queryKey: ["bootstrap-workspace"] })
        }
      />
    );
  }
  return <>{children}</>;
}
