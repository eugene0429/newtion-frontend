import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import HomePage from "./HomePage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("5개 Bento 카드 헤더가 모두 보인다", async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText("진행중 프로젝트")).toBeInTheDocument();
    });
    expect(screen.getByText("빠른 액션")).toBeInTheDocument();
    expect(screen.getByText("최근 회의록")).toBeInTheDocument();
    expect(screen.getByText("최근 변경")).toBeInTheDocument();
    expect(screen.getByText("즐겨찾기")).toBeInTheDocument();
  });
});
