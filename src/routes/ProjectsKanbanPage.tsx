import { useMemo } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePages } from "@/hooks/usePages";
import { useCreatePage } from "@/hooks/usePageMutations";
import { getBlockTree } from "@/api/blocks";
import { extractBlockPreview } from "@/lib/extractBlockPreview";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { KanbanBoardSkeleton } from "@/components/skeletons/KanbanBoardSkeleton";
import type { ProjectStatus } from "@/types/page";

export default function ProjectsKanbanPage() {
  const navigate = useNavigate();
  const { workspaceId, rootFolders } = useWorkspace();
  const projectsRoot = rootFolders?.projects;
  const projectsQuery = usePages({
    workspaceId,
    parentPageId: projectsRoot,
  });
  const projects = projectsQuery.data ?? [];

  const previewQueries = useQueries({
    queries: projects.map((p) => ({
      queryKey: ["blocks", p._id],
      queryFn: () => getBlockTree(p._id),
      enabled: !!p._id,
      staleTime: 60_000,
    })),
  });

  const previews = useMemo(() => {
    const out: Record<string, string> = {};
    projects.forEach((p, i) => {
      const data = previewQueries[i]?.data;
      out[p._id] = data
        ? extractBlockPreview(data.blocks, { maxLength: 80 })
        : "";
    });
    return out;
  }, [projects, previewQueries]);

  const createPage = useCreatePage();

  const handleAddCard = async (status: ProjectStatus) => {
    if (!workspaceId || !projectsRoot) return;
    const created = await createPage.mutateAsync({
      workspaceId,
      parentPageId: projectsRoot,
      title: "",
      emoji: "🆕",
      order: -Date.now(),
      properties: { type: "project", status },
    });
    navigate(`/projects/${created._id}`);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">프로젝트</h1>
        <button
          type="button"
          onClick={() => handleAddCard("planned")}
          disabled={createPage.isPending || !workspaceId}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-brand text-white text-sm hover:bg-brand/90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {createPage.isPending ? "생성 중..." : "새 프로젝트"}
        </button>
      </header>

      {projectsQuery.isLoading ? (
        <KanbanBoardSkeleton />
      ) : (
        <KanbanBoard
          projects={projects}
          previews={previews}
          onAddCard={handleAddCard}
          isCreating={createPage.isPending}
        />
      )}

      <Outlet />
    </div>
  );
}
