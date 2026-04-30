import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import ProjectsKanbanPage from "./ProjectsKanbanPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ProjectsKanbanPage a11y", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("axe 위반이 없다", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/projects"]}>
          <Routes>
            <Route path="/projects/*" element={<ProjectsKanbanPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(container.querySelector("h1, h2")).toBeTruthy();
    });
    const result = await axe(container);
    expect(result).toHaveNoViolations();
  });
});
