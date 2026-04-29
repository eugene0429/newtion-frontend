import { describe, it, expect } from "vitest";
import {
  PROJECT_STATUSES,
  projectStatusLabel,
  projectStatusEmoji,
  projectStatusBadgeClass,
} from "./projectStatus";

describe("projectStatus helpers", () => {
  it("PROJECT_STATUSES 는 spec 4-4 순서 (예정 → 진행중 → 완료)", () => {
    expect(PROJECT_STATUSES).toEqual(["planned", "in_progress", "done"]);
  });

  it("projectStatusLabel 은 한국어 라벨을 돌려준다", () => {
    expect(projectStatusLabel("planned")).toBe("예정");
    expect(projectStatusLabel("in_progress")).toBe("진행중");
    expect(projectStatusLabel("done")).toBe("완료");
  });

  it("projectStatusEmoji 는 spec 컬러 이모지", () => {
    expect(projectStatusEmoji("planned")).toBe("🟦");
    expect(projectStatusEmoji("in_progress")).toBe("🟧");
    expect(projectStatusEmoji("done")).toBe("🟩");
  });

  it("projectStatusBadgeClass 는 tailwind 토큰을 포함한다", () => {
    expect(projectStatusBadgeClass("planned")).toContain("status-plannedFg");
    expect(projectStatusBadgeClass("in_progress")).toContain(
      "status-progressFg",
    );
    expect(projectStatusBadgeClass("done")).toContain("status-doneFg");
  });
});
