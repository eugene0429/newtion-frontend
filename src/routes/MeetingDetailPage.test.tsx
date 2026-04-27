import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import MeetingDetailPage from "./MeetingDetailPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  seed();
});

// jsdom에서 BlockNote는 ProseMirror DOM을 마운트한다 — 일부 환경에서 실패할 수 있어
// 본 테스트는 헤더(제목/뒤로/SaveIndicator) 와이어링과 PATCH 흐름만 검증.
// BlockEditor 본체의 동작은 useAutosaveBlocks 통합 테스트(Task 11)에서 cover.
vi.mock("@/components/editor/BlockEditor", () => ({
  default: () => <div data-testid="block-editor-stub" />,
}));

function renderRoute(pageId: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/meetings/${pageId}`]}>
        <Routes>
          <Route path="/meetings/:id" element={<MeetingDetailPage />} />
          <Route path="/meetings" element={<div>리스트</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MeetingDetailPage", () => {
  it("renders the meeting title and date", async () => {
    const m = db.pages.find((p) => p.properties.type === "meeting")!;
    renderRoute(m._id);
    await waitFor(() =>
      expect(screen.getByDisplayValue(m.title)).toBeInTheDocument(),
    );
    expect(screen.getByTestId("block-editor-stub")).toBeInTheDocument();
  });

  it("editing title and blurring PATCHes the page", async () => {
    const m = db.pages.find((p) => p.properties.type === "meeting")!;
    const user = userEvent.setup();
    renderRoute(m._id);
    const input = await screen.findByDisplayValue(m.title);
    await user.clear(input);
    await user.type(input, "새 제목");
    await user.tab();
    await waitFor(() =>
      expect(db.pages.find((p) => p._id === m._id)!.title).toBe("새 제목"),
    );
  });

  it("back button navigates to /meetings", async () => {
    const m = db.pages.find((p) => p.properties.type === "meeting")!;
    const user = userEvent.setup();
    renderRoute(m._id);
    const back = await screen.findByRole("button", { name: /목록으로/ });
    await user.click(back);
    await waitFor(() =>
      expect(screen.getByText("리스트")).toBeInTheDocument(),
    );
  });
});
