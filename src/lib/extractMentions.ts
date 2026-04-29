import type { BlockNoteLikeBlock } from "./blockAdapter";

const MENTION_HREF_RE = /^\/(meetings|projects)\/([^/?#]+)/;

export function extractMentions(blocks: BlockNoteLikeBlock[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];

  const visit = (list: BlockNoteLikeBlock[]) => {
    for (const block of list) {
      for (const inline of block.content) {
        if (inline.type !== "link") continue;
        const href = (inline as { href?: string }).href;
        if (!href) continue;
        const m = MENTION_HREF_RE.exec(href);
        if (!m) continue;
        const pageId = m[2];
        if (seen.has(pageId)) continue;
        seen.add(pageId);
        order.push(pageId);
      }
      if (block.children.length > 0) visit(block.children);
    }
  };

  visit(blocks);
  return order;
}
