import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MeetingCard } from "./MeetingCard";
import type { Page } from "@/types/page";

const meeting: Page = {
  _id: "pg_meeting_x",
  workspaceId: "ws",
  parentPageId: "root",
  title: "스프린트 회고",
  emoji: "📝",
  order: 0,
  isArchived: false,
  isPublished: false,
  properties: { type: "meeting", date: "2026-04-20" },
  createdAt: "",
  updatedAt: "",
  removedAt: null,
};

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderCard(meetingPage: Page, preview = "") {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <MeetingCard meeting={meetingPage} preview={preview} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MeetingCard", () => {
  it("renders date label, title, and preview", () => {
    renderCard(meeting, "안건과 정리...");
    expect(screen.getByText("4/20 (월)")).toBeInTheDocument();
    expect(screen.getByText("스프린트 회고")).toBeInTheDocument();
    expect(screen.getByText(/안건과 정리/)).toBeInTheDocument();
  });

  it("links to /meetings/:id", () => {
    renderCard(meeting);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/meetings/${meeting._id}`);
  });

  it("renders pin toggle button when isPinned is true", () => {
    const pinned = {
      ...meeting,
      properties: { ...meeting.properties, isPinned: true },
    };
    renderCard(pinned);
    expect(screen.getByRole("button", { name: "즐겨찾기 해제" })).toBeInTheDocument();
  });
});
