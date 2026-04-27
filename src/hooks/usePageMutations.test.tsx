import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import {
  useCreatePage,
  useUpdatePage,
  useDeletePage,
} from "./usePageMutations";

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

describe("useCreatePage", () => {
  it("creates a meeting under the meetings root and returns the new page", async () => {
    const ws = db.workspaces[0];
    const meetingsRoot = db.pages.find(
      (p) => p.properties.role === "meetings_root",
    )!;
    const { result } = renderHook(() => useCreatePage(), { wrapper: wrapper() });
    let created;
    await act(async () => {
      created = await result.current.mutateAsync({
        workspaceId: ws._id,
        parentPageId: meetingsRoot._id,
        title: "신규 회의록",
        properties: { type: "meeting", date: "2026-04-27" },
      });
    });
    expect(created!._id).toMatch(/^pg/);
    expect(created!.title).toBe("신규 회의록");
    expect(db.pages.find((p) => p._id === created!._id)).toBeDefined();
  });
});

describe("useUpdatePage", () => {
  it("PATCH updates title and persists", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result } = renderHook(() => useUpdatePage(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        pageId: meeting._id,
        input: { title: "수정된 제목" },
      });
    });
    expect(db.pages.find((p) => p._id === meeting._id)!.title).toBe(
      "수정된 제목",
    );
  });
});

describe("useDeletePage", () => {
  it("soft-deletes the page (removedAt set)", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result } = renderHook(() => useDeletePage(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync(meeting._id);
    });
    expect(db.pages.find((p) => p._id === meeting._id)!.removedAt).not.toBeNull();
  });
});
