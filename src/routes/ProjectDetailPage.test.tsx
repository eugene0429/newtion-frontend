import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import ProjectDetailPage from "./ProjectDetailPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => seed());

vi.mock("@/components/editor/BlockEditor", () => ({
  default: () => <div data-testid="block-editor-stub" />,
}));

function wrap(initialPath: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/projects"
            element={
              <>
                <div>kanban</div>
                <Outlet />
              </>
            }
          >
            <Route path=":id" element={<ProjectDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectDetailPage", () => {
  it("프로젝트 페이지의 제목과 상태 라벨을 모달에 렌더한다", async () => {
    const project = db.pages.find(
      (p) => p.properties.type === "project" && p.properties.status === "in_progress",
    )!;
    wrap(`/projects/${project._id}`);
    await waitFor(() => {
      expect(screen.getByDisplayValue(project.title)).toBeInTheDocument();
    });
    expect(screen.getByLabelText("상태 변경")).toHaveTextContent("진행중");
  });

  it("존재하지 않는 프로젝트 id 면 '찾을 수 없음' 표시", async () => {
    wrap("/projects/pg_does_not_exist");
    await waitFor(() => {
      expect(screen.getByText(/찾을 수 없습니다/)).toBeInTheDocument();
    });
  });

  it("상태 드롭다운으로 'done' 선택 시 PATCH 가 호출되고 type 등 다른 properties 는 보존", async () => {
    const user = userEvent.setup();
    const project = db.pages.find(
      (p) => p.properties.type === "project" && p.properties.status === "planned",
    )!;
    const originalType = project.properties.type;

    wrap(`/projects/${project._id}`);
    await waitFor(() =>
      expect(screen.getByLabelText("상태 변경")).toBeInTheDocument(),
    );

    await user.click(screen.getByLabelText("상태 변경"));
    await user.click(await screen.findByRole("menuitem", { name: "완료" }));

    await waitFor(() => {
      const updated = db.pages.find((p) => p._id === project._id)!;
      expect(updated.properties.status).toBe("done");
      expect(updated.properties.type).toBe(originalType);
    });
  });
});
