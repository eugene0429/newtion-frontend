import { api } from "./client";
import type { Page, PageDetail, PageProperties } from "@/types/page";

export interface ListPagesParams {
  workspaceId: string;
  parentPageId?: string | null;
  mentionedPageId?: string;
  includeArchived?: boolean;
}

export async function getPages(params: ListPagesParams): Promise<Page[]> {
  const { data } = await api.get<Page[]>("/pages", {
    params: {
      workspaceId: params.workspaceId,
      parentPageId: params.parentPageId === null ? "null" : params.parentPageId,
      mentionedPageId: params.mentionedPageId,
      includeArchived: params.includeArchived ? true : undefined,
    },
  });
  return data;
}

export async function searchPages(
  workspaceId: string,
  query: string,
): Promise<Page[]> {
  const { data } = await api.get<Page[]>("/pages/search", {
    params: { workspaceId, query },
  });
  return data;
}

export async function getPageDetail(pageId: string): Promise<PageDetail> {
  const { data } = await api.get<PageDetail>(`/pages/${pageId}/detail`);
  return data;
}

export interface CreatePageInput {
  workspaceId: string;
  parentPageId: string | null;
  title?: string;
  emoji?: string;
  icon?: string;
  order?: number;
  properties?: PageProperties;
  creatorUserId?: string;
}

export async function createPage(input: CreatePageInput): Promise<Page> {
  const { data } = await api.post<Page>("/pages", input);
  return data;
}

export interface UpdatePageInput {
  title?: string;
  emoji?: string;
  icon?: string;
  parentPageId?: string | null;
  order?: number;
  isArchived?: boolean;
  properties?: PageProperties;
  lastEditedBy?: string;
}

export async function updatePage(
  pageId: string,
  input: UpdatePageInput,
): Promise<Page> {
  const { data } = await api.patch<Page>(`/pages/${pageId}`, input);
  return data;
}

export interface ReorderPagesItem {
  pageId: string;
  order: number;
  parentPageId?: string | null;
}

export async function reorderPages(items: ReorderPagesItem[]): Promise<void> {
  await api.patch("/pages/reorder", { items });
}

export async function deletePage(pageId: string): Promise<void> {
  await api.delete(`/pages/${pageId}`);
}
