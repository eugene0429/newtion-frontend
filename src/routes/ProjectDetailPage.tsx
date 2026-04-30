import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePageDetail } from "@/hooks/usePageDetail";
import { useUpdatePage } from "@/hooks/usePageMutations";
import { useAutosaveBlocks } from "@/hooks/useAutosaveBlocks";
import { useSyncMentions } from "@/hooks/useSyncMentions";
import { useTogglePin } from "@/hooks/useTogglePin";
import { useWorkspace } from "@/hooks/useWorkspace";
import { searchPages } from "@/api/pages";
import { ProjectModalShell } from "@/components/projects/ProjectModalShell";
import { ProjectMetaBar } from "@/components/projects/ProjectMetaBar";
import { RelatedMeetings } from "@/components/projects/RelatedMeetings";
import { SaveIndicator } from "@/components/editor/SaveIndicator";
import {
  backendToBlockNote,
  type BlockInput,
  type BlockNoteLikeBlock,
} from "@/lib/blockAdapter";
import type { ProjectStatus } from "@/types/page";

const BlockEditor = lazy(() => import("@/components/editor/BlockEditor"));

export default function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id: pageId } = useParams<{ id: string }>();
  const detailQuery = usePageDetail(pageId);
  const updatePage = useUpdatePage();
  const { workspaceId } = useWorkspace();
  const [liveBlocks, setLiveBlocks] = useState<BlockNoteLikeBlock[]>([]);

  const initialBlocks: BlockInput[] = useMemo(() => {
    if (!detailQuery.data) return [];
    return detailQuery.data.blocks.map((b) => ({
      _id: b._id,
      pageId: b.pageId,
      parentBlockId: b.parentBlockId,
      type: b.type,
      content: b.content,
      order: b.order,
    }));
  }, [detailQuery.data]);

  const initialBlockNote: BlockNoteLikeBlock[] = useMemo(() => {
    if (!detailQuery.data) return [];
    return backendToBlockNote(detailQuery.data.blocks);
  }, [detailQuery.data]);

  const autosave = useAutosaveBlocks({
    pageId,
    initialBlocks,
  });

  useSyncMentions({
    pageId,
    currentMentionedPageIds: detailQuery.data?.page.properties.mentionedPageIds ?? [],
    blocks: liveBlocks,
  });

  const onMentionSearch = useCallback(
    async (query: string) => {
      if (!workspaceId) return [];
      return searchPages(workspaceId, query);
    },
    [workspaceId],
  );

  const togglePin = useTogglePin();
  const handleClose = () => navigate("/projects");

  return (
    <ProjectModalShell open={!!pageId} onClose={handleClose}>
      {detailQuery.isLoading ? (
        <p className="p-6 text-muted-ink">불러오는 중...</p>
      ) : detailQuery.isError || !detailQuery.data ? (
        <div className="p-6 space-y-3">
          <p className="text-destructive">프로젝트를 찾을 수 없습니다.</p>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-brand hover:underline"
          >
            ← 칸반으로
          </button>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          <header className="flex items-start justify-between gap-3 pr-20">
            <div className="flex-1 space-y-2">
              <ProjectTitleInput
                title={detailQuery.data.page.title}
                onCommit={(next) => {
                  if (!pageId) return;
                  if (next === detailQuery.data!.page.title) return;
                  updatePage.mutate({
                    pageId,
                    input: { title: next },
                  });
                }}
              />
              <ProjectMetaBar
                project={detailQuery.data.page}
                onStatusChange={(next: ProjectStatus) => {
                  if (!pageId) return;
                  updatePage.mutate({
                    pageId,
                    input: { properties: { status: next } },
                  });
                }}
                onPinToggle={() => {
                  if (!pageId) return;
                  togglePin.mutate({
                    pageId,
                    currentlyPinned: detailQuery.data!.page.properties.isPinned === true,
                  });
                }}
                onProgressChange={(next) => {
                  if (!pageId) return;
                  updatePage.mutate({
                    pageId,
                    input: { properties: { progress: next } },
                  });
                }}
                onTagsChange={(next) => {
                  if (!pageId) return;
                  updatePage.mutate({
                    pageId,
                    input: { properties: { tags: next } },
                  });
                }}
                onDueDateChange={(next) => {
                  if (!pageId) return;
                  updatePage.mutate({
                    pageId,
                    input: { properties: { dueDate: next } },
                  });
                }}
              />
            </div>
            <SaveIndicator status={autosave.status} />
          </header>

          <Suspense
            fallback={<div className="text-muted-ink">에디터 준비 중...</div>}
          >
            <BlockEditor
              key={pageId}
              initialContent={initialBlockNote}
              onChange={(blocks) => {
                setLiveBlocks(blocks);
                autosave.save(blocks);
              }}
              onMentionSearch={onMentionSearch}
            />
          </Suspense>

          <RelatedMeetings projectId={pageId!} />
        </div>
      )}
    </ProjectModalShell>
  );
}

function ProjectTitleInput({
  title,
  onCommit,
}: {
  title: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(title);
  useEffect(() => {
    setDraft(title);
  }, [title]);
  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      placeholder="제목 없음"
      className="w-full bg-transparent text-2xl font-bold text-ink placeholder:text-muted-ink/40 focus:outline-none"
      aria-label="프로젝트 제목"
    />
  );
}
