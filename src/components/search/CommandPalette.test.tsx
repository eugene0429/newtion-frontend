import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { CommandPalette } from "./CommandPalette";

// Mock Radix Dialog to avoid focus-trap / portal issues in jsdom.
// The mock honours open/onOpenChange so all tested behaviours are preserved.
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

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
// Always restore real timers between tests so a timed-out fake-timer test
// doesn't pollute subsequent tests.
afterEach(() => {
  vi.useRealTimers();
  server.resetHandlers();
});
afterAll(() => server.close());

function LocationProbe({ onLocation }: { onLocation: (path: string) => void }) {
  const loc = useLocation();
  useEffect(() => onLocation(loc.pathname + loc.search), [loc, onLocation]);
  return null;
}

function setup(initialEntry = "/") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onLocation = vi.fn();
  const utils = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="*" element={<>
            <CommandPalette />
            <LocationProbe onLocation={onLocation} />
          </>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...utils, onLocation };
}

describe("CommandPalette", () => {
  beforeEach(() => {
    resetDb();
    seed();
    useCommandPaletteStore.setState({ open: true });
  });

  it("열려있으면 검색 input 이 보인다", () => {
    setup();
    expect(screen.getByPlaceholderText(/검색|search/i)).toBeInTheDocument();
  });

  it("query 입력 후 디바운스가 지나면 결과가 그룹별로 표시된다", async () => {
    setup();
    const input = screen.getByPlaceholderText(/검색|search/i);
    // Use fireEvent for input to avoid userEvent + fake-timer interaction
    act(() => { fireEvent.change(input, { target: { value: "프로" } }); });
    // Wait for debounce (200ms) + MSW response
    await waitFor(() =>
      expect(screen.getByRole("group", { name: /프로젝트/ })).toBeInTheDocument(),
    { timeout: 3000 });
  });

  it("결과가 비어있으면 '결과 없음' 안내가 보인다", async () => {
    setup();
    const input = screen.getByPlaceholderText(/검색|search/i);
    act(() => { fireEvent.change(input, { target: { value: "zzz존재하지않는쿼리zzz" } }); });
    await waitFor(() =>
      expect(screen.getByText(/결과 없음|no results/i)).toBeInTheDocument(),
    { timeout: 3000 });
  });

  it("ArrowDown / ArrowUp 으로 항목 사이를 이동하고 Enter 로 선택된 페이지로 navigate 한다", async () => {
    const { onLocation } = setup();
    const input = screen.getByPlaceholderText(/검색|search/i);
    act(() => { fireEvent.change(input, { target: { value: "프로" } }); });
    await waitFor(() =>
      expect(screen.queryAllByRole("option").length).toBeGreaterThan(0),
    { timeout: 3000 });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      const last = (onLocation.mock.calls.at(-1) ?? [""])[0] as string;
      expect(last).toMatch(/^\/(projects|meetings)\//);
    });
  });

  it("Esc 로 모달이 닫힌다", async () => {
    setup();
    const dialog = screen.getByTestId("dialog-root");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() =>
      expect(useCommandPaletteStore.getState().open).toBe(false),
    );
  });

  it("query 가 있는 상태에서 어떤 항목도 highlight 되지 않은 상태로 Enter 누르면 /search?q= 로 이동한다", async () => {
    const { onLocation } = setup();
    const input = screen.getByPlaceholderText(/검색|search/i);
    act(() => { fireEvent.change(input, { target: { value: "회의" } }); });
    // Advance debounce then press Enter before results load (no highlight)
    await act(async () => { await Promise.resolve(); });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      const last = (onLocation.mock.calls.at(-1) ?? [""])[0] as string;
      expect(last).toMatch(/^\/search\?q=/);
    });
  });
});
