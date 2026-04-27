import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useAutosaveBlocks } from "./useAutosaveBlocks";
import type { BlockNoteLikeBlock } from "@/lib/blockAdapter";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  seed();
});

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const txt = (text: string): BlockNoteLikeBlock => ({
  id: text,
  type: "paragraph",
  props: {},
  content: [{ type: "text", text, styles: {} }],
  children: [],
});

describe("useAutosaveBlocks", () => {
  it("status is 'idle' initially", () => {
    const { result } = renderHook(
      () => useAutosaveBlocks({ pageId: "pg_x", initialBlocks: [] }),
      { wrapper: wrapper() },
    );
    expect(result.current.status).toBe("idle");
  });

  it("debounces calls and POSTs after the quiet period", async () => {
    vi.useFakeTimers();
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result } = renderHook(
      () =>
        useAutosaveBlocks({
          pageId: meeting._id,
          initialBlocks: [],
          debounceMs: 1000,
        }),
      { wrapper: wrapper() },
    );

    act(() => {
      result.current.save([txt("a")]);
      result.current.save([txt("a"), txt("b")]);
    });
    expect(result.current.status).toBe("idle");

    await act(async () => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current.status).toBe("idle");

    await act(async () => {
      vi.advanceTimersByTime(1);
      vi.useRealTimers();
    });

    await waitFor(() => expect(result.current.status).toBe("saved"), {
      timeout: 3000,
    });
    const inDb = db.blocks.filter(
      (b) => b.pageId === meeting._id && b.removedAt === null,
    );
    // 시드의 4개 + 새로 추가된 2개 (a, b)
    expect(inDb.some((b) => b._id === "a")).toBe(true);
    expect(inDb.some((b) => b._id === "b")).toBe(true);
  });

  it("transitions to 'error' after retries exhaust on persistent failure", async () => {
    server.use(
      http.post("*/blocks/batch", () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
      http.post("*/blocks", () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result } = renderHook(
      () =>
        useAutosaveBlocks({
          pageId: meeting._id,
          initialBlocks: [],
          debounceMs: 0,
          retry: 2,
          retryDelay: 10,
        }),
      { wrapper: wrapper() },
    );

    act(() => {
      result.current.save([txt("x")]);
    });

    await waitFor(() => expect(result.current.status).toBe("error"), {
      timeout: 5000,
    });
  });

  it("flush() forces immediate save (used on unmount or navigation)", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result, unmount } = renderHook(
      () =>
        useAutosaveBlocks({
          pageId: meeting._id,
          initialBlocks: [],
          debounceMs: 5000,
        }),
      { wrapper: wrapper() },
    );

    act(() => {
      result.current.save([txt("flushme")]);
    });
    act(() => {
      result.current.flush();
    });

    await waitFor(() => expect(result.current.status).toBe("saved"), {
      timeout: 3000,
    });
    expect(db.blocks.some((b) => b._id === "flushme")).toBe(true);
    unmount();
  });
});
