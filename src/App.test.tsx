import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import App from "./App";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  resetDb();
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

function renderApp() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App boot", () => {
  it("renders sidebar nav and home placeholder", async () => {
    renderApp();
    expect(await screen.findByText("회의록")).toBeInTheDocument();
    expect(screen.getByText("프로젝트")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "홈" })).toBeInTheDocument();
  });

  it("auto-creates workspace via MSW and shows its name in TopBar", async () => {
    renderApp();
    // Sidebar brand and TopBar both render "Newtion"; assert at least both present.
    await waitFor(() =>
      expect(screen.getAllByText("Newtion").length).toBeGreaterThanOrEqual(2),
    );
    await waitFor(() => {
      const stored = localStorage.getItem("newtion-workspace");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.rootFolders.meetings).toMatch(/^pg_meetings_root_/);
      expect(parsed.rootFolders.projects).toMatch(/^pg_projects_root_/);
    });
  });
});
