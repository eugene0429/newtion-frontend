import { http, HttpResponse } from "msw";
import { db, newId, nowIso } from "../db/store";
import type { Block } from "@/types/block";

function activeBlocks(): Block[] {
  return db.blocks.filter((b) => b.removedAt === null);
}

export const blocksHandlers = [
  http.get("*/blocks/tree", ({ request }) => {
    const url = new URL(request.url);
    const pageId = url.searchParams.get("pageId");
    const blocks = activeBlocks().filter((b) => b.pageId === pageId);
    const byParent = new Map<string | null, Block[]>();
    blocks.forEach((b) => {
      const arr = byParent.get(b.parentBlockId) ?? [];
      arr.push(b);
      byParent.set(b.parentBlockId, arr);
    });
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((b) => ({ ...b, children: build(b._id) }));
    return HttpResponse.json({ blocks, tree: build(null) });
  }),

  http.get("*/blocks", ({ request }) => {
    const url = new URL(request.url);
    const pageId = url.searchParams.get("pageId");
    const parent = url.searchParams.get("parentBlockId");
    let result = activeBlocks();
    if (pageId) result = result.filter((b) => b.pageId === pageId);
    if (parent !== null) {
      const want = parent === "null" ? null : parent;
      result = result.filter((b) => b.parentBlockId === want);
    }
    result.sort((a, b) => a.order - b.order);
    return HttpResponse.json(result);
  }),

  http.post("*/blocks/batch", async ({ request }) => {
    const { items } = (await request.json()) as { items: Partial<Block>[] };
    const created: Block[] = items.map((item, i) => ({
      _id: item._id ?? newId("bl"),
      pageId: item.pageId!,
      parentBlockId: item.parentBlockId ?? null,
      type: item.type!,
      content: item.content ?? {},
      order: item.order ?? i,
      createdBy: item.createdBy,
      updatedBy: item.updatedBy,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    }));
    db.blocks.push(...created);
    return HttpResponse.json(created);
  }),

  http.post("*/blocks", async ({ request }) => {
    const body = (await request.json()) as Partial<Block>;
    const b: Block = {
      _id: body._id ?? newId("bl"),
      pageId: body.pageId!,
      parentBlockId: body.parentBlockId ?? null,
      type: body.type!,
      content: body.content ?? {},
      order: body.order ?? 0,
      createdBy: body.createdBy,
      updatedBy: body.updatedBy,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    };
    db.blocks.push(b);
    return HttpResponse.json(b);
  }),

  http.patch("*/blocks/reorder", async ({ request }) => {
    const { items } = (await request.json()) as {
      items: Array<{ blockId: string; order: number; parentBlockId?: string | null }>;
    };
    items.forEach((item) => {
      const b = db.blocks.find((x) => x._id === item.blockId);
      if (!b) return;
      b.order = item.order;
      if (item.parentBlockId !== undefined) b.parentBlockId = item.parentBlockId;
      b.updatedAt = nowIso();
    });
    return HttpResponse.json({ ok: true });
  }),

  http.patch("*/blocks/:blockId", async ({ params, request }) => {
    const body = (await request.json()) as Partial<Block>;
    const b = db.blocks.find((x) => x._id === params.blockId);
    if (!b) return HttpResponse.json({ message: "not found" }, { status: 404 });
    Object.assign(b, body, { updatedAt: nowIso() });
    return HttpResponse.json(b);
  }),

  http.delete("*/blocks/:blockId", ({ params }) => {
    const b = db.blocks.find((x) => x._id === params.blockId);
    if (!b) return HttpResponse.json({ message: "not found" }, { status: 404 });
    b.removedAt = nowIso();
    return HttpResponse.json({ ok: true });
  }),
];
