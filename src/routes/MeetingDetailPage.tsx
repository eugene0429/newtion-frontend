import { Suspense, lazy, useMemo } from "react";
import { useParams } from "react-router-dom";
import { usePageDetail } from "@/hooks/usePageDetail";
import { useUpdatePage } from "@/hooks/usePageMutations";
import { useAutosaveBlocks } from "@/hooks/useAutosaveBlocks";
import { MeetingHeader } from "@/components/meetings/MeetingHeader";
import {
  backendToBlockNote,
  type BlockInput,
  type BlockNoteLikeBlock,
} from "@/lib/blockAdapter";

const BlockEditor = lazy(() => import("@/components/editor/BlockEditor"));

export default function MeetingDetailPage() {
  const { id: pageId } = useParams<{ id: string }>();
  const detailQuery = usePageDetail(pageId);
  const updatePage = useUpdatePage();

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

  if (detailQuery.isLoading) {
    return <div className="p-4 text-muted-ink">불러오는 중...</div>;
  }
  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-4 text-destructive">회의록을 불러오지 못했습니다.</div>
    );
  }

  const page = detailQuery.data.page;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <MeetingHeader
        title={page.title}
        date={page.properties.date}
        onTitleChange={(next) => {
          if (!pageId) return;
          updatePage.mutate({ pageId, input: { title: next } });
        }}
        saveStatus={autosave.status}
      />
      <Suspense fallback={<div className="text-muted-ink">에디터 준비 중...</div>}>
        <BlockEditor
          key={pageId}
          initialContent={initialBlockNote}
          onChange={(blocks) => autosave.save(blocks)}
        />
      </Suspense>
    </div>
  );
}
