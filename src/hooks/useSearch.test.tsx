import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useSearch } from "./useSearch";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useSearch", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("빈 query 일 때는 fetch 하지 않는다 (enabled=false)", () => {
    const { result } = renderHook(() => useSearch(""), { wrapper: wrapper() });
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("query 가 있으면 워크스페이스 안에서 제목 부분일치로 페이지를 반환한다", async () => {
    const { result } = renderHook(() => useSearch("프로젝트"), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.length).toBeGreaterThan(0);
    expect(
      result.current.data!.every((p) => p.title.includes("프로젝트")),
    ).toBe(true);
  });

  it("결과는 archived 페이지를 제외한다", async () => {
    const { result } = renderHook(() => useSearch("a"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.every((p) => !p.isArchived)).toBe(true);
  });
});
