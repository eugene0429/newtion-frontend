import { useQuery } from "@tanstack/react-query";
import { searchPages } from "@/api/pages";
import { useWorkspace } from "./useWorkspace";

export function useSearch(query: string) {
  const { workspaceId } = useWorkspace();
  const trimmed = query.trim();
  const enabled = !!workspaceId && trimmed.length > 0;

  return useQuery({
    queryKey: ["search", workspaceId, trimmed],
    queryFn: () => searchPages(workspaceId!, trimmed),
    enabled,
    staleTime: 30_000,
  });
}
