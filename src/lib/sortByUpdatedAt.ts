import type { Page } from "@/types/page";

export function sortByUpdatedAt(pages: Page[], limit?: number): Page[] {
  const indexed = pages.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => {
    const ta = new Date(a.p.updatedAt).getTime();
    const tb = new Date(b.p.updatedAt).getTime();
    if (tb !== ta) return tb - ta;
    return a.i - b.i;
  });
  const out = indexed.map((x) => x.p);
  return typeof limit === "number" ? out.slice(0, limit) : out;
}
