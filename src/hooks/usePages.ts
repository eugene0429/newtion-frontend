import { useQuery } from "@tanstack/react-query";
import { getPages } from "@/api/pages";

interface UsePagesParams {
  workspaceId: string | undefined;
  parentPageId?: string | null;
  mentionedPageId?: string;
  includeArchived?: boolean;
}

export function usePages(params: UsePagesParams) {
  const enabled =
    !!params.workspaceId &&
    (params.parentPageId !== undefined || params.mentionedPageId !== undefined);

  return useQuery({
    queryKey: [
      "pages",
      {
        workspaceId: params.workspaceId,
        parentPageId: params.parentPageId,
        mentionedPageId: params.mentionedPageId,
        includeArchived: params.includeArchived ?? false,
      },
    ],
    queryFn: () =>
      getPages({
        workspaceId: params.workspaceId!,
        parentPageId: params.parentPageId,
        mentionedPageId: params.mentionedPageId,
        includeArchived: params.includeArchived,
      }),
    enabled,
  });
}
