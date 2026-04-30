import { describe, it, expect } from "vitest";
import { errorId } from "./errorId";

describe("errorId", () => {
  it("8자 hex 문자열을 반환한다", () => {
    const id = errorId();
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });

  it("연속 호출 시 다른 ID를 반환한다", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) ids.add(errorId());
    expect(ids.size).toBe(100);
  });
});
