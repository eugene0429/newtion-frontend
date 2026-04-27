import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { db } from "@/mocks/db/store";
import { usePages } from "./usePages";

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

describe("usePages", () => {
  it("returns pages under the given parent (meetings root)", async () => {
    const ws = db.workspaces[0];
    const meetingsRoot = db.pages.find(
      (p) => p.properties.role === "meetings_root",
    )!;
    const { result } = renderHook(
      () =>
        usePages({
          workspaceId: ws._id,
          parentPageId: meetingsRoot._id,
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(5);
    expect(result.current.data!.every((p) => p.properties.type === "meeting"))
      .toBe(true);
  });

  it("is disabled until workspaceId and parentPageId are provided", () => {
    const { result } = renderHook(
      () =>
        usePages({
          workspaceId: undefined,
          parentPageId: undefined,
        }),
      { wrapper: wrapper() },
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  it("supports mentionedPageId for reverse-index queries", async () => {
    const ws = db.workspaces[0];
    const projects = db.pages.filter((p) => p.properties.type === "project");
    // 시드 상 projects[3]은 첫 회의록의 mentionedPageIds[0]에 들어있음.
    const projectId = projects[3]._id;
    const { result } = renderHook(
      () =>
        usePages({
          workspaceId: ws._id,
          mentionedPageId: projectId,
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.length).toBeGreaterThanOrEqual(1);
  });
});
