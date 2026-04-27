import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { usePageDetail } from "./usePageDetail";

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

describe("usePageDetail", () => {
  it("returns page + blocks + tree for a meeting", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result } = renderHook(() => usePageDetail(meeting._id), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.page._id).toBe(meeting._id);
    expect(result.current.data!.blocks.length).toBeGreaterThanOrEqual(3);
    expect(result.current.data!.blockTree.length).toBeGreaterThanOrEqual(3);
  });

  it("is disabled when pageId is undefined", () => {
    const { result } = renderHook(() => usePageDetail(undefined), {
      wrapper: wrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
