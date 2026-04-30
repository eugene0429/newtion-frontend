import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { ProjectsInProgressCard } from "./ProjectsInProgressCard";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProjectsInProgressCard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectsInProgressCard", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("status=in_progress 프로젝트만 표시한다", async () => {
    setup();
    await waitFor(() =>
      expect(screen.queryAllByRole("listitem").length).toBeGreaterThan(0),
    );
    const inProgressProjects = db.pages.filter(
      (p) =>
        p.properties.type === "project" &&
        p.properties.status === "in_progress",
    );
    inProgressProjects.forEach((p) => {
      expect(screen.getByText(p.title)).toBeInTheDocument();
    });
  });

  it("진행률 바가 함께 렌더된다", async () => {
    setup();
    await waitFor(() =>
      expect(screen.queryAllByRole("progressbar").length).toBeGreaterThan(0),
    );
  });

  it("프로젝트가 없으면 '진행중인 프로젝트 없음' 안내", async () => {
    db.pages.forEach((p) => {
      if (p.properties.status === "in_progress") {
        p.properties.status = "planned";
      }
    });
    setup();
    await waitFor(() =>
      expect(screen.getByText(/진행중인 프로젝트 없음/i)).toBeInTheDocument(),
    );
  });
});
