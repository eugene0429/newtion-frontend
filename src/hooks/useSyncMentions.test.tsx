import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useSyncMentions } from "./useSyncMentions";
import type { BlockNoteLikeBlock } from "@/lib/blockAdapter";

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

const blockWithMentions = (hrefs: string[]): BlockNoteLikeBlock[] => [
  {
    id: "blk_1",
    type: "paragraph",
    props: {},
    content: hrefs.map((h) => ({
      type: "link",
      href: h,
      content: [{ type: "text", text: h }],
    })) as never,
    children: [],
  },
];

describe("useSyncMentions", () => {
  beforeEach(() => {
    resetDb();
    seed();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("멘션이 추가되면 1초 후 PATCH /pages/:id 가 mentionedPageIds 와 함께 호출된다", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    meeting.properties.mentionedPageIds = [];

    const blocks = blockWithMentions(["/projects/pg_x", "/meetings/pg_y"]);
    const { rerender } = renderHook(
      ({ b }) =>
        useSyncMentions({
          pageId: meeting._id,
          currentMentionedPageIds: meeting.properties.mentionedPageIds ?? [],
          blocks: b,
        }),
      { wrapper: wrapper(), initialProps: { b: [] as BlockNoteLikeBlock[] } },
    );
    rerender({ b: blocks });
    vi.advanceTimersByTime(1000);
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();

    await waitFor(() => {
      const updated = db.pages.find((p) => p._id === meeting._id)!;
      expect(updated.properties.mentionedPageIds).toEqual(["pg_x", "pg_y"]);
    });
  });

  it("멘션 집합이 동일하면 mutation 을 건너뛴다", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    meeting.properties.mentionedPageIds = ["pg_x", "pg_y"];
    const updatedAt = meeting.updatedAt;

    const blocks = blockWithMentions(["/meetings/pg_y", "/projects/pg_x"]); // 순서 다름
    renderHook(() =>
      useSyncMentions({
        pageId: meeting._id,
        currentMentionedPageIds: meeting.properties.mentionedPageIds ?? [],
        blocks,
      }),
      { wrapper: wrapper() },
    );
    vi.advanceTimersByTime(1500);
    await vi.runOnlyPendingTimersAsync();

    expect(meeting.updatedAt).toBe(updatedAt);
  });

  it("pageId 가 없으면 아무 동작도 하지 않는다", () => {
    const blocks = blockWithMentions(["/projects/pg_x"]);
    expect(() =>
      renderHook(() =>
        useSyncMentions({
          pageId: undefined,
          currentMentionedPageIds: [],
          blocks,
        }),
        { wrapper: wrapper() },
      ),
    ).not.toThrow();
  });
});
