import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePage } from "@/api/pages";

interface Vars {
  pageId: string;
  currentlyPinned: boolean;
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, currentlyPinned }: Vars) =>
      updatePage(pageId, { properties: { isPinned: !currentlyPinned } }),
    onSettled: (_data, _err, { pageId }) => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      qc.invalidateQueries({ queryKey: ["page-detail", pageId] });
    },
  });
}
