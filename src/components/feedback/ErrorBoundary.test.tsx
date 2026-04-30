import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("boom");
  return <div>safe</div>;
}

describe("ErrorBoundary", () => {
  // jsdom 의 console.error 가 React error boundary 메시지를 시끄럽게 출력하므로 silence.
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("자식이 에러를 안 던지면 자식을 그대로 렌더한다", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe")).toBeInTheDocument();
  });

  it("자식이 에러를 던지면 fallback 을 렌더한다 (기본 메시지)", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/문제가 발생/)).toBeInTheDocument();
  });

  it("재시도 버튼 클릭 → 자식을 다시 렌더하고 에러가 해결되면 정상 표시", async () => {
    const user = userEvent.setup();
    let throws = true;
    function Probe() {
      if (throws) throw new Error("boom");
      return <div>recovered</div>;
    }
    render(
      <ErrorBoundary>
        <Probe />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    throws = false;
    await user.click(screen.getByRole("button", { name: /재시도/i }));
    expect(screen.getByText("recovered")).toBeInTheDocument();
  });

  it("resetKey 가 바뀌면 boundary 가 자동으로 리셋된다", () => {
    let throws = true;
    function Probe() {
      if (throws) throw new Error("boom");
      return <div>recovered</div>;
    }
    const { rerender } = render(
      <ErrorBoundary resetKey="A">
        <Probe />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    throws = false;
    rerender(
      <ErrorBoundary resetKey="B">
        <Probe />
      </ErrorBoundary>,
    );
    expect(screen.getByText("recovered")).toBeInTheDocument();
  });
});
