import { http, HttpResponse } from "msw";
import { db, newId, nowIso } from "../db/store";
import type { Page } from "@/types/page";

function activePages(): Page[] {
  return db.pages.filter((p) => p.removedAt === null);
}

export const pagesHandlers = [
  http.get("*/pages/search", ({ request }) => {
    const url = new URL(request.url);
    const wsId = url.searchParams.get("workspaceId");
    const q = (url.searchParams.get("query") ?? "").toLowerCase();
    const result = activePages().filter(
      (p) =>
        p.workspaceId === wsId &&
        !p.isArchived &&
        p.title.toLowerCase().includes(q),
    );
    return HttpResponse.json(result);
  }),

  http.get("*/pages", ({ request }) => {
    const url = new URL(request.url);
    const wsId = url.searchParams.get("workspaceId");
    const parent = url.searchParams.get("parentPageId");
    const mentioned = url.searchParams.get("mentionedPageId");
    const includeArchived = url.searchParams.get("includeArchived") === "true";

    let result = activePages().filter((p) => p.workspaceId === wsId);
    if (!includeArchived) result = result.filter((p) => !p.isArchived);
    if (parent !== null) {
      const want = parent === "null" ? null : parent;
      result = result.filter((p) => p.parentPageId === want);
    }
    if (mentioned) {
      result = result.filter((p) =>
        (p.properties.mentionedPageIds ?? []).includes(mentioned),
      );
    }
    result.sort((a, b) => a.order - b.order);
    return HttpResponse.json(result);
  }),

  http.get("*/pages/:pageId/detail", ({ params }) => {
    const page = activePages().find((p) => p._id === params.pageId);
    if (!page) return HttpResponse.json({ message: "not found" }, { status: 404 });
    const blocks = db.blocks.filter(
      (b) => b.pageId === page._id && b.removedAt === null,
    );
    const byParent = new Map<string | null, typeof blocks>();
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
    return HttpResponse.json({
      page,
      blocks,
      blockTree: build(null),
    });
  }),

  http.post("*/pages", async ({ request }) => {
    const body = (await request.json()) as Partial<Page>;
    const page: Page = {
      _id: newId("pg"),
      workspaceId: body.workspaceId!,
      parentPageId: body.parentPageId ?? null,
      title: body.title ?? "Untitled",
      emoji: body.emoji,
      icon: body.icon,
      coverUrl: body.coverUrl,
      order: body.order ?? 0,
      isArchived: false,
      isPublished: body.isPublished ?? false,
      properties: body.properties ?? {},
      creatorUserId: body.creatorUserId,
      lastEditedBy: body.lastEditedBy,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    };
    db.pages.push(page);
    return HttpResponse.json(page);
  }),

  http.patch("*/pages/reorder", async ({ request }) => {
    const { items } = (await request.json()) as {
      items: Array<{ pageId: string; order: number; parentPageId?: string | null }>;
    };
    items.forEach((item) => {
      const p = db.pages.find((x) => x._id === item.pageId);
      if (!p) return;
      p.order = item.order;
      if (item.parentPageId !== undefined) p.parentPageId = item.parentPageId;
      p.updatedAt = nowIso();
    });
    return HttpResponse.json({ ok: true });
  }),

  http.patch("*/pages/:pageId", async ({ params, request }) => {
    const body = (await request.json()) as Partial<Page>;
    const p = db.pages.find((x) => x._id === params.pageId);
    if (!p) {
      return HttpResponse.json({ message: "not found" }, { status: 404 });
    }
    const { properties: nextProps, ...rest } = body;
    Object.assign(p, rest, { updatedAt: nowIso() });
    if (nextProps) {
      p.properties = { ...p.properties, ...nextProps };
    }
    return HttpResponse.json(p);
  }),

  http.delete("*/pages/:pageId", ({ params }) => {
    const p = db.pages.find((x) => x._id === params.pageId);
    if (!p) return HttpResponse.json({ message: "not found" }, { status: 404 });
    p.removedAt = nowIso();
    db.pages
      .filter((x) => x.parentPageId === p._id)
      .forEach((child) => (child.removedAt = nowIso()));
    return HttpResponse.json({ ok: true });
  }),
];
