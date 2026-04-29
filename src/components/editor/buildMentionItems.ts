import type { Page } from "@/types/page";

type InlineContent =
  | { type: "text"; text: string }
  | {
      type: "link";
      href: string;
      content: { type: "text"; text: string }[];
    };

export interface MentionItem {
  title: string;
  subtext: string;
  onItemClick: () => void;
}

export function buildMentionItems(
  pages: Page[],
  insertInlineContent: (content: InlineContent[]) => void,
): MentionItem[] {
  const out: MentionItem[] = [];
  for (const p of pages) {
    const t = p.properties.type;
    if (t !== "meeting" && t !== "project") continue;
    const href = t === "project" ? `/projects/${p._id}` : `/meetings/${p._id}`;
    const label = p.title || "제목 없음";
    out.push({
      title: label,
      subtext: t === "project" ? "프로젝트" : "회의록",
      onItemClick: () => {
        insertInlineContent([
          { type: "link", href, content: [{ type: "text", text: label }] },
          { type: "text", text: " " },
        ]);
      },
    });
  }
  return out;
}
