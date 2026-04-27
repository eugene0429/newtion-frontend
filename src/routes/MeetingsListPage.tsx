import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePages } from "@/hooks/usePages";
import { useCreatePage } from "@/hooks/usePageMutations";
import { getBlockTree } from "@/api/blocks";
import { extractBlockPreview } from "@/lib/extractBlockPreview";
import { groupMeetingsByMonth } from "@/lib/groupMeetingsByMonth";
import { MeetingsGrid } from "@/components/meetings/MeetingsGrid";
import { MeetingsListSkeleton } from "@/components/meetings/MeetingsListSkeleton";
import { MeetingsListEmpty } from "@/components/meetings/MeetingsListEmpty";

export default function MeetingsListPage() {
  const navigate = useNavigate();
  const { workspaceId, rootFolders } = useWorkspace();
  const meetingsRoot = rootFolders?.meetings;
  const meetingsQuery = usePages({
    workspaceId,
    parentPageId: meetingsRoot,
  });
  const meetings = meetingsQuery.data ?? [];

  const previewQueries = useQueries({
    queries: meetings.map((m) => ({
      queryKey: ["blocks", m._id],
      queryFn: () => getBlockTree(m._id),
      enabled: !!m._id,
      staleTime: 60_000,
    })),
  });

  const previews = useMemo(() => {
    const out: Record<string, string> = {};
    meetings.forEach((m, i) => {
      const data = previewQueries[i]?.data;
      out[m._id] = data
        ? extractBlockPreview(data.blocks, { maxLength: 120 })
        : "";
    });
    return out;
  }, [meetings, previewQueries]);

  const groups = useMemo(() => groupMeetingsByMonth(meetings), [meetings]);

  const createPage = useCreatePage();

  const handleCreate = async () => {
    if (!workspaceId || !meetingsRoot) return;
    const today = new Date().toISOString().slice(0, 10);
    const created = await createPage.mutateAsync({
      workspaceId,
      parentPageId: meetingsRoot,
      title: "",
      emoji: "📝",
      order: -Date.now(),
      properties: { type: "meeting", date: today },
    });
    navigate(`/meetings/${created._id}`);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">회의록</h1>
        <button
          type="button"
          onClick={handleCreate}
          disabled={createPage.isPending || !workspaceId}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-brand text-white text-sm hover:bg-brand/90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {createPage.isPending ? "생성 중..." : "새 회의록"}
        </button>
      </header>

      {meetingsQuery.isLoading ? (
        <MeetingsListSkeleton />
      ) : meetings.length === 0 ? (
        <MeetingsListEmpty
          onCreate={handleCreate}
          isCreating={createPage.isPending}
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} className="space-y-4">
              <h2 className="text-sm font-medium text-muted-ink">
                {group.label}
              </h2>
              <MeetingsGrid meetings={group.items} previews={previews} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
