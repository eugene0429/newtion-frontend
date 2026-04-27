import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import MeetingsListPage from "./MeetingsListPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  seed();
  localStorage.clear();
});

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/meetings"]}>
        <Routes>
          <Route path="/meetings" element={<MeetingsListPage />} />
          <Route path="/meetings/:id" element={<div>상세</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MeetingsListPage", () => {
  it("renders 5 seeded meetings grouped by month", async () => {
    renderPage();
    await waitFor(() => {
      const titles = screen.getAllByRole("heading", { level: 3 });
      expect(titles.length).toBe(5);
    });
    expect(screen.getByText("2026년 4월")).toBeInTheDocument();
  });

  it("creating a new meeting navigates to detail", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("2026년 4월");
    await user.click(screen.getByRole("button", { name: /새 회의록/ }));
    await waitFor(() =>
      expect(screen.getByText("상세")).toBeInTheDocument(),
    );
  });
});
