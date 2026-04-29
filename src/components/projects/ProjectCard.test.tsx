import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectCard } from "./ProjectCard";
import type { Page } from "@/types/page";

function makeProject(overrides: Partial<Page["properties"]> = {}): Page {
  return {
    _id: "pg_p1",
    workspaceId: "ws_1",
    parentPageId: "pg_projects_root",
    title: "결제 모듈 리뉴얼",
    order: 0,
    isArchived: false,
    isPublished: false,
    properties: {
      type: "project",
      status: "in_progress",
      progress: 60,
      tags: ["product"],
      ...overrides,
    },
    createdAt: "2026-04-29T00:00:00.000Z",
    updatedAt: "2026-04-29T00:00:00.000Z",
    removedAt: null,
  };
}

function renderCard(project: Page, preview = "") {
  return render(
    <MemoryRouter>
      <ProjectCard project={project} preview={preview} />
    </MemoryRouter>,
  );
}

describe("ProjectCard", () => {
  it("제목과 미리보기를 렌더한다", () => {
    renderCard(makeProject(), "분기별 결제 흐름 정리");
    expect(screen.getByText("결제 모듈 리뉴얼")).toBeInTheDocument();
    expect(screen.getByText("분기별 결제 흐름 정리")).toBeInTheDocument();
  });

  it("진행중 상태이고 progress 가 있으면 진행률 바 노출", () => {
    renderCard(makeProject({ status: "in_progress", progress: 42 }));
    const bar = screen.getByLabelText("진행률 42%");
    expect(bar).toBeInTheDocument();
  });

  it("planned 상태면 진행률 바를 노출하지 않는다", () => {
    renderCard(makeProject({ status: "planned", progress: 0 }));
    expect(screen.queryByLabelText(/진행률/)).not.toBeInTheDocument();
  });

  it("태그를 칩으로 표시", () => {
    renderCard(makeProject({ tags: ["product", "infra"] }));
    expect(screen.getByText("product")).toBeInTheDocument();
    expect(screen.getByText("infra")).toBeInTheDocument();
  });

  it("isPinned 면 핀 아이콘 노출", () => {
    renderCard(makeProject({ isPinned: true }));
    expect(screen.getByLabelText("고정됨")).toBeInTheDocument();
  });

  it("클릭하면 /projects/:id 로 이동하는 link 역할", () => {
    renderCard(makeProject());
    const link = screen.getByRole("link", { name: /결제 모듈 리뉴얼/ });
    expect(link).toHaveAttribute("href", "/projects/pg_p1");
  });
});
