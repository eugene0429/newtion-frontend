import type { Block, BlockType } from "@/types/block";

export type BlockNoteType =
  | "paragraph"
  | "heading"
  | "bulletListItem"
  | "numberedListItem"
  | "checkListItem"
  | "quote"
  | "codeBlock"
  | "image"
  | "file";

export interface BlockNoteInlineContent {
  type: "text" | "link";
  text?: string;
  href?: string;
  styles?: Record<string, unknown>;
  content?: BlockNoteInlineContent[];
}

export interface BlockNoteLikeBlock {
  id: string;
  type: BlockNoteType;
  props: Record<string, unknown>;
  content: BlockNoteInlineContent[];
  children: BlockNoteLikeBlock[];
}

export type BlockInput = Pick<
  Block,
  "_id" | "pageId" | "parentBlockId" | "type" | "content" | "order"
>;

interface MappedType {
  type: BlockType;
  props: Record<string, unknown>;
}

interface MappedBlockNoteType {
  type: BlockNoteType;
  props: Record<string, unknown>;
}

export function blockNoteTypeToBackend(
  type: BlockNoteType,
  props: Record<string, unknown>,
): MappedType {
  switch (type) {
    case "paragraph":
      return { type: "paragraph", props };
    case "heading": {
      const level = (props.level as number) ?? 1;
      const clamped = level === 2 ? "heading_2" : level === 3 ? "heading_3" : "heading_1";
      return { type: clamped, props: { ...props, level: level === 2 ? 2 : level === 3 ? 3 : 1 } };
    }
    case "bulletListItem":
      return { type: "bulleted_list_item", props };
    case "numberedListItem":
      return { type: "numbered_list_item", props };
    case "checkListItem":
      return { type: "to_do", props };
    case "quote":
      return { type: "quote", props };
    case "codeBlock":
      return { type: "code", props };
    case "image":
      return { type: "image", props };
    case "file":
      return { type: "file", props };
  }
}

export function backendTypeToBlockNote(
  type: BlockType,
  props: Record<string, unknown>,
): MappedBlockNoteType {
  switch (type) {
    case "paragraph":
      return { type: "paragraph", props };
    case "heading_1":
      return { type: "heading", props: { ...props, level: 1 } };
    case "heading_2":
      return { type: "heading", props: { ...props, level: 2 } };
    case "heading_3":
      return { type: "heading", props: { ...props, level: 3 } };
    case "bulleted_list_item":
      return { type: "bulletListItem", props };
    case "numbered_list_item":
      return { type: "numberedListItem", props };
    case "to_do":
      return { type: "checkListItem", props };
    case "quote":
      return { type: "quote", props };
    case "code":
      return { type: "codeBlock", props };
    case "image":
      return { type: "image", props };
    case "file":
      return { type: "file", props };
    case "toggle":
      // BlockNote 기본 스키마에는 toggle이 없음 — paragraph로 다운그레이드.
      return { type: "paragraph", props };
    case "divider":
      // BlockNote 기본 스키마에는 divider 정식 타입이 없음 — paragraph로 다운그레이드.
      return { type: "paragraph", props };
  }
}

export function blockNoteToBackend(
  blocks: BlockNoteLikeBlock[],
  pageId: string,
  parentBlockId: string | null = null,
): BlockInput[] {
  const out: BlockInput[] = [];
  blocks.forEach((b, index) => {
    const mapped = blockNoteTypeToBackend(b.type, b.props);
    out.push({
      _id: b.id,
      pageId,
      parentBlockId,
      type: mapped.type,
      content: { props: mapped.props, inline: b.content },
      order: index,
    });
    if (b.children.length > 0) {
      out.push(...blockNoteToBackend(b.children, pageId, b.id));
    }
  });
  return out;
}

export function backendToBlockNote(
  blocks: Pick<Block, "_id" | "parentBlockId" | "type" | "content" | "order">[],
): BlockNoteLikeBlock[] {
  const byParent = new Map<string | null, typeof blocks>();
  blocks.forEach((b) => {
    const arr = byParent.get(b.parentBlockId) ?? [];
    arr.push(b);
    byParent.set(b.parentBlockId, arr);
  });

  const build = (parentId: string | null): BlockNoteLikeBlock[] => {
    const list = (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.order - b.order);
    return list.map((b) => {
      const c = b.content as { props?: Record<string, unknown>; inline?: BlockNoteInlineContent[] };
      const mapped = backendTypeToBlockNote(b.type, c.props ?? {});
      return {
        id: b._id,
        type: mapped.type,
        props: mapped.props,
        content: c.inline ?? [],
        children: build(b._id),
      };
    });
  };

  return build(null);
}
