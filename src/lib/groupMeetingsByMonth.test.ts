import { groupMeetingsByMonth } from "./groupMeetingsByMonth";
import type { Page } from "@/types/page";

const meeting = (id: string, date: string, order = 0): Page => ({
  _id: id,
  workspaceId: "ws",
  parentPageId: "root",
  title: id,
  order,
  isArchived: false,
  isPublished: false,
  properties: { type: "meeting", date },
  createdAt: "",
  updatedAt: "",
  removedAt: null,
});

describe("groupMeetingsByMonth", () => {
  it("groups by year+month from properties.date", () => {
    const out = groupMeetingsByMonth([
      meeting("a", "2026-04-20"),
      meeting("b", "2026-04-22"),
      meeting("c", "2026-03-10"),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe("2026년 4월");
    expect(out[0].items.map((m) => m._id).sort()).toEqual(["a", "b"]);
    expect(out[1].label).toBe("2026년 3월");
    expect(out[1].items.map((m) => m._id)).toEqual(["c"]);
  });

  it("orders months newest first", () => {
    const out = groupMeetingsByMonth([
      meeting("old", "2025-12-01"),
      meeting("new", "2026-04-01"),
    ]);
    expect(out[0].label).toBe("2026년 4월");
    expect(out[1].label).toBe("2025년 12월");
  });

  it("orders meetings within a month newest-first by date", () => {
    const out = groupMeetingsByMonth([
      meeting("early", "2026-04-01"),
      meeting("late", "2026-04-28"),
      meeting("mid", "2026-04-15"),
    ]);
    expect(out[0].items.map((m) => m._id)).toEqual(["late", "mid", "early"]);
  });

  it("places meetings without date into 'Unknown' bucket at the end", () => {
    const out = groupMeetingsByMonth([
      meeting("a", "2026-04-20"),
      { ...meeting("undated", ""), properties: { type: "meeting" } } as Page,
    ]);
    expect(out[out.length - 1].label).toBe("날짜 없음");
    expect(out[out.length - 1].items.map((m) => m._id)).toEqual(["undated"]);
  });
});
