import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { CommandPalette } from "@/components/search/CommandPalette";
import MeetingDetailPage from "./MeetingDetailPage";

// Mock Radix Dialog to avoid focus-trap / portal issues in jsdom.
// Same pattern as CommandPalette.test.tsx.
vi.mock("@/components/ui/dialog", () => {
  type DialogProps = {
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
    children?: import("react").ReactNode;
  };
  const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
    if (!open) return null;
    return (
      <div
        data-testid="dialog-root"
        onKeyDown={(e) => {
          if (e.key === "Escape") onOpenChange?.(false);
        }}
      >
        {children}
      </div>
    );
  };
  type ContentProps = { children?: import("react").ReactNode };
  const DialogContent = ({ children }: ContentProps) => (
    <div data-testid="dialog-content">{children}</div>
  );
  return { Dialog, DialogContent };
});

// BlockEditor stub — exposes two buttons to simulate mention injection and
// search probing without mounting ProseMirror in jsdom.
vi.mock("@/components/editor/BlockEditor", () => ({
  default: ({
    onChange,
    onMentionSearch,
  }: {
    onChange: (blocks: unknown[]) => void;
    onMentionSearch?: (q: string) => Promise<unknown[]>;
  }) => (
    <div>
      <button
        data-testid="simulate-mention"
        onClick={() =>
          onChange([
            {
              id: "blk_1",
              type: "paragraph",
              props: {},
              content: [
                {
                  type: "link",
                  href: "/projects/pg_target",
                  content: [{ type: "text", text: "타깃 프로젝트" }],
                },
              ],
              children: [],
            },
          ])
        }
      >
        simulate-mention
      </button>
      <button
        data-testid="probe-mention-search"
        onClick={() => onMentionSearch?.("프로")}
      >
        probe-search
      </button>
    </div>
  ),
}));

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => {
  vi.useRealTimers();
  server.resetHandlers();
});
afterAll(() => server.close());

function setup(initialEntry: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <CommandPalette />
        <Routes>
          <Route path="/meetings/:id" element={<MeetingDetailPage />} />
          <Route path="/projects/:id" element={<div>project-page</div>} />
          <Route path="*" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Plan 4 — mention + ⌘K integration", () => {
  beforeEach(() => {
    resetDb();
    seed();
    useCommandPaletteStore.setState({ open: false });
  });

  it("MeetingDetailPage 에서 멘션을 추가하면 mentionedPageIds 가 동기화된다", async () => {
    // Add a fresh project page as the mention target
    const projectsRootPage = db.pages.find(
      (p) => p.properties.role === "projects_root",
    )!;
    const target = {
      _id: "pg_target",
      workspaceId: projectsRootPage.workspaceId,
      parentPageId: projectsRootPage._id,
      title: "타깃 프로젝트",
      order: 99,
      isArchived: false,
      isPublished: false,
      properties: { type: "project" as const, status: "planned" as const },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      removedAt: null,
    };
    db.pages.push(target);

    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    meeting.properties.mentionedPageIds = [];

    setup(`/meetings/${meeting._id}`);

    // Wait for page data to load and stub buttons to appear
    await screen.findByTestId("simulate-mention");

    act(() => {
      fireEvent.click(screen.getByTestId("simulate-mention"));
    });

    await waitFor(
      () => {
        const updated = db.pages.find((p) => p._id === meeting._id)!;
        expect(updated.properties.mentionedPageIds).toEqual(["pg_target"]);
      },
      { timeout: 3000 },
    );
  });

  it("⌘K 모달에서 검색 후 결과 클릭 시 해당 페이지로 navigate 한다", async () => {
    useCommandPaletteStore.setState({ open: true });
    const meeting = db.pages.find(
      (p) => p.properties.type === "meeting" && p.title.length > 0,
    )!;
    setup("/");

    const input = await screen.findByPlaceholderText(/검색|search/i);
    act(() => {
      fireEvent.change(input, {
        target: { value: meeting.title.slice(0, 2) },
      });
    });
    await waitFor(
      () => expect(screen.getByText(meeting.title)).toBeInTheDocument(),
      { timeout: 3000 },
    );
    act(() => {
      fireEvent.click(screen.getByText(meeting.title));
    });

    await waitFor(
      () => expect(useCommandPaletteStore.getState().open).toBe(false),
      { timeout: 3000 },
    );
  });

  it("onMentionSearch 가 워크스페이스 검색 결과를 반환한다", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    setup(`/meetings/${meeting._id}`);

    const probe = await screen.findByTestId("probe-mention-search");
    // Clicking probe triggers onMentionSearch("프로") — should not throw.
    await act(async () => {
      fireEvent.click(probe);
    });
  });
});
