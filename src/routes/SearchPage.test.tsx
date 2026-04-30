import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import SearchPage from "./SearchPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function setup(initialEntry: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/projects/:id" element={<div>project page</div>} />
          <Route path="/meetings/:id" element={<div>meeting page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SearchPage", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("?q= 가 비어있으면 안내 문구를 표시한다", () => {
    setup("/search");
    expect(screen.getByText(/검색어를 입력/i)).toBeInTheDocument();
  });

  it("?q=프로 → 결과를 회의록/프로젝트 그룹으로 표시한다", async () => {
    setup("/search?q=프로");
    await waitFor(() =>
      expect(screen.getByRole("group", { name: /프로젝트/ })).toBeInTheDocument(),
    );
  });

  it("결과가 없으면 '결과 없음' 메시지를 표시한다", async () => {
    setup("/search?q=zzz존재하지않는쿼리zzz");
    await waitFor(() =>
      expect(screen.getByText(/결과 없음/i)).toBeInTheDocument(),
    );
  });
});
