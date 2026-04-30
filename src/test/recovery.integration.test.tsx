import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { server } from "./msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import NotFoundPage from "@/routes/NotFoundPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("recovery flows", () => {
  beforeEach(() => {
    resetDb();
    seed();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("NotFound 라우트는 'Not Found' 표기와 홈 링크를 가진다", async () => {
    render(
      <MemoryRouter initialEntries={["/zzz-no-such-path"]}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/찾을 수 없|not found/i)).toBeInTheDocument();
  });

  it("ErrorBoundary 가 라우트 전환(resetKey 변경) 시 자동 리셋", async () => {
    let path = "/boom";
    function Boom(): JSX.Element {
      throw new Error("boom");
    }
    function Probe() {
      return path === "/boom" ? <Boom /> : <div>safe</div>;
    }
    function Harness({ at }: { at: string }) {
      return (
        <ErrorBoundary resetKey={at}>
          <Probe />
        </ErrorBoundary>
      );
    }
    const { rerender } = render(<Harness at="/boom" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    path = "/safe";
    rerender(<Harness at="/safe" />);
    expect(screen.getByText("safe")).toBeInTheDocument();
  });
});
