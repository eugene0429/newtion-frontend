import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { AppBootstrap } from "./AppBootstrap";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function setup() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AppBootstrap>
        <div>app-content</div>
      </AppBootstrap>
    </QueryClientProvider>,
  );
}

describe("AppBootstrap", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("ready 시 children 을 렌더한다", async () => {
    setup();
    await waitFor(() =>
      expect(screen.getByText("app-content")).toBeInTheDocument(),
    );
  });

  it("워크스페이스 fetch 실패 시 풀스크린 에러를 보인다", async () => {
    server.use(
      http.get("*/workspaces", () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );
    setup();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    expect(screen.getByText(/시작할 수 없어요/)).toBeInTheDocument();
  });
});
