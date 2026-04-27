import { useQuery } from "@tanstack/react-query";
import { getBlockTree } from "@/api/blocks";

export function useBlocks(pageId: string | undefined) {
  return useQuery({
    queryKey: ["blocks", pageId],
    queryFn: () => getBlockTree(pageId!),
    enabled: !!pageId,
  });
}
