import { describe, it, expect, vi } from "vitest";
import { buildMentionItems } from "./buildMentionItems";
import type { Page } from "@/types/page";

const page = (id: string, type: "meeting" | "project", title: string): Page => ({
  _id: id,
  workspaceId: "ws_1",
  parentPageId: null,
  title,
  order: 0,
  isArchived: false,
  isPublished: false,
  properties: { type },
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
  removedAt: null,
});

describe("buildMentionItems", () => {
  it("회의록과 프로젝트 모두 멘션 가능 항목으로 만든다", () => {
    const items = buildMentionItems(
      [page("p1", "project", "프로젝트 1"), page("m1", "meeting", "회의 1")],
      vi.fn(),
    );
    expect(items.map((i) => i.title)).toEqual(["프로젝트 1", "회의 1"]);
  });

  it("project 타입은 /projects/:id 로 link 를 삽입한다", () => {
    const insert = vi.fn();
    const items = buildMentionItems(
      [page("p1", "project", "프로젝트 1")],
      insert,
    );
    items[0].onItemClick();
    expect(insert).toHaveBeenCalledWith([
      {
        type: "link",
        href: "/projects/p1",
        content: [{ type: "text", text: "프로젝트 1" }],
      },
      { type: "text", text: " " },
    ]);
  });

  it("meeting 타입은 /meetings/:id 로 link 를 삽입한다", () => {
    const insert = vi.fn();
    const items = buildMentionItems(
      [page("m1", "meeting", "회의 1")],
      insert,
    );
    items[0].onItemClick();
    expect(insert).toHaveBeenCalledWith([
      {
        type: "link",
        href: "/meetings/m1",
        content: [{ type: "text", text: "회의 1" }],
      },
      { type: "text", text: " " },
    ]);
  });

  it("type 이 비어있는 페이지는 결과에서 제외한다", () => {
    const items = buildMentionItems(
      [{ ...page("r", "meeting", "root"), properties: { role: "meetings_root" } }],
      vi.fn(),
    );
    expect(items).toEqual([]);
  });
});
