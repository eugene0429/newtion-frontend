import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPages } from "@/api/pages";
import { useWorkspace } from "@/hooks/useWorkspace";
import { BentoCard } from "./BentoCard";
import type { Page } from "@/types/page";

export function ProjectsInProgressCard() {
  const { workspaceId, rootFolders } = useWorkspace();
  const projectsRoot = rootFolders?.projects;
  const query = useQuery({
    queryKey: ["pages", { workspaceId, parentPageId: projectsRoot, includeArchived: false }],
    queryFn: () =>
      getPages({
        workspaceId: workspaceId!,
        parentPageId: projectsRoot,
        includeArchived: false,
      }),
    enabled: !!workspaceId && !!projectsRoot,
    staleTime: 30_000,
  });

  const inProgress = useMemo<Page[]>(() => {
    return (query.data ?? []).filter(
      (p) => p.properties.status === "in_progress",
    );
  }, [query.data]);

  return (
    <BentoCard
      title="진행중 프로젝트"
      accent="orange"
      span="2x1"
      seeMoreHref="/projects"
    >
      {query.isLoading ? (
        <p className="text-xs text-muted-ink">불러오는 중...</p>
      ) : inProgress.length === 0 ? (
        <p className="text-xs text-muted-ink">진행중인 프로젝트 없음</p>
      ) : (
        <ul className="space-y-2">
          {inProgress.map((p) => {
            const progress = Math.max(
              0,
              Math.min(100, p.properties.progress ?? 0),
            );
            return (
              <li key={p._id}>
                <Link
                  to={`/projects/${p._id}`}
                  className="block hover:bg-page rounded-md p-2 -mx-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink line-clamp-1">{p.title}</span>
                    <span className="text-xs text-muted-ink shrink-0 ml-2">
                      {progress}%
                    </span>
                  </div>
                  <div
                    className="h-1 w-full rounded-full bg-line/60 overflow-hidden mt-1"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div
                      className="h-full bg-status-progressFg"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </BentoCard>
  );
}
