import { describe, it, expect } from "vitest";
import { planKanbanDragMove } from "./planKanbanDragMove";
import type { Page } from "@/types/page";

function project(
  id: string,
  status: "planned" | "in_progress" | "done",
  order: number,
): Page {
  return {
    _id: id,
    workspaceId: "ws_1",
    parentPageId: "pg_projects_root",
    title: id,
    order,
    isArchived: false,
    isPublished: false,
    properties: { type: "project", status },
    createdAt: "2026-04-29T00:00:00.000Z",
    updatedAt: "2026-04-29T00:00:00.000Z",
    removedAt: null,
  };
}

const projects: Page[] = [
  project("p1", "planned", 0),
  project("p2", "planned", 1000),
  project("p3", "planned", 2000),
  project("p4", "in_progress", 0),
  project("p5", "in_progress", 1000),
  project("p6", "done", 0),
];

describe("planKanbanDragMove", () => {
  it("다른 컬럼 카드 위에 드롭하면 status 가 그 컬럼으로 바뀌고 새 order 는 카드 사이로 들어간다", () => {
    const move = planKanbanDragMove({
      projects,
      draggedId: "p1",
      overId: "p5",
    });
    expect(move).not.toBeNull();
    expect(move!.pageId).toBe("p1");
    expect(move!.newStatus).toBe("in_progress");
    expect(move!.newOrder).toBe(500);
  });

  it("빈 컬럼(droppable column) 위에 드롭하면 그 컬럼으로 이동, order=0", () => {
    const move = planKanbanDragMove({
      projects,
      draggedId: "p1",
      overId: "column:done",
    });
    expect(move).not.toBeNull();
    expect(move!.newStatus).toBe("done");
    expect(move!.newOrder).toBe(1000);
  });

  it("같은 컬럼 같은 자리 드롭은 null (no-op)", () => {
    const move = planKanbanDragMove({
      projects,
      draggedId: "p2",
      overId: "p2",
    });
    expect(move).toBeNull();
  });

  it("같은 컬럼 다른 카드 위 드롭은 컬럼 내 재정렬", () => {
    const move = planKanbanDragMove({
      projects,
      draggedId: "p3",
      overId: "p1",
    });
    expect(move).not.toBeNull();
    expect(move!.newStatus).toBe("planned");
    expect(move!.newOrder).toBe(-1000);
  });

  it("dragged id 가 프로젝트 목록에 없으면 null", () => {
    const move = planKanbanDragMove({
      projects,
      draggedId: "ghost",
      overId: "p1",
    });
    expect(move).toBeNull();
  });

  it("over id 가 프로젝트도 컬럼도 아니면 null", () => {
    const move = planKanbanDragMove({
      projects,
      draggedId: "p1",
      overId: "garbage",
    });
    expect(move).toBeNull();
  });

  it("status 가 없는 프로젝트는 planned 로 간주", () => {
    const noStatus = project("orphan", "planned", 5000);
    delete noStatus.properties.status;
    const move = planKanbanDragMove({
      projects: [...projects, noStatus],
      draggedId: "orphan",
      overId: "column:in_progress",
    });
    expect(move!.newStatus).toBe("in_progress");
  });
});
