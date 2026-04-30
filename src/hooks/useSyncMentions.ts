import { useEffect, useMemo, useRef } from "react";
import { useUpdatePage } from "./usePageMutations";
import { extractMentions } from "@/lib/extractMentions";
import { debounce } from "@/lib/debounce";
import type { BlockNoteLikeBlock } from "@/lib/blockAdapter";

interface Options {
  pageId: string | undefined;
  currentMentionedPageIds: string[];
  blocks: BlockNoteLikeBlock[];
  debounceMs?: number;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

export function useSyncMentions(opts: Options): void {
  const { pageId, currentMentionedPageIds, blocks, debounceMs = 1000 } = opts;
  const updatePage = useUpdatePage();
  const currentRef = useRef(currentMentionedPageIds);
  currentRef.current = currentMentionedPageIds;

  const debounced = useMemo(
    () =>
      debounce((next: string[]) => {
        if (!pageId) return;
        if (sameSet(next, currentRef.current)) return;
        updatePage.mutate({
          pageId,
          input: { properties: { mentionedPageIds: next } },
        });
      }, debounceMs),
    // updatePage 는 stable identity 가 아니지만 mutate 가 ref-stable 한 점에 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageId, debounceMs],
  );

  useEffect(() => {
    if (!pageId) return;
    const next = extractMentions(blocks);
    debounced(next);
  }, [pageId, blocks, debounced]);

  useEffect(() => () => debounced.cancel(), [debounced]);
}
