export type BlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list_item"
  | "numbered_list_item"
  | "to_do"
  | "quote"
  | "code"
  | "toggle"
  | "image"
  | "file"
  | "divider";

export interface Block {
  _id: string;
  pageId: string;
  parentBlockId: string | null;
  type: BlockType;
  content: Record<string, unknown>;
  order: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  removedAt: string | null;
}

export interface BlockTreeNode extends Block {
  children: BlockTreeNode[];
}
