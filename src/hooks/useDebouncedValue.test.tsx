import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("초기 값을 즉시 반환한다", () => {
    const { result } = renderHook(() => useDebouncedValue("hello", 200));
    expect(result.current).toBe("hello");
  });

  it("값이 빠르게 바뀌면 마지막 값만 delay 뒤에 반영한다", () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), {
      initialProps: { v: "a" },
    });
    rerender({ v: "ab" });
    rerender({ v: "abc" });
    expect(result.current).toBe("a");
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("abc");
  });

  it("delay 가 끝나기 전에 값이 다시 바뀌면 타이머가 리셋된다", () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), {
      initialProps: { v: "a" },
    });
    rerender({ v: "b" });
    act(() => vi.advanceTimersByTime(150));
    rerender({ v: "c" });
    act(() => vi.advanceTimersByTime(150));
    expect(result.current).toBe("a"); // 아직 200ms 안 지남 (150 + 150 이지만 두 번째 rerender 가 리셋)
    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe("c");
  });
});
