import { formatMeetingDate, formatMonthLabel } from "./formatMeetingDate";

describe("formatMeetingDate", () => {
  it("formats ISO date as 'M/D (요일)'", () => {
    expect(formatMeetingDate("2026-04-20")).toBe("4/20 (월)");
    expect(formatMeetingDate("2026-04-21")).toBe("4/21 (화)");
    expect(formatMeetingDate("2026-04-26")).toBe("4/26 (일)");
  });

  it("returns empty string for invalid input", () => {
    expect(formatMeetingDate(undefined)).toBe("");
    expect(formatMeetingDate("")).toBe("");
    expect(formatMeetingDate("not-a-date")).toBe("");
  });
});

describe("formatMonthLabel", () => {
  it("formats ISO date as 'YYYY년 M월'", () => {
    expect(formatMonthLabel("2026-04-20")).toBe("2026년 4월");
    expect(formatMonthLabel("2026-12-31")).toBe("2026년 12월");
  });
});
