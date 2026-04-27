import { db, newId, nowIso, resetDb } from "./store";
import type { Page } from "@/types/page";

interface SeedOptions {
  /** 부트스트랩이 워크스페이스를 자동 생성하도록 비워둘지 */
  empty?: boolean;
}

export function seed(options: SeedOptions = {}): void {
  resetDb();
  if (options.empty) return;

  const wsId = newId("ws");
  db.workspaces.push({
    _id: wsId,
    name: "Newtion",
    icon: "N",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    removedAt: null,
  });

  const meetingsRoot = newId("pg_meetings_root");
  const projectsRoot = newId("pg_projects_root");

  db.pages.push(makeRoot(meetingsRoot, wsId, "회의록", "📝", "meetings_root"));
  db.pages.push(makeRoot(projectsRoot, wsId, "프로젝트", "📋", "projects_root"));

  const projectIds: string[] = [];
  const projectStatus: Array<"planned" | "in_progress" | "done"> = [
    "planned", "planned", "planned",
    "in_progress", "in_progress", "in_progress",
    "done", "done",
  ];
  projectStatus.forEach((status, i) => {
    const id = newId("pg_project");
    projectIds.push(id);
    db.pages.push({
      _id: id,
      workspaceId: wsId,
      parentPageId: projectsRoot,
      title: `프로젝트 ${i + 1}`,
      emoji: status === "done" ? "✅" : status === "in_progress" ? "🔥" : "🆕",
      order: i,
      isArchived: false,
      isPublished: false,
      properties: {
        type: "project",
        status,
        progress: status === "in_progress" ? 30 + i * 15 : status === "done" ? 100 : 0,
        tags: i % 2 === 0 ? ["product"] : ["infra"],
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    });
  });

  for (let i = 0; i < 5; i += 1) {
    const id = newId("pg_meeting");
    const mentioned = i < 2 ? [projectIds[3 + i]] : [];
    db.pages.push({
      _id: id,
      workspaceId: wsId,
      parentPageId: meetingsRoot,
      title: `2026-04-${String(20 + i).padStart(2, "0")} 위클리`,
      emoji: "📝",
      order: i,
      isArchived: false,
      isPublished: false,
      properties: {
        type: "meeting",
        date: `2026-04-${String(20 + i).padStart(2, "0")}`,
        mentionedPageIds: mentioned,
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    });
  }
}

function makeRoot(
  id: string,
  workspaceId: string,
  title: string,
  emoji: string,
  role: "meetings_root" | "projects_root",
): Page {
  return {
    _id: id,
    workspaceId,
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
  };
}
