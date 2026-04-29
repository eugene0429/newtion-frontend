import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPage,
  updatePage,
  deletePage,
  type CreatePageInput,
  type UpdatePageInput,
} from "@/api/pages";
import type { Page } from "@/types/page";

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePageInput) => createPage(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}

interface UpdatePageVariables {
  pageId: string;
  input: UpdatePageInput;
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, input }: UpdatePageVariables) =>
      updatePage(pageId, input),
    onMutate: async ({ pageId, input }) => {
      await qc.cancelQueries({ queryKey: ["page-detail", pageId] });
      const previous = qc.getQueryData<{ page: Page }>([
        "page-detail",
        pageId,
      ]);
      if (previous) {
        const { properties: nextProps, ...rest } = input;
        qc.setQueryData(["page-detail", pageId], {
          ...previous,
          page: {
            ...previous.page,
            ...rest,
            properties: nextProps
              ? { ...previous.page.properties, ...nextProps }
              : previous.page.properties,
          },
        });
      }
      return { previous };
    },
    onError: (_error, { pageId }, context) => {
      if (context?.previous) {
        qc.setQueryData(["page-detail", pageId], context.previous);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      qc.invalidateQueries({ queryKey: ["page-detail", pageId] });
    },
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => deletePage(pageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}
