import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OfflineBanner } from "./OfflineBanner";

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value,
  });
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <OfflineBanner />
    </QueryClientProvider>,
  );
}

describe("OfflineBanner", () => {
  let original: boolean;
  beforeEach(() => {
    original = navigator.onLine;
  });
  afterEach(() => {
    setOnLine(original);
  });

  it("online=true 일 때 아무것도 렌더하지 않는다", () => {
    setOnLine(true);
    setup();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("offline 으로 전환되면 배너를 표시한다", () => {
    setOnLine(true);
    setup();
    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/오프라인|연결되지 않음/i)).toBeInTheDocument();
  });
});
