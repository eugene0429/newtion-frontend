import { describe, it, expect } from "vitest";
import { sortByUpdatedAt } from "./sortByUpdatedAt";
import type { Page } from "@/types/page";

const page = (id: string, updatedAt: string): Page => ({
  _id: id,
  workspaceId: "ws_1",
  parentPageId: null,
  title: id,
  order: 0,
  isArchived: false,
  isPublished: false,
  properties: {},
  createdAt: updatedAt,
  updatedAt,
  removedAt: null,
});

describe("sortByUpdatedAt", () => {
  it("최신이 앞으로", () => {
    const result = sortByUpdatedAt([
      page("a", "2026-04-01T00:00:00Z"),
      page("b", "2026-04-29T00:00:00Z"),
      page("c", "2026-04-15T00:00:00Z"),
    ]);
    expect(result.map((p) => p._id)).toEqual(["b", "c", "a"]);
  });

  it("입력 배열을 변형하지 않는다 (불변)", () => {
    const input = [page("a", "2026-04-01T00:00:00Z"), page("b", "2026-04-29T00:00:00Z")];
    const before = input.map((p) => p._id);
    sortByUpdatedAt(input);
    expect(input.map((p) => p._id)).toEqual(before);
  });

  it("limit 옵션은 결과 개수를 제한한다", () => {
    const result = sortByUpdatedAt(
      [
        page("a", "2026-04-01T00:00:00Z"),
        page("b", "2026-04-29T00:00:00Z"),
        page("c", "2026-04-15T00:00:00Z"),
      ],
      2,
    );
    expect(result.map((p) => p._id)).toEqual(["b", "c"]);
  });

  it("동일 updatedAt 은 입력 순서 유지 (안정 정렬)", () => {
    const result = sortByUpdatedAt([
      page("a", "2026-04-01T00:00:00Z"),
      page("b", "2026-04-01T00:00:00Z"),
    ]);
    expect(result.map((p) => p._id)).toEqual(["a", "b"]);
  });
});
