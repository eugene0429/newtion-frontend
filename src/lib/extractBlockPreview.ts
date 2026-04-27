import type { Block } from "@/types/block";

interface InlineSegment {
  type: string;
  text?: string;
}

function extractInlineText(block: Block): string {
  const c = block.content as { inline?: InlineSegment[] };
  if (!c.inline) return "";
  return c.inline
    .map((seg) => (typeof seg.text === "string" ? seg.text : ""))
    .join("");
}

export function extractBlockPreview(
  blocks: Block[],
  options: { maxLength?: number } = {},
): string {
  const max = options.maxLength ?? 120;
  const lines: string[] = [];
  for (const b of blocks.slice().sort((a, b) => a.order - b.order)) {
    const text = extractInlineText(b).trim();
    if (!text) continue;
    lines.push(text);
    if (lines.join("\n").length >= max) break;
  }
  const joined = lines.join("\n");
  if (joined.length <= max) return joined;
  return joined.slice(0, max) + "…";
}
