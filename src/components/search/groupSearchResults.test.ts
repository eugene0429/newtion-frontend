import { describe, it, expect } from "vitest";
import { groupSearchResults } from "./groupSearchResults";
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

describe("groupSearchResults", () => {
  it("type=meeting 과 type=project 를 별도 배열로 분리한다", () => {
    const result = groupSearchResults([
      page("p1", "project", "프로젝트 1"),
      page("m1", "meeting", "회의 1"),
      page("p2", "project", "프로젝트 2"),
    ]);
    expect(result.meetings.map((p) => p._id)).toEqual(["m1"]);
    expect(result.projects.map((p) => p._id)).toEqual(["p1", "p2"]);
  });

  it("type 이 비어있는 페이지는 둘 다에서 제외한다 (root 폴더 등)", () => {
    const result = groupSearchResults([
      { ...page("r", "meeting", "root"), properties: { role: "meetings_root" } },
      page("m1", "meeting", "회의 1"),
    ]);
    expect(result.meetings.map((p) => p._id)).toEqual(["m1"]);
    expect(result.projects).toEqual([]);
  });

  it("입력 순서를 보존한다", () => {
    const result = groupSearchResults([
      page("m2", "meeting", "회의 2"),
      page("m1", "meeting", "회의 1"),
    ]);
    expect(result.meetings.map((p) => p._id)).toEqual(["m2", "m1"]);
  });
});
