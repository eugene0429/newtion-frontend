import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw";
import { db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { KanbanBoard } from "./KanbanBoard";
import type { Page } from "@/types/page";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => seed());

function wrap(children: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function getProjects(): Page[] {
  return db.pages
    .filter((p) => p.properties.type === "project")
    .sort((a, b) => a.order - b.order);
}

describe("KanbanBoard", () => {
  it("3개 컬럼(예정/진행중/완료) 을 렌더한다", () => {
    const projects = getProjects();
    render(
      wrap(
        <KanbanBoard
          projects={projects}
          previews={{}}
          onAddCard={() => {}}
        />,
      ),
    );
    expect(screen.getByText("예정")).toBeInTheDocument();
    expect(screen.getByText("진행중")).toBeInTheDocument();
    expect(screen.getByText("완료")).toBeInTheDocument();
  });

  it("프로젝트는 status 별 컬럼으로 분류된다", () => {
    const projects = getProjects();
    render(
      wrap(
        <KanbanBoard
          projects={projects}
          previews={{}}
          onAddCard={() => {}}
        />,
      ),
    );
    const planned = screen.getByTestId("kanban-column-planned");
    const inProgress = screen.getByTestId("kanban-column-in_progress");
    const done = screen.getByTestId("kanban-column-done");
    expect(planned.textContent).toMatch(/3/);
    expect(inProgress.textContent).toMatch(/3/);
    expect(done.textContent).toMatch(/2/);
  });

  it("'카드 추가' 클릭 시 onAddCard(status) 호출", async () => {
    const user = userEvent.setup();
    const onAddCard = vi.fn();
    const projects = getProjects();
    render(
      wrap(
        <KanbanBoard
          projects={projects}
          previews={{}}
          onAddCard={onAddCard}
        />,
      ),
    );
    const buttons = screen.getAllByRole("button", { name: /카드 추가/ });
    await user.click(buttons[1]);
    expect(onAddCard).toHaveBeenCalledWith("in_progress");
  });

  it("드래그 종료 시 PATCH /pages/:id 가 status + order 로 호출된다", async () => {
    const projects = getProjects();
    const planned = projects.filter((p) => p.properties.status === "planned");
    const target = planned[0];
    const patches: Array<{ pageId: string; body: unknown }> = [];

    server.use(
      http.patch("*/pages/:pageId", async ({ params, request }) => {
        const body = await request.json();
        patches.push({ pageId: String(params.pageId), body });
        return HttpResponse.json({ ok: true });
      }),
    );

    let dragEnd: ((args: { active: { id: string }; over: { id: string } | null }) => void) | null = null;
    render(
      wrap(
        <KanbanBoard
          projects={projects}
          previews={{}}
          onAddCard={() => {}}
          onDragEndForTest={(handler) => {
            dragEnd = handler;
          }}
        />,
      ),
    );

    expect(dragEnd).not.toBeNull();
    await act(async () => {
      dragEnd!({
        active: { id: target._id },
        over: { id: "column:done" },
      });
    });

    await vi.waitFor(() => {
      expect(patches.length).toBeGreaterThan(0);
    });
    const sent = patches[0];
    expect(sent.pageId).toBe(target._id);
    expect(sent.body).toMatchObject({
      properties: { status: "done" },
    });
    expect(typeof (sent.body as { order: number }).order).toBe("number");
  });
});
