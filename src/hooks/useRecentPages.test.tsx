import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useRecentPages } from "./useRecentPages";

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

describe("useRecentPages", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("type=meeting/project 만 반환하고 root 폴더는 제외한다", async () => {
    const { result } = renderHook(() => useRecentPages(20), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      result.current.data!.every(
        (p) =>
          p.properties.type === "meeting" || p.properties.type === "project",
      ),
    ).toBe(true);
  });

  it("updatedAt 내림차순으로 정렬된다", async () => {
    const { result } = renderHook(() => useRecentPages(20), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const times = result.current.data!.map((p) => new Date(p.updatedAt).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]).toBeGreaterThanOrEqual(times[i]);
    }
  });

  it("limit 만큼만 반환한다", async () => {
    const { result } = renderHook(() => useRecentPages(3), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.length).toBeLessThanOrEqual(3);
  });

  it("archived 페이지는 제외한다", async () => {
    db.pages[2].isArchived = true;
    const archivedId = db.pages[2]._id;
    const { result } = renderHook(() => useRecentPages(20), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.some((p) => p._id === archivedId)).toBe(false);
  });
});
