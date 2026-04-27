import { db, newId, nowIso, resetDb } from "./store";
import type { Page } from "@/types/page";
import type { Block } from "@/types/block";

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
    const meetingId = newId("pg_meeting");
    const dateStr = `2026-04-${String(20 + i).padStart(2, "0")}`;
    const mentioned = i < 2 ? [projectIds[3 + i]] : [];
    db.pages.push({
      _id: meetingId,
      workspaceId: wsId,
      parentPageId: meetingsRoot,
      title: `${dateStr} 위클리`,
      emoji: "📝",
      order: i,
      isArchived: false,
      isPublished: false,
      properties: {
        type: "meeting",
        date: dateStr,
        mentionedPageIds: mentioned,
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    });
    seedMeetingBlocks(meetingId, dateStr);
  }
}

function seedMeetingBlocks(pageId: string, dateStr: string): void {
  const items: Block[] = [
    {
      _id: newId("bl"),
      pageId,
      parentBlockId: null,
      type: "heading_2",
      content: {
        props: { level: 2 },
        inline: [{ type: "text", text: "안건", styles: {} }],
      },
      order: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    },
    {
      _id: newId("bl"),
      pageId,
      parentBlockId: null,
      type: "paragraph",
      content: {
        props: {},
        inline: [
          { type: "text", text: `${dateStr} 위클리 회의 노트입니다.`, styles: {} },
        ],
      },
      order: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    },
    {
      _id: newId("bl"),
      pageId,
      parentBlockId: null,
      type: "bulleted_list_item",
      content: {
        props: {},
        inline: [{ type: "text", text: "지난주 진행 정리", styles: {} }],
      },
      order: 2,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    },
    {
      _id: newId("bl"),
      pageId,
      parentBlockId: null,
      type: "bulleted_list_item",
      content: {
        props: {},
        inline: [{ type: "text", text: "이번주 우선순위", styles: {} }],
      },
      order: 3,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    },
  ];
  db.blocks.push(...items);
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
