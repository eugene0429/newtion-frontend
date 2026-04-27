import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { useWorkspace } from "./useWorkspace";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  resetDb();
  localStorage.clear();
});

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useWorkspace", () => {
  it("creates a workspace when none exists and exposes rootFolders", async () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.ready).toBe(true), { timeout: 5000 });
    expect(result.current.workspace).toBeDefined();
    expect(result.current.rootFolders?.meetings).toBeDefined();
    expect(result.current.rootFolders?.projects).toBeDefined();
    const stored = localStorage.getItem("newtion-workspace");
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).rootFolders.meetings).toBe(
      result.current.rootFolders!.meetings,
    );
  });

  it("derives rootFolders from sidebar tree on subsequent loads", async () => {
    const first = renderHook(() => useWorkspace(), { wrapper: wrapper() });
    await waitFor(() => expect(first.result.current.ready).toBe(true));
    localStorage.clear();

    const { result } = renderHook(() => useWorkspace(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.workspace?.name).toBe("Newtion");
    expect(result.current.rootFolders?.meetings).toBeDefined();
    expect(result.current.rootFolders?.projects).toBeDefined();
  });
});
