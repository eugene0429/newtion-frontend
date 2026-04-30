import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPages } from "@/api/pages";
import { sortByUpdatedAt } from "@/lib/sortByUpdatedAt";
import { useWorkspace } from "./useWorkspace";
import type { Page } from "@/types/page";

export function useFavoritePages(limit: number) {
  const { workspaceId } = useWorkspace();
  const query = useQuery({
    queryKey: ["pages", { workspaceId, parentPageId: undefined, includeArchived: false }],
    queryFn: () => getPages({ workspaceId: workspaceId!, includeArchived: false }),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const filtered = useMemo<Page[] | undefined>(() => {
    if (!query.data) return undefined;
    const candidates = query.data.filter(
      (p) =>
        (p.properties.type === "meeting" || p.properties.type === "project") &&
        p.properties.isPinned === true,
    );
    return sortByUpdatedAt(candidates, limit);
  }, [query.data, limit]);

  return { ...query, data: filtered };
}
