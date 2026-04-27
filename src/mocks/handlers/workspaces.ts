import { http, HttpResponse } from "msw";
import { db, newId, nowIso } from "../db/store";
import type { Workspace, Page, RootFolders } from "@/types/page";

export const workspacesHandlers = [
  http.get("*/workspaces", () => {
    return HttpResponse.json(db.workspaces.filter((w) => w.removedAt === null));
  }),

  http.post("*/workspaces", async ({ request }) => {
    const body = (await request.json()) as Partial<Workspace>;
    const wsId = newId("ws");
    const workspace: Workspace = {
      _id: wsId,
      name: body.name ?? "Untitled",
      description: body.description,
      icon: body.icon,
      ownerUserId: body.ownerUserId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    };
    db.workspaces.push(workspace);

    const meetings = newId("pg_meetings_root");
    const projects = newId("pg_projects_root");
    const makeRoot = (
      id: string,
      title: string,
      emoji: string,
      role: "meetings_root" | "projects_root",
    ): Page => ({
      _id: id,
      workspaceId: wsId,
      parentPageId: null,
      title,
      emoji,
      order: 0,
      isArchived: false,
      isPublished: false,
      properties: { role },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    });
    db.pages.push(makeRoot(meetings, "회의록", "📝", "meetings_root"));
    db.pages.push(makeRoot(projects, "프로젝트", "📋", "projects_root"));

    const rootFolders: RootFolders = { meetings, projects };
    return HttpResponse.json({ workspace, rootFolders });
  }),

  http.get("*/workspaces/:workspaceId/sidebar", ({ params }) => {
    const ws = db.workspaces.find((w) => w._id === params.workspaceId);
    if (!ws) return HttpResponse.json({ message: "not found" }, { status: 404 });
    const pages = db.pages.filter(
      (p) => p.workspaceId === ws._id && p.removedAt === null && !p.isArchived,
    );
    const byParent = new Map<string | null, typeof pages>();
    pages.forEach((p) => {
      const arr = byParent.get(p.parentPageId) ?? [];
      arr.push(p);
      byParent.set(p.parentPageId, arr);
    });
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((p) => ({
          _id: p._id,
          title: p.title,
          emoji: p.emoji,
          icon: p.icon,
          children: build(p._id),
        }));
    return HttpResponse.json({
      workspace: ws,
      tree: build(null),
      flatCount: pages.length,
    });
  }),
];
