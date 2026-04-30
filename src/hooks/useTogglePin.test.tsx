import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useTogglePin } from "./useTogglePin";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useTogglePin", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("핀 안 된 페이지를 호출하면 isPinned=true 가 PATCH 된다", async () => {
    const target = db.pages.find((p) => p.properties.type === "project")!;
    target.properties.isPinned = false;
    const { result } = renderHook(() => useTogglePin(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ pageId: target._id, currentlyPinned: false });
    });
    expect(db.pages.find((p) => p._id === target._id)!.properties.isPinned).toBe(true);
  });

  it("핀 된 페이지를 호출하면 isPinned=false 가 PATCH 된다", async () => {
    const target = db.pages.find((p) => p.properties.type === "project")!;
    target.properties.isPinned = true;
    const { result } = renderHook(() => useTogglePin(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ pageId: target._id, currentlyPinned: true });
    });
    expect(db.pages.find((p) => p._id === target._id)!.properties.isPinned).toBe(false);
  });

  it("PATCH 가 다른 properties 를 보존한다 (deep-merge 의존)", async () => {
    const target = db.pages.find(
      (p) => p.properties.type === "project" && p.properties.tags?.length,
    )!;
    target.properties.isPinned = false;
    const originalTags = target.properties.tags;
    const originalProgress = target.properties.progress;

    const { result } = renderHook(() => useTogglePin(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ pageId: target._id, currentlyPinned: false });
    });
    const updated = db.pages.find((p) => p._id === target._id)!;
    expect(updated.properties.tags).toEqual(originalTags);
    expect(updated.properties.progress).toBe(originalProgress);
  });
});
