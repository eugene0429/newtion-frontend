import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

describe("MeetingCard", () => {
  it("renders date label, title, and preview", () => {
    render(
      <MemoryRouter>
        <MeetingCard meeting={meeting} preview="안건과 정리..." />
      </MemoryRouter>,
    );
    expect(screen.getByText("4/20 (월)")).toBeInTheDocument();
    expect(screen.getByText("스프린트 회고")).toBeInTheDocument();
    expect(screen.getByText(/안건과 정리/)).toBeInTheDocument();
  });

  it("links to /meetings/:id", () => {
    render(
      <MemoryRouter>
        <MeetingCard meeting={meeting} preview="" />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/meetings/${meeting._id}`);
  });

  it("renders pin badge when isPinned is true", () => {
    const pinned = {
      ...meeting,
      properties: { ...meeting.properties, isPinned: true },
    };
    render(
      <MemoryRouter>
        <MeetingCard meeting={pinned} preview="" />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("고정됨")).toBeInTheDocument();
  });
});
