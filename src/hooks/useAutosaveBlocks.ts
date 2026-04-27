import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createBlocksBatch,
  deleteBlock,
  updateBlock,
} from "@/api/blocks";
import {
  blockNoteToBackend,
  type BlockInput,
  type BlockNoteLikeBlock,
} from "@/lib/blockAdapter";
import { computeBlockDelta } from "@/lib/computeBlockDelta";
import { debounce } from "@/lib/debounce";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveBlocksOptions {
  pageId: string | undefined;
  /** 마지막 저장 스냅샷의 시작값 — 페이지 로드 직후 백엔드 블록을 그대로 넘긴다. */
  initialBlocks: BlockInput[];
  debounceMs?: number;
  retry?: number;
  retryDelay?: number;
}

interface UseAutosaveBlocksResult {
  status: AutosaveStatus;
  save: (blocks: BlockNoteLikeBlock[]) => void;
  flush: () => void;
}

export function useAutosaveBlocks(
  options: UseAutosaveBlocksOptions,
): UseAutosaveBlocksResult {
  const {
    pageId,
    initialBlocks,
    debounceMs = 1000,
    retry = 2,
    retryDelay = 1000,
  } = options;

  const qc = useQueryClient();
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const snapshotRef = useRef<BlockInput[]>(initialBlocks);
  const lastInitialRef = useRef<BlockInput[]>(initialBlocks);
  const lastPageIdRef = useRef<string | undefined>(pageId);

  // Reset snapshot when initialBlocks reference changes (e.g. detail data
  // arrives after loading) or when pageId changes (navigation between meetings).
  // Doing this synchronously during render — instead of in useEffect — avoids a
  // race where the user's first save fires with an empty snapshot and tries to
  // recreate every existing block.
  if (
    lastInitialRef.current !== initialBlocks ||
    lastPageIdRef.current !== pageId
  ) {
    snapshotRef.current = initialBlocks;
    lastInitialRef.current = initialBlocks;
    lastPageIdRef.current = pageId;
  }

  useEffect(() => {
    setStatus("idle");
  }, [pageId]);

  const mutation = useMutation({
    retry,
    retryDelay,
    mutationFn: async (next: BlockInput[]) => {
      if (!pageId) throw new Error("pageId required");
      const delta = computeBlockDelta(snapshotRef.current, next);
      const ops: Promise<unknown>[] = [];
      if (delta.toCreate.length > 0) {
        ops.push(
          createBlocksBatch(
            delta.toCreate.map((b) => ({
              _id: b._id,
              pageId,
              parentBlockId: b.parentBlockId,
              type: b.type,
              content: b.content,
              order: b.order,
            })),
          ),
        );
      }
      delta.toUpdate.forEach((b) => {
        ops.push(
          updateBlock(b._id, {
            type: b.type,
            content: b.content,
            order: b.order,
            parentBlockId: b.parentBlockId,
          }),
        );
      });
      delta.toDelete.forEach((id) => {
        ops.push(deleteBlock(id));
      });
      await Promise.all(ops);
      return next;
    },
    onSuccess: (next) => {
      snapshotRef.current = next;
      setStatus("saved");
      if (pageId) qc.invalidateQueries({ queryKey: ["blocks", pageId] });
    },
    onError: () => {
      setStatus("error");
      toast.error("저장 실패 — 변경 사항이 아직 저장되지 않았습니다");
    },
  });

  const debouncedSave = useMemo(
    () =>
      debounce((blocks: BlockNoteLikeBlock[]) => {
        if (!pageId) return;
        setStatus("saving");
        const next = blockNoteToBackend(blocks, pageId);
        mutation.mutate(next);
      }, debounceMs),
    // mutation은 stable identity. pageId/debounceMs 변경 시에만 새 debouncer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageId, debounceMs],
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    status,
    save: (blocks) => debouncedSave(blocks),
    flush: () => debouncedSave.flush(),
  };
}
