import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import HomePage from "./HomePage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("HomePage a11y", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("axe 위반이 없다", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    // 첫 데이터 fetch 가 끝날 때까지 대기 (skeleton → 카드)
    await waitFor(() => {
      // 실제 카드 헤더가 보이면 fetch 완료로 간주
      expect(container.querySelector("h2")).toBeTruthy();
    });
    const result = await axe(container);
    expect(result).toHaveNoViolations();
  });
});
