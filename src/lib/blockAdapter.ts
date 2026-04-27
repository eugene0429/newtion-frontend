import type { Block, BlockType } from "@/types/block";

export interface BlockNoteInlineContent {
  type: "text" | "link";
  text?: string;
  href?: string;
  styles?: Record<string, unknown>;
  content?: BlockNoteInlineContent[];
}

export interface BlockNoteLikeBlock {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  content: BlockNoteInlineContent[];
  children: BlockNoteLikeBlock[];
}

export type BlockInput = Pick<
  Block,
  "_id" | "pageId" | "parentBlockId" | "type" | "content" | "order"
>;

export function blockNoteToBackend(
  blocks: BlockNoteLikeBlock[],
  pageId: string,
  parentBlockId: string | null = null,
): BlockInput[] {
  const out: BlockInput[] = [];
  blocks.forEach((b, index) => {
    out.push({
      _id: b.id,
      pageId,
      parentBlockId,
      type: b.type,
      content: { props: b.props, inline: b.content },
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
      return {
        id: b._id,
        type: b.type,
        props: c.props ?? {},
        content: c.inline ?? [],
        children: build(b._id),
      };
    });
  };

  return build(null);
}
