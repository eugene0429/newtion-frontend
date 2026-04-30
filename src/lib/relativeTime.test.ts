import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { relativeTime } from "./relativeTime";

const NOW = new Date("2026-04-29T12:00:00Z");

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("60초 미만은 '방금 전'", () => {
    expect(relativeTime("2026-04-29T11:59:30Z")).toBe("방금 전");
  });

  it("1-59분 전은 'N분 전'", () => {
    expect(relativeTime("2026-04-29T11:55:00Z")).toBe("5분 전");
    expect(relativeTime("2026-04-29T11:01:00Z")).toBe("59분 전");
    expect(relativeTime("2026-04-29T11:59:00Z")).toBe("1분 전");
  });

  it("1-23시간 전은 'N시간 전'", () => {
    expect(relativeTime("2026-04-29T09:00:00Z")).toBe("3시간 전");
    expect(relativeTime("2026-04-28T13:00:00Z")).toBe("23시간 전");
  });

  it("1-6일 전은 'N일 전'", () => {
    expect(relativeTime("2026-04-27T12:00:00Z")).toBe("2일 전");
    expect(relativeTime("2026-04-23T12:00:00Z")).toBe("6일 전");
  });

  it("7일 이상은 절대 날짜로 (YYYY-MM-DD)", () => {
    expect(relativeTime("2026-04-15T12:00:00Z")).toBe("2026-04-15");
    expect(relativeTime("2025-12-31T00:00:00Z")).toBe("2025-12-31");
  });

  it("미래 시각은 '방금 전' 으로 안전하게 처리", () => {
    expect(relativeTime("2026-04-29T12:00:30Z")).toBe("방금 전");
  });

  it("유효하지 않은 입력은 빈 문자열 반환", () => {
    expect(relativeTime("")).toBe("");
    expect(relativeTime("not-a-date")).toBe("");
  });
});
