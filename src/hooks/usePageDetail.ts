import { useQuery } from "@tanstack/react-query";
import { getPageDetail } from "@/api/pages";

export function usePageDetail(pageId: string | undefined) {
  return useQuery({
    queryKey: ["page-detail", pageId],
    queryFn: () => getPageDetail(pageId!),
    enabled: !!pageId,
  });
}
