import { api } from "./client";
import type { Block, BlockType, BlockTreeNode } from "@/types/block";

export interface ListBlocksParams {
  pageId?: string;
  parentBlockId?: string | null;
}

export async function getBlocks(params: ListBlocksParams): Promise<Block[]> {
  const { data } = await api.get<Block[]>("/blocks", {
    params: {
      pageId: params.pageId,
      parentBlockId: params.parentBlockId === null ? "null" : params.parentBlockId,
    },
  });
  return data;
}

export interface BlockTreeResponse {
  blocks: Block[];
  tree: BlockTreeNode[];
}

export async function getBlockTree(pageId: string): Promise<BlockTreeResponse> {
  const { data } = await api.get<BlockTreeResponse>("/blocks/tree", {
    params: { pageId },
  });
  return data;
}

export interface CreateBlockInput {
  _id?: string;
  pageId: string;
  parentBlockId?: string | null;
  type: BlockType;
  content: Record<string, unknown>;
  order: number;
  createdBy?: string;
  updatedBy?: string;
}

export async function createBlock(input: CreateBlockInput): Promise<Block> {
  const { data } = await api.post<Block>("/blocks", input);
  return data;
}

export async function createBlocksBatch(
  items: CreateBlockInput[],
): Promise<Block[]> {
  const { data } = await api.post<Block[]>("/blocks/batch", { items });
  return data;
}

export interface UpdateBlockInput {
  type?: BlockType;
  content?: Record<string, unknown>;
  order?: number;
  parentBlockId?: string | null;
  updatedBy?: string;
}

export async function updateBlock(
  blockId: string,
  input: UpdateBlockInput,
): Promise<Block> {
  const { data } = await api.patch<Block>(`/blocks/${blockId}`, input);
  return data;
}

export interface ReorderBlocksItem {
  blockId: string;
  order: number;
  parentBlockId?: string | null;
}

export async function reorderBlocks(items: ReorderBlocksItem[]): Promise<void> {
  await api.patch("/blocks/reorder", { items });
}

export async function deleteBlock(blockId: string): Promise<void> {
  await api.delete(`/blocks/${blockId}`);
}
