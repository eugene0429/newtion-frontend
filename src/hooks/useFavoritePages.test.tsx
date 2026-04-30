import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useFavoritePages } from "./useFavoritePages";

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

describe("useFavoritePages", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("isPinned=true 만 반환한다", async () => {
    const targets = db.pages
      .filter(
        (p) =>
          p.properties.type === "meeting" || p.properties.type === "project",
      )
      .slice(0, 2);
    targets.forEach((p) => {
      p.properties.isPinned = true;
    });

    const { result } = renderHook(() => useFavoritePages(20), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.length).toBe(2);
    expect(result.current.data!.every((p) => p.properties.isPinned)).toBe(true);
  });

  it("아무도 핀이 안 되어있으면 빈 배열", async () => {
    db.pages.forEach((p) => {
      p.properties.isPinned = false;
    });
    const { result } = renderHook(() => useFavoritePages(20), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("limit 적용", async () => {
    db.pages
      .filter(
        (p) =>
          p.properties.type === "meeting" || p.properties.type === "project",
      )
      .slice(0, 5)
      .forEach((p) => {
        p.properties.isPinned = true;
      });
    const { result } = renderHook(() => useFavoritePages(3), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.length).toBe(3);
  });
});
