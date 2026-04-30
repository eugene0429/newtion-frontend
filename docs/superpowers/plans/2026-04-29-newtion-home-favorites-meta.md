# Newtion: 홈 Bento + 사이드바 즐겨찾기/최근 + 칸반 메타 편집 Implementation Plan (Plan 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한 plan 에서 *page properties 편집 도메인* 을 끝까지 완성한다 — (1) 대시보드 홈을 Bento 카드 5종으로 채우고, (2) 사이드바에 즐겨찾기 + 최근 항목 섹션을 추가하며, (3) 칸반 / 회의록 / 프로젝트 모달에서 진행률·태그·마감일·핀 을 인라인 편집할 수 있는 affordance 를 제공한다. 세 영역 모두 `Page.properties` 의 `progress` / `tags` / `dueDate` / `isPinned` / `updatedAt` 을 읽고-쓴다는 공통 도메인이라 한 plan 에 묶인다.

**Architecture:**
- **읽기-도메인**: 두 개의 새 훅이 모든 카드/섹션에 공급한다.
  - `useRecentPages(limit)` — 모든 회의록+프로젝트를 `updatedAt` 내림차순 정렬, type=meeting/project 만 필터.
  - `useFavoritePages(limit)` — `isPinned=true` 만, `updatedAt` 내림차순.
  - 두 훅 모두 *워크스페이스 안의 모든 활성 페이지* 한 번 조회 후 클라이언트에서 정렬·필터 (Plan 1 의 `getPages({ workspaceId, includeArchived: false, parentPageId: undefined })` 가 가능 — MSW 핸들러가 `parentPageId` 를 안 보내면 모든 페이지 반환). 작은 워크스페이스 (수십~수백 페이지) 가정의 spec §1-2 와 정합.
- **쓰기-도메인 — 한 mutation 으로 통일**: 모든 properties 편집 (진행률, 태그, 마감일, 핀, 상태) 은 Plan 3 Task 1 에서 deep-merge 가 이미 보장된 `useUpdatePage` 한 곳을 사용한다. 새 mutation 훅은 만들지 않는다.
- **Bento 그리드**: spec §4-1 의 5개 카드. CSS grid (`grid-cols-3` + `auto-rows`) 로 구성, 카드 크기는 1×1, 2×1, 1×2 혼합. 모든 카드는 공통 `BentoCard` wrapper 안에 놓는다.
- **사이드바 즐겨찾기/최근**: 기존 `Sidebar` 컴포넌트의 `<nav>` 와 하단 사이에 두 섹션을 추가. spec §3-2 레이아웃 그대로 (collapsed 상태에서는 헤더 라벨 숨김).
- **인라인 편집 affordance**:
  - `PinToggle` — 단일 IconButton, optimistic 토글. ProjectCard/MeetingCard/MeetingHeader/ProjectMetaBar 네 곳에서 재사용.
  - `ProgressEditor` — 진행률 표시를 클릭하면 0-100 인라인 input + 슬라이더. blur/Enter 로 commit.
  - `TagsEditor` — 태그 칩 + `+` 버튼 → 작은 input. Enter/Comma 로 추가, 칩 hover 시 ✕ 로 삭제.
  - `DueDateEditor` — 마감일 표시를 클릭하면 native `<input type="date">`.
  - 네 affordance 모두 ProjectMetaBar 의 표시 영역을 *클릭 가능한 트리거* 로 바꾸고, 트리거 클릭 시 인라인 에디터로 바뀌는 패턴.
- **Optimistic 갱신**: `useUpdatePage` 의 onMutate 가 page-detail 캐시를 deep-merge 한다 (Plan 3 Task 1). `pages` 리스트 캐시는 onSettled 에서 invalidate — Bento 카드/사이드바도 함께 갱신.
- **Out of scope (Plan 6 으로 미룸)**: 페이지 종류(type) 변경, 태그 자동완성, 마감일 임박 알림, 진행률 슬라이더의 시각적 폴리싱.

**Tech Stack (신규 라이브러리 없음):** 기존 shadcn UI (button, dropdown-menu, input, scroll-area) + Lucide 아이콘만 사용. `@radix-ui/react-popover` 가 필요하면 추가 (spec §8 에 미정의이지만 인라인 에디터 일부에서 유용).

---

## File Structure

**Modify:**
- `src/components/layout/Sidebar.tsx` — 즐겨찾기/최근 섹션 추가.
- `src/routes/HomePage.tsx` — stub → Bento 그리드 통합.
- `src/components/projects/ProjectMetaBar.tsx` — 진행률/마감일/태그 표시를 클릭 가능한 인라인 에디터 트리거로 교체.
- `src/components/projects/ProjectCard.tsx` — 핀 토글 affordance 추가 (hover 시 노출).
- `src/components/meetings/MeetingCard.tsx` — 동일.
- `src/components/meetings/MeetingHeader.tsx` — `⋯ 메뉴` 영역에 핀 토글 추가.
- `src/routes/ProjectDetailPage.tsx` — `onProgressChange` / `onTagsChange` / `onDueDateChange` / `onPinToggle` props 를 ProjectMetaBar 에 연결.
- `src/routes/MeetingDetailPage.tsx` — `MeetingHeader` 에 `onPinToggle` prop 연결.

**Create (lib):**
- `src/lib/relativeTime.ts` (+ `.test.ts`) — ISO 시각 → "방금 전" / "3시간 전" / "2일 전" / "2026-04-15".
- `src/lib/sortByUpdatedAt.ts` (+ `.test.ts`) — `Page[]` 를 `updatedAt` 내림차순 안정 정렬 (Plan 5 안의 여러 훅에서 재사용).

**Create (hooks):**
- `src/hooks/useRecentPages.ts` (+ `.test.tsx`) — 활성 페이지 → 최근 N 개.
- `src/hooks/useFavoritePages.ts` (+ `.test.tsx`) — isPinned=true → 최근 N 개.
- `src/hooks/useTogglePin.ts` (+ `.test.tsx`) — page+현재 isPinned → toggle mutation 헬퍼.

**Create (components/home/):**
- `src/components/home/BentoCard.tsx` — 카드 박스 wrapper (rounded, shadow, accent 보더).
- `src/components/home/ProjectsInProgressCard.tsx` (+ `.test.tsx`).
- `src/components/home/QuickActionsCard.tsx`.
- `src/components/home/RecentMeetingsCard.tsx`.
- `src/components/home/RecentChangesCard.tsx`.
- `src/components/home/FavoritesCard.tsx`.

**Create (components/layout/):**
- `src/components/layout/SidebarFavorites.tsx` — 즐겨찾기 NavLink 리스트.
- `src/components/layout/SidebarRecent.tsx` — 최근 NavLink 리스트 + 펼침/접힘 토글.

**Create (components/properties/):**
- `src/components/properties/PinToggle.tsx` (+ `.test.tsx`).
- `src/components/properties/ProgressEditor.tsx` (+ `.test.tsx`).
- `src/components/properties/TagsEditor.tsx` (+ `.test.tsx`).
- `src/components/properties/DueDateEditor.tsx` (+ `.test.tsx`).

---

## Task 1: `relativeTime` 순수 함수 (TDD)

**Files:**
- Create: `src/lib/relativeTime.ts`
- Test: `src/lib/relativeTime.test.ts`

**Why first:** Bento 카드 #4 (최근 변경) + 사이드바 최근 항목이 표시할 때 사용. 다른 task 의 테스트 데이터가 의존하므로 가장 먼저.

- [ ] **Step 1: 실패하는 테스트**

```ts
// src/lib/relativeTime.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { relativeTime } from "./relativeTime";

const NOW = new Date("2026-04-29T12:00:00Z");

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("60초 미만은 '방금 전'", () => {
    expect(relativeTime("2026-04-29T11:59:30Z")).toBe("방금 전");
  });

  it("1-59분 전은 'N분 전'", () => {
    expect(relativeTime("2026-04-29T11:55:00Z")).toBe("5분 전");
    expect(relativeTime("2026-04-29T11:01:00Z")).toBe("59분 전");
  });

  it("1-23시간 전은 'N시간 전'", () => {
    expect(relativeTime("2026-04-29T09:00:00Z")).toBe("3시간 전");
    expect(relativeTime("2026-04-28T13:00:00Z")).toBe("23시간 전");
  });

  it("1-6일 전은 'N일 전'", () => {
    expect(relativeTime("2026-04-27T12:00:00Z")).toBe("2일 전");
    expect(relativeTime("2026-04-23T12:00:00Z")).toBe("6일 전");
  });

  it("7일 이상은 절대 날짜로 (YYYY-MM-DD)", () => {
    expect(relativeTime("2026-04-15T12:00:00Z")).toBe("2026-04-15");
    expect(relativeTime("2025-12-31T00:00:00Z")).toBe("2025-12-31");
  });

  it("미래 시각은 '방금 전' 으로 안전하게 처리", () => {
    expect(relativeTime("2026-04-29T12:00:30Z")).toBe("방금 전");
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/lib/relativeTime.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

```ts
// src/lib/relativeTime.ts
const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((now.getTime() - then) / 1000));
  if (diff < MIN) return "방금 전";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}분 전`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}일 전`;
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/lib/relativeTime.test.ts`
Expected: PASS — 6/6.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/relativeTime.ts src/lib/relativeTime.test.ts
git commit -m "feat(lib): relativeTime — '3시간 전' style age strings"
```

---

## Task 2: `sortByUpdatedAt` 순수 함수 (TDD)

**Files:**
- Create: `src/lib/sortByUpdatedAt.ts`
- Test: `src/lib/sortByUpdatedAt.test.ts`

- [ ] **Step 1: 테스트**

```ts
// src/lib/sortByUpdatedAt.test.ts
import { describe, it, expect } from "vitest";
import { sortByUpdatedAt } from "./sortByUpdatedAt";
import type { Page } from "@/types/page";

const page = (id: string, updatedAt: string): Page => ({
  _id: id,
  workspaceId: "ws_1",
  parentPageId: null,
  title: id,
  order: 0,
  isArchived: false,
  isPublished: false,
  properties: {},
  createdAt: updatedAt,
  updatedAt,
  removedAt: null,
});

describe("sortByUpdatedAt", () => {
  it("최신이 앞으로", () => {
    const result = sortByUpdatedAt([
      page("a", "2026-04-01T00:00:00Z"),
      page("b", "2026-04-29T00:00:00Z"),
      page("c", "2026-04-15T00:00:00Z"),
    ]);
    expect(result.map((p) => p._id)).toEqual(["b", "c", "a"]);
  });

  it("입력 배열을 변형하지 않는다 (불변)", () => {
    const input = [page("a", "2026-04-01T00:00:00Z"), page("b", "2026-04-29T00:00:00Z")];
    const before = input.map((p) => p._id);
    sortByUpdatedAt(input);
    expect(input.map((p) => p._id)).toEqual(before);
  });

  it("limit 옵션은 결과 개수를 제한한다", () => {
    const result = sortByUpdatedAt(
      [
        page("a", "2026-04-01T00:00:00Z"),
        page("b", "2026-04-29T00:00:00Z"),
        page("c", "2026-04-15T00:00:00Z"),
      ],
      2,
    );
    expect(result.map((p) => p._id)).toEqual(["b", "c"]);
  });

  it("동일 updatedAt 은 입력 순서 유지 (안정 정렬)", () => {
    const result = sortByUpdatedAt([
      page("a", "2026-04-01T00:00:00Z"),
      page("b", "2026-04-01T00:00:00Z"),
    ]);
    expect(result.map((p) => p._id)).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/lib/sortByUpdatedAt.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
// src/lib/sortByUpdatedAt.ts
import type { Page } from "@/types/page";

export function sortByUpdatedAt(pages: Page[], limit?: number): Page[] {
  const indexed = pages.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => {
    const ta = new Date(a.p.updatedAt).getTime();
    const tb = new Date(b.p.updatedAt).getTime();
    if (tb !== ta) return tb - ta;
    return a.i - b.i;
  });
  const out = indexed.map((x) => x.p);
  return typeof limit === "number" ? out.slice(0, limit) : out;
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/lib/sortByUpdatedAt.test.ts`
Expected: PASS — 4/4.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/sortByUpdatedAt.ts src/lib/sortByUpdatedAt.test.ts
git commit -m "feat(lib): sortByUpdatedAt — stable desc sort with optional limit"
```

---

## Task 3: `useRecentPages` 훅 (TDD)

**Files:**
- Create: `src/hooks/useRecentPages.ts`
- Test: `src/hooks/useRecentPages.test.tsx`

**Why:** Bento 카드 #4 + 사이드바 최근 항목 섹션이 사용. 훅 한 곳에서 정렬/필터 로직을 캡슐화.

- [ ] **Step 1: 테스트**

```tsx
// src/hooks/useRecentPages.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useRecentPages } from "./useRecentPages";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useRecentPages", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("type=meeting/project 만 반환하고 root 폴더는 제외한다", async () => {
    const { result } = renderHook(() => useRecentPages(20), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      result.current.data!.every(
        (p) =>
          p.properties.type === "meeting" || p.properties.type === "project",
      ),
    ).toBe(true);
  });

  it("updatedAt 내림차순으로 정렬된다", async () => {
    const { result } = renderHook(() => useRecentPages(20), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const times = result.current.data!.map((p) => new Date(p.updatedAt).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]).toBeGreaterThanOrEqual(times[i]);
    }
  });

  it("limit 만큼만 반환한다", async () => {
    const { result } = renderHook(() => useRecentPages(3), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.length).toBeLessThanOrEqual(3);
  });

  it("archived 페이지는 제외한다", async () => {
    db.pages[2].isArchived = true;
    const archivedId = db.pages[2]._id;
    const { result } = renderHook(() => useRecentPages(20), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.some((p) => p._id === archivedId)).toBe(false);
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/hooks/useRecentPages.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
// src/hooks/useRecentPages.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPages } from "@/api/pages";
import { sortByUpdatedAt } from "@/lib/sortByUpdatedAt";
import { useWorkspace } from "./useWorkspace";
import type { Page } from "@/types/page";

export function useRecentPages(limit: number) {
  const { workspaceId } = useWorkspace();
  const query = useQuery({
    queryKey: ["pages", { workspaceId, parentPageId: undefined, includeArchived: false }],
    queryFn: () => getPages({ workspaceId: workspaceId!, includeArchived: false }),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const sorted = useMemo<Page[] | undefined>(() => {
    if (!query.data) return undefined;
    const filtered = query.data.filter(
      (p) =>
        p.properties.type === "meeting" || p.properties.type === "project",
    );
    return sortByUpdatedAt(filtered, limit);
  }, [query.data, limit]);

  return {
    ...query,
    data: sorted,
  };
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/hooks/useRecentPages.test.tsx`
Expected: PASS — 4/4.

만약 `useRecentPages` 가 `usePages` 와 같은 queryKey 를 공유해 캐시 충돌이 의심되면, queryKey 를 `["pages", { workspaceId, scope: "all" }]` 같이 분리.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useRecentPages.ts src/hooks/useRecentPages.test.tsx
git commit -m "feat(hooks): useRecentPages — workspace-wide recent meetings/projects"
```

---

## Task 4: `useFavoritePages` 훅 (TDD)

**Files:**
- Create: `src/hooks/useFavoritePages.ts`
- Test: `src/hooks/useFavoritePages.test.tsx`

**Why:** Bento 즐겨찾기 카드 + 사이드바 즐겨찾기 섹션이 사용.

- [ ] **Step 1: 테스트**

```tsx
// src/hooks/useFavoritePages.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useFavoritePages } from "./useFavoritePages";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useFavoritePages", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("isPinned=true 만 반환한다", async () => {
    // 시드의 페이지 중 두 개를 핀 처리
    const targets = db.pages
      .filter(
        (p) =>
          p.properties.type === "meeting" || p.properties.type === "project",
      )
      .slice(0, 2);
    targets.forEach((p) => {
      p.properties.isPinned = true;
    });

    const { result } = renderHook(() => useFavoritePages(20), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.length).toBe(2);
    expect(result.current.data!.every((p) => p.properties.isPinned)).toBe(true);
  });

  it("아무도 핀이 안 되어있으면 빈 배열", async () => {
    db.pages.forEach((p) => {
      p.properties.isPinned = false;
    });
    const { result } = renderHook(() => useFavoritePages(20), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("limit 적용", async () => {
    db.pages
      .filter(
        (p) =>
          p.properties.type === "meeting" || p.properties.type === "project",
      )
      .slice(0, 5)
      .forEach((p) => {
        p.properties.isPinned = true;
      });
    const { result } = renderHook(() => useFavoritePages(3), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.length).toBe(3);
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/hooks/useFavoritePages.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
// src/hooks/useFavoritePages.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPages } from "@/api/pages";
import { sortByUpdatedAt } from "@/lib/sortByUpdatedAt";
import { useWorkspace } from "./useWorkspace";
import type { Page } from "@/types/page";

export function useFavoritePages(limit: number) {
  const { workspaceId } = useWorkspace();
  const query = useQuery({
    queryKey: ["pages", { workspaceId, parentPageId: undefined, includeArchived: false }],
    queryFn: () => getPages({ workspaceId: workspaceId!, includeArchived: false }),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const filtered = useMemo<Page[] | undefined>(() => {
    if (!query.data) return undefined;
    const candidates = query.data.filter(
      (p) =>
        (p.properties.type === "meeting" || p.properties.type === "project") &&
        p.properties.isPinned === true,
    );
    return sortByUpdatedAt(candidates, limit);
  }, [query.data, limit]);

  return { ...query, data: filtered };
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/hooks/useFavoritePages.test.tsx`
Expected: PASS — 3/3.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useFavoritePages.ts src/hooks/useFavoritePages.test.tsx
git commit -m "feat(hooks): useFavoritePages — pinned pages, recency-ordered"
```

---

## Task 5: `useTogglePin` 훅 (TDD)

**Files:**
- Create: `src/hooks/useTogglePin.ts`
- Test: `src/hooks/useTogglePin.test.tsx`

**Why:** PinToggle 버튼이 ProjectCard / MeetingCard / MeetingHeader / ProjectMetaBar 네 곳에서 호출. 훅 하나로 mutation 시그니처 통일.

- [ ] **Step 1: 테스트**

```tsx
// src/hooks/useTogglePin.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useTogglePin } from "./useTogglePin";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useTogglePin", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("핀 안 된 페이지를 호출하면 isPinned=true 가 PATCH 된다", async () => {
    const target = db.pages.find((p) => p.properties.type === "project")!;
    target.properties.isPinned = false;
    const { result } = renderHook(() => useTogglePin(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ pageId: target._id, currentlyPinned: false });
    });
    expect(db.pages.find((p) => p._id === target._id)!.properties.isPinned).toBe(true);
  });

  it("핀 된 페이지를 호출하면 isPinned=false 가 PATCH 된다", async () => {
    const target = db.pages.find((p) => p.properties.type === "project")!;
    target.properties.isPinned = true;
    const { result } = renderHook(() => useTogglePin(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ pageId: target._id, currentlyPinned: true });
    });
    expect(db.pages.find((p) => p._id === target._id)!.properties.isPinned).toBe(false);
  });

  it("PATCH 가 다른 properties 를 보존한다 (deep-merge 의존)", async () => {
    const target = db.pages.find(
      (p) => p.properties.type === "project" && p.properties.tags?.length,
    )!;
    target.properties.isPinned = false;
    const originalTags = target.properties.tags;
    const originalProgress = target.properties.progress;

    const { result } = renderHook(() => useTogglePin(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ pageId: target._id, currentlyPinned: false });
    });
    const updated = db.pages.find((p) => p._id === target._id)!;
    expect(updated.properties.tags).toEqual(originalTags);
    expect(updated.properties.progress).toBe(originalProgress);
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/hooks/useTogglePin.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
// src/hooks/useTogglePin.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePage } from "@/api/pages";

interface Vars {
  pageId: string;
  currentlyPinned: boolean;
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, currentlyPinned }: Vars) =>
      updatePage(pageId, { properties: { isPinned: !currentlyPinned } }),
    onSettled: (_data, _err, { pageId }) => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      qc.invalidateQueries({ queryKey: ["page-detail", pageId] });
    },
  });
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/hooks/useTogglePin.test.tsx`
Expected: PASS — 3/3.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useTogglePin.ts src/hooks/useTogglePin.test.tsx
git commit -m "feat(hooks): useTogglePin — boolean toggle on properties.isPinned"
```

---

## Task 6: `PinToggle` 컴포넌트 + 4개 호출처 통합 (TDD)

**Files:**
- Create: `src/components/properties/PinToggle.tsx`
- Test: `src/components/properties/PinToggle.test.tsx`
- Modify: `src/components/projects/ProjectCard.tsx`
- Modify: `src/components/meetings/MeetingCard.tsx`
- Modify: `src/components/meetings/MeetingHeader.tsx`
- Modify: `src/components/projects/ProjectMetaBar.tsx`
- Modify: `src/routes/MeetingDetailPage.tsx`
- Modify: `src/routes/ProjectDetailPage.tsx`

**Why:** 단일 토글 컴포넌트가 네 곳에 들어가야 사이드바/홈 즐겨찾기와 정합. Card 들은 `<Link>` 안에 있어 `e.preventDefault() + e.stopPropagation()` 로 클릭 전파 차단 필요.

- [ ] **Step 1: PinToggle 테스트**

```tsx
// src/components/properties/PinToggle.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PinToggle } from "./PinToggle";

describe("PinToggle", () => {
  it("isPinned=false 면 빈 핀 아이콘", () => {
    render(<PinToggle isPinned={false} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /즐겨찾기 추가|pin/i })).toBeInTheDocument();
  });

  it("isPinned=true 면 채워진 핀 + 다른 라벨", () => {
    render(<PinToggle isPinned={true} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /즐겨찾기 해제|unpin/i })).toBeInTheDocument();
  });

  it("클릭 시 onToggle 호출 + 부모 클릭 전파 차단", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <PinToggle isPinned={false} onToggle={onToggle} />
      </div>,
    );
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/components/properties/PinToggle.test.tsx`
Expected: FAIL.

- [ ] **Step 3: PinToggle 구현**

```tsx
// src/components/properties/PinToggle.tsx
import { Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  isPinned: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function PinToggle({ isPinned, onToggle, size = "sm", className }: Props) {
  const iconSize = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <button
      type="button"
      aria-label={isPinned ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1 text-muted-ink hover:text-tag-pink",
        isPinned && "text-tag-pink",
        className,
      )}
    >
      {isPinned ? (
        <Pin className={cn(iconSize, "fill-current")} />
      ) : (
        <PinOff className={iconSize} />
      )}
    </button>
  );
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/components/properties/PinToggle.test.tsx`
Expected: PASS — 3/3.

- [ ] **Step 5: ProjectCard 에 PinToggle 통합**

`src/components/projects/ProjectCard.tsx` 의 `Pin` import 와 `isPinned &&` 표시를 PinToggle 로 교체:

```tsx
// src/components/projects/ProjectCard.tsx
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { PinToggle } from "@/components/properties/PinToggle";
import { useTogglePin } from "@/hooks/useTogglePin";
import type { Page, ProjectStatus } from "@/types/page";

interface ProjectCardProps {
  project: Page;
  preview: string;
}

export function ProjectCard({ project, preview }: ProjectCardProps) {
  const status = (project.properties.status ?? "planned") as ProjectStatus;
  const progress = project.properties.progress;
  const tags = project.properties.tags ?? [];
  const isPinned = project.properties.isPinned === true;
  const showProgress =
    status === "in_progress" && typeof progress === "number";
  const clampedProgress = Math.max(0, Math.min(100, progress ?? 0));
  const togglePin = useTogglePin();

  return (
    <Link
      to={`/projects/${project._id}`}
      className={cn(
        "group block rounded-card bg-card border border-line p-3",
        "shadow-elevation hover:shadow-elevation-hover",
        "transition-all duration-card hover:scale-[1.01]",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-ink line-clamp-1">
          {project.title || "제목 없음"}
        </h3>
        <PinToggle
          isPinned={isPinned}
          onToggle={() =>
            togglePin.mutate({ pageId: project._id, currentlyPinned: isPinned })
          }
          className={cn(
            "shrink-0",
            !isPinned && "opacity-0 group-hover:opacity-100 transition-opacity",
          )}
        />
      </div>
      {preview && (
        <p className="text-xs text-muted-ink line-clamp-2 whitespace-pre-line mb-2">
          {preview}
        </p>
      )}
      {showProgress && (
        <div
          className="h-1 w-full rounded-full bg-line/60 overflow-hidden mb-2"
          aria-label={`진행률 ${clampedProgress}%`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={clampedProgress}
        >
          <div
            className="h-full bg-status-progressFg"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded bg-tag-pink/10 text-tag-pink"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 6: MeetingCard 통합**

`src/components/meetings/MeetingCard.tsx` 도 같은 패턴:

```tsx
// src/components/meetings/MeetingCard.tsx
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import { PinToggle } from "@/components/properties/PinToggle";
import { useTogglePin } from "@/hooks/useTogglePin";
import type { Page } from "@/types/page";

interface MeetingCardProps {
  meeting: Page;
  preview: string;
}

export function MeetingCard({ meeting, preview }: MeetingCardProps) {
  const isPinned = meeting.properties.isPinned === true;
  const togglePin = useTogglePin();

  return (
    <Link
      to={`/meetings/${meeting._id}`}
      className={cn(
        "group block rounded-card bg-card border border-line p-4",
        "shadow-elevation hover:shadow-elevation-hover",
        "transition-all duration-card hover:scale-[1.02]",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-ink">
          {formatMeetingDate(meeting.properties.date)}
        </span>
        <PinToggle
          isPinned={isPinned}
          onToggle={() =>
            togglePin.mutate({ pageId: meeting._id, currentlyPinned: isPinned })
          }
          className={cn(
            !isPinned && "opacity-0 group-hover:opacity-100 transition-opacity",
          )}
        />
      </div>
      <h3 className="text-base font-semibold text-ink mb-1 line-clamp-1">
        {meeting.title || "제목 없음"}
      </h3>
      <p className="text-sm text-muted-ink line-clamp-2 whitespace-pre-line">
        {preview || "내용 없음"}
      </p>
    </Link>
  );
}
```

- [ ] **Step 7: MeetingHeader 통합**

`src/components/meetings/MeetingHeader.tsx` 의 우측 영역에 PinToggle 추가. props 에 `isPinned`, `onPinToggle` 추가:

```tsx
// src/components/meetings/MeetingHeader.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SaveIndicator } from "@/components/editor/SaveIndicator";
import { PinToggle } from "@/components/properties/PinToggle";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import type { AutosaveStatus } from "@/hooks/useAutosaveBlocks";

interface MeetingHeaderProps {
  title: string;
  date?: string;
  isPinned: boolean;
  onTitleChange: (next: string) => void;
  onPinToggle: () => void;
  saveStatus: AutosaveStatus;
}

export function MeetingHeader({
  title,
  date,
  isPinned,
  onTitleChange,
  onPinToggle,
  saveStatus,
}: MeetingHeaderProps) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  return (
    <header className="sticky top-0 bg-page border-b border-line py-4 z-10">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate("/meetings")}
          className="inline-flex items-center gap-1 text-sm text-muted-ink hover:text-ink"
          aria-label="회의록 목록으로"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로
        </button>
        <div className="flex items-center gap-2">
          <PinToggle isPinned={isPinned} onToggle={onPinToggle} size="md" />
          <SaveIndicator status={saveStatus} />
        </div>
      </div>
      <div className="mt-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== title) onTitleChange(draft);
          }}
          placeholder="제목 없음"
          className="w-full bg-transparent text-3xl font-bold text-ink placeholder:text-muted-ink/40 focus:outline-none"
        />
        {date && (
          <p className="text-sm text-muted-ink mt-1">
            📅 {formatMeetingDate(date)}
          </p>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 8: MeetingDetailPage 가 새 props 전달**

`src/routes/MeetingDetailPage.tsx` 의 `<MeetingHeader>` 호출에 `isPinned` + `onPinToggle` 추가:

```tsx
// 기존 import 줄에 추가:
import { useTogglePin } from "@/hooks/useTogglePin";

// 컴포넌트 안:
const togglePin = useTogglePin();
const isPinned = page.properties.isPinned === true;

// JSX:
<MeetingHeader
  title={page.title}
  date={page.properties.date}
  isPinned={isPinned}
  saveStatus={autosave.status}
  onTitleChange={(next) => {
    if (!pageId) return;
    updatePage.mutate({ pageId, input: { title: next } });
  }}
  onPinToggle={() =>
    pageId && togglePin.mutate({ pageId, currentlyPinned: isPinned })
  }
/>
```

- [ ] **Step 9: ProjectMetaBar 에 PinToggle 추가**

`src/components/projects/ProjectMetaBar.tsx` 의 status 드롭다운 왼쪽에 PinToggle 추가. `onPinToggle` prop 추가:

```tsx
// src/components/projects/ProjectMetaBar.tsx
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PinToggle } from "@/components/properties/PinToggle";
import {
  PROJECT_STATUSES,
  projectStatusBadgeClass,
  projectStatusLabel,
} from "@/lib/projectStatus";
import { cn } from "@/lib/cn";
import type { Page, ProjectStatus } from "@/types/page";

interface ProjectMetaBarProps {
  project: Page;
  onStatusChange: (next: ProjectStatus) => void;
  onPinToggle: () => void;
}

export function ProjectMetaBar({
  project,
  onStatusChange,
  onPinToggle,
}: ProjectMetaBarProps) {
  const status = (project.properties.status ?? "planned") as ProjectStatus;
  const progress = project.properties.progress;
  const dueDate = project.properties.dueDate;
  const tags = project.properties.tags ?? [];
  const isPinned = project.properties.isPinned === true;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-ink">
      <PinToggle isPinned={isPinned} onToggle={onPinToggle} size="md" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
            projectStatusBadgeClass(status),
          )}
          aria-label="상태 변경"
        >
          {projectStatusLabel(status)}
          <ChevronDown className="w-3 h-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {PROJECT_STATUSES.map((s) => (
            <DropdownMenuItem
              key={s}
              onSelect={() => onStatusChange(s)}
              className={status === s ? "font-semibold" : ""}
            >
              {projectStatusLabel(s)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {typeof progress === "number" && (
        <span aria-label={`진행률 ${progress}%`}>📊 {progress}%</span>
      )}
      {dueDate && <span aria-label="마감일">📅 {dueDate}</span>}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label="태그">
          {tags.map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded bg-tag-pink/10 text-tag-pink"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 10: ProjectDetailPage 가 onPinToggle 전달**

`src/routes/ProjectDetailPage.tsx` 안에서:

```tsx
import { useTogglePin } from "@/hooks/useTogglePin";

// 컴포넌트 안:
const togglePin = useTogglePin();
// JSX 의 ProjectMetaBar 에 추가:
<ProjectMetaBar
  project={detailQuery.data.page}
  onStatusChange={(next: ProjectStatus) => {
    if (!pageId) return;
    updatePage.mutate({
      pageId,
      input: { properties: { status: next } },
    });
  }}
  onPinToggle={() => {
    if (!pageId) return;
    togglePin.mutate({
      pageId,
      currentlyPinned: detailQuery.data!.page.properties.isPinned === true,
    });
  }}
/>
```

- [ ] **Step 11: 풀스위트 회귀 검증**

Run: `npx vitest run`
Expected: 모든 기존 테스트 + Plan 5 task 1-6 PASS.

기존 ProjectMetaBar / MeetingHeader 테스트가 새 prop 시그니처를 안 갖춰 실패할 수 있다. 그럴 경우 그 테스트들에서 호출부에 `isPinned={false} onPinToggle={() => {}}` 같은 더미 prop 추가.

- [ ] **Step 12: 커밋**

```bash
git add src/components/properties/PinToggle.tsx src/components/properties/PinToggle.test.tsx \
        src/components/projects/ProjectCard.tsx src/components/meetings/MeetingCard.tsx \
        src/components/meetings/MeetingHeader.tsx src/components/projects/ProjectMetaBar.tsx \
        src/routes/MeetingDetailPage.tsx src/routes/ProjectDetailPage.tsx
git commit -m "feat(properties): PinToggle — 4 call sites + useTogglePin wiring"
```

---

## Task 7: `ProgressEditor` 컴포넌트 + ProjectMetaBar 통합 (TDD)

**Files:**
- Create: `src/components/properties/ProgressEditor.tsx`
- Test: `src/components/properties/ProgressEditor.test.tsx`
- Modify: `src/components/projects/ProjectMetaBar.tsx`
- Modify: `src/routes/ProjectDetailPage.tsx`

**UX:** 표시 모드(`📊 N%`) 클릭 → 인라인 input + range 슬라이더. blur/Enter → commit (debounced 1s 안에 추가 변경 있으면 합쳐서 PATCH 한 번만).

- [ ] **Step 1: ProgressEditor 테스트**

```tsx
// src/components/properties/ProgressEditor.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressEditor } from "./ProgressEditor";

describe("ProgressEditor", () => {
  it("readonly 모드: 값만 표시한다", () => {
    render(<ProgressEditor value={42} onCommit={() => {}} />);
    expect(screen.getByLabelText(/진행률/i)).toBeInTheDocument();
    expect(screen.getByText(/42%/)).toBeInTheDocument();
  });

  it("값이 없으면 '진행률 추가' 트리거를 표시한다", () => {
    render(<ProgressEditor value={undefined} onCommit={() => {}} />);
    expect(screen.getByRole("button", { name: /진행률 추가/i })).toBeInTheDocument();
  });

  it("트리거 클릭 → input 모드로 진입 + 자동 포커스", async () => {
    const user = userEvent.setup();
    render(<ProgressEditor value={42} onCommit={() => {}} />);
    await user.click(screen.getByText(/42%/));
    const input = screen.getByLabelText(/진행률 입력/i) as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input.value).toBe("42");
  });

  it("값을 바꾸고 Enter → onCommit(새 값)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<ProgressEditor value={42} onCommit={onCommit} />);
    await user.click(screen.getByText(/42%/));
    const input = screen.getByLabelText(/진행률 입력/i);
    await user.clear(input);
    await user.type(input, "75{Enter}");
    expect(onCommit).toHaveBeenCalledWith(75);
  });

  it("0-100 범위 밖 값은 clamp 한다", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<ProgressEditor value={42} onCommit={onCommit} />);
    await user.click(screen.getByText(/42%/));
    const input = screen.getByLabelText(/진행률 입력/i);
    await user.clear(input);
    await user.type(input, "150{Enter}");
    expect(onCommit).toHaveBeenCalledWith(100);
  });

  it("Esc 누르면 commit 없이 readonly 모드로", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<ProgressEditor value={42} onCommit={onCommit} />);
    await user.click(screen.getByText(/42%/));
    await user.keyboard("{Escape}");
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText(/42%/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/components/properties/ProgressEditor.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/properties/ProgressEditor.tsx
import { useEffect, useRef, useState } from "react";

interface Props {
  value: number | undefined;
  onCommit: (next: number | undefined) => void;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function ProgressEditor({ value, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? 0));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(String(value ?? 0));
  }, [value]);

  const commit = () => {
    setEditing(false);
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      onCommit(undefined);
      return;
    }
    onCommit(clamp(parsed));
  };

  const cancel = () => {
    setEditing(false);
    setDraft(String(value ?? 0));
  };

  if (!editing) {
    if (typeof value !== "number") {
      return (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-muted-ink hover:text-ink"
          aria-label="진행률 추가"
        >
          + 진행률
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-muted-ink hover:text-ink"
        aria-label={`진행률 ${value}%`}
      >
        📊 {value}%
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        ref={inputRef}
        type="number"
        min={0}
        max={100}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className="w-14 bg-transparent border border-line rounded px-1 py-0.5 text-xs text-ink"
        aria-label="진행률 입력"
      />
      <span className="text-xs text-muted-ink">%</span>
    </span>
  );
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/components/properties/ProgressEditor.test.tsx`
Expected: PASS — 6/6.

- [ ] **Step 5: ProjectMetaBar 통합**

`src/components/projects/ProjectMetaBar.tsx` 의 `progress` 표시 부분을 ProgressEditor 로 교체. props 에 `onProgressChange` 추가:

```tsx
// 변경된 부분만:
import { ProgressEditor } from "@/components/properties/ProgressEditor";

interface ProjectMetaBarProps {
  project: Page;
  onStatusChange: (next: ProjectStatus) => void;
  onPinToggle: () => void;
  onProgressChange: (next: number | undefined) => void;
}

// JSX 안: 기존 `{typeof progress === "number" && (...)}` 블록을 다음으로 교체:
<ProgressEditor
  value={typeof progress === "number" ? progress : undefined}
  onCommit={onProgressChange}
/>
```

- [ ] **Step 6: ProjectDetailPage 가 onProgressChange 전달**

```tsx
<ProjectMetaBar
  project={detailQuery.data.page}
  onStatusChange={...}
  onPinToggle={...}
  onProgressChange={(next) => {
    if (!pageId) return;
    updatePage.mutate({
      pageId,
      input: { properties: { progress: next } },
    });
  }}
/>
```

- [ ] **Step 7: 풀스위트 검증 + 커밋**

Run: `npx vitest run`
Expected: PASS.

```bash
git add src/components/properties/ProgressEditor.tsx src/components/properties/ProgressEditor.test.tsx \
        src/components/projects/ProjectMetaBar.tsx src/routes/ProjectDetailPage.tsx
git commit -m "feat(properties): ProgressEditor — inline 0-100 input"
```

---

## Task 8: `TagsEditor` 컴포넌트 + ProjectMetaBar 통합 (TDD)

**Files:**
- Create: `src/components/properties/TagsEditor.tsx`
- Test: `src/components/properties/TagsEditor.test.tsx`
- Modify: `src/components/projects/ProjectMetaBar.tsx`
- Modify: `src/routes/ProjectDetailPage.tsx`

**UX:** 태그 칩들 + 끝에 `+` 버튼 → 작은 input. Enter/Comma → 태그 추가. 칩 hover → ✕ 로 삭제.

- [ ] **Step 1: 테스트**

```tsx
// src/components/properties/TagsEditor.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagsEditor } from "./TagsEditor";

describe("TagsEditor", () => {
  it("기존 태그를 칩으로 표시한다", () => {
    render(<TagsEditor value={["a", "b"]} onCommit={() => {}} />);
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
  });

  it("+ 클릭 → input 입력 → Enter → onCommit([...prev, new])", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={["a"]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 추가/i }));
    const input = screen.getByLabelText(/태그 입력/i);
    await user.type(input, "new{Enter}");
    expect(onCommit).toHaveBeenCalledWith(["a", "new"]);
  });

  it("Comma 입력도 태그로 commit 한다", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={[]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 추가/i }));
    const input = screen.getByLabelText(/태그 입력/i);
    await user.type(input, "x,");
    expect(onCommit).toHaveBeenCalledWith(["x"]);
  });

  it("중복 태그는 무시한다 (대소문자 구분 없이)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={["frontend"]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 추가/i }));
    await user.type(screen.getByLabelText(/태그 입력/i), "FRONTEND{Enter}");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("빈 문자열은 commit 하지 않는다", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={[]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 추가/i }));
    await user.type(screen.getByLabelText(/태그 입력/i), "   {Enter}");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("✕ 클릭 → onCommit(제거된 배열)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={["a", "b"]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 a 제거/i }));
    expect(onCommit).toHaveBeenCalledWith(["b"]);
  });

  it("Esc 는 input 을 닫고 commit 안 함", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={[]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 추가/i }));
    const input = screen.getByLabelText(/태그 입력/i);
    await user.type(input, "draft");
    await user.keyboard("{Escape}");
    expect(onCommit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/components/properties/TagsEditor.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/properties/TagsEditor.tsx
import { useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  value: string[];
  onCommit: (next: string[]) => void;
}

export function TagsEditor({ value, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const tryAdd = () => {
    const next = draft.trim();
    setDraft("");
    if (next.length === 0) {
      setEditing(false);
      return;
    }
    const lower = next.toLowerCase();
    if (value.some((t) => t.toLowerCase() === lower)) {
      setEditing(false);
      return;
    }
    onCommit([...value, next]);
    setEditing(false);
  };

  const remove = (tag: string) => {
    onCommit(value.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-1" aria-label="태그">
      {value.map((t) => (
        <span
          key={t}
          className="group/tag inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-tag-pink/10 text-tag-pink"
        >
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            aria-label={`태그 ${t} 제거`}
            className="opacity-0 group-hover/tag:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) {
              setDraft(v.slice(0, -1));
              setTimeout(tryAdd, 0);
              return;
            }
            setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              tryAdd();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
              setDraft("");
            }
          }}
          onBlur={tryAdd}
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded border border-line bg-transparent",
            "w-20 text-ink",
          )}
          aria-label="태그 입력"
          placeholder="새 태그"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="태그 추가"
          className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border border-dashed border-line text-muted-ink hover:text-ink"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
```

`onChange` 안에서 comma 처리는 `setTimeout(... , 0)` 로 한 틱 미루어 controlled input 의 동기성 보장 — `tryAdd` 가 `setDraft("")` 를 부르므로.

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/components/properties/TagsEditor.test.tsx`
Expected: PASS — 7/7.

만약 comma 케이스의 timing 이 jsdom 에서 불안정하면 `setTimeout` 대신 다음 틱에 `flushSync` 대신 ref-기반 시퀀스로 변경.

- [ ] **Step 5: ProjectMetaBar 통합**

```tsx
// src/components/projects/ProjectMetaBar.tsx 변경:
import { TagsEditor } from "@/components/properties/TagsEditor";

interface ProjectMetaBarProps {
  // ... 기존
  onTagsChange: (next: string[]) => void;
}

// JSX 의 `{tags.length > 0 && (...)}` 블록을 항상 렌더로 교체:
<TagsEditor value={tags} onCommit={onTagsChange} />
```

- [ ] **Step 6: ProjectDetailPage 가 onTagsChange 전달**

```tsx
<ProjectMetaBar
  // ... 기존
  onTagsChange={(next) => {
    if (!pageId) return;
    updatePage.mutate({
      pageId,
      input: { properties: { tags: next } },
    });
  }}
/>
```

- [ ] **Step 7: 풀스위트 + 커밋**

Run: `npx vitest run`
Expected: PASS.

```bash
git add src/components/properties/TagsEditor.tsx src/components/properties/TagsEditor.test.tsx \
        src/components/projects/ProjectMetaBar.tsx src/routes/ProjectDetailPage.tsx
git commit -m "feat(properties): TagsEditor — chip add/remove inline"
```

---

## Task 9: `DueDateEditor` 컴포넌트 + ProjectMetaBar 통합 (TDD)

**Files:**
- Create: `src/components/properties/DueDateEditor.tsx`
- Test: `src/components/properties/DueDateEditor.test.tsx`
- Modify: `src/components/projects/ProjectMetaBar.tsx`
- Modify: `src/routes/ProjectDetailPage.tsx`

- [ ] **Step 1: 테스트**

```tsx
// src/components/properties/DueDateEditor.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DueDateEditor } from "./DueDateEditor";

describe("DueDateEditor", () => {
  it("값이 있으면 표시한다", () => {
    render(<DueDateEditor value="2026-05-10" onCommit={() => {}} />);
    expect(screen.getByText(/2026-05-10/)).toBeInTheDocument();
  });

  it("값이 없으면 '+ 마감일' 트리거", () => {
    render(<DueDateEditor value={undefined} onCommit={() => {}} />);
    expect(screen.getByRole("button", { name: /마감일 추가/i })).toBeInTheDocument();
  });

  it("표시 클릭 → date input 노출 + 값 변경 → onCommit(YYYY-MM-DD)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<DueDateEditor value="2026-05-10" onCommit={onCommit} />);
    await user.click(screen.getByText(/2026-05-10/));
    const input = screen.getByLabelText(/마감일 입력/i) as HTMLInputElement;
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, "2026-06-01");
    input.blur();
    expect(onCommit).toHaveBeenCalledWith("2026-06-01");
  });

  it("input 을 비우고 blur → onCommit(undefined) (마감일 제거)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<DueDateEditor value="2026-05-10" onCommit={onCommit} />);
    await user.click(screen.getByText(/2026-05-10/));
    const input = screen.getByLabelText(/마감일 입력/i) as HTMLInputElement;
    await user.clear(input);
    input.blur();
    expect(onCommit).toHaveBeenCalledWith(undefined);
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/components/properties/DueDateEditor.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/properties/DueDateEditor.tsx
import { useEffect, useRef, useState } from "react";

interface Props {
  value: string | undefined;
  onCommit: (next: string | undefined) => void;
}

export function DueDateEditor({ value, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      if (value) onCommit(undefined);
      return;
    }
    if (trimmed === value) return;
    onCommit(trimmed);
  };

  if (!editing) {
    if (!value) {
      return (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="마감일 추가"
          className="text-xs text-muted-ink hover:text-ink"
        >
          + 마감일
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`마감일 ${value}`}
        className="text-xs text-muted-ink hover:text-ink"
      >
        📅 {value}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="date"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setEditing(false);
          setDraft(value ?? "");
        }
      }}
      className="text-xs bg-transparent border border-line rounded px-1 py-0.5 text-ink"
      aria-label="마감일 입력"
    />
  );
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/components/properties/DueDateEditor.test.tsx`
Expected: PASS — 4/4.

만약 jsdom 의 `<input type="date">` 가 `user.type` 을 정상적으로 처리하지 못하면 (브라우저별 입력 형식 차이) `fireEvent.change(input, { target: { value: "2026-06-01" }})` 로 치환.

- [ ] **Step 5: ProjectMetaBar 통합 + ProjectDetailPage 연결**

ProjectMetaBar 의 `{dueDate && ...}` 블록을 다음으로 교체:

```tsx
import { DueDateEditor } from "@/components/properties/DueDateEditor";

interface ProjectMetaBarProps {
  // ... 기존
  onDueDateChange: (next: string | undefined) => void;
}

<DueDateEditor value={dueDate} onCommit={onDueDateChange} />
```

ProjectDetailPage 에 prop 추가:

```tsx
onDueDateChange={(next) => {
  if (!pageId) return;
  updatePage.mutate({
    pageId,
    input: { properties: { dueDate: next } },
  });
}}
```

- [ ] **Step 6: 풀스위트 + 커밋**

Run: `npx vitest run`
Expected: PASS.

```bash
git add src/components/properties/DueDateEditor.tsx src/components/properties/DueDateEditor.test.tsx \
        src/components/projects/ProjectMetaBar.tsx src/routes/ProjectDetailPage.tsx
git commit -m "feat(properties): DueDateEditor — inline date input"
```

---

## Task 10: `BentoCard` wrapper 컴포넌트

**Files:**
- Create: `src/components/home/BentoCard.tsx`

**Why:** 5개 카드의 공통 외형(둥근 모서리, 그림자, 액센트 보더, 헤더). 한 컴포넌트가 표준화하면 일관성 + 미래 폴리싱 한 곳.

- [ ] **Step 1: 구현**

```tsx
// src/components/home/BentoCard.tsx
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

type AccentColor = "teal" | "orange" | "pink" | "violet" | "sky";

interface Props {
  title: string;
  accent?: AccentColor;
  span?: "1x1" | "2x1" | "1x2";
  seeMoreHref?: string;
  className?: string;
  children: React.ReactNode;
}

const ACCENT_BORDER: Record<AccentColor, string> = {
  teal: "before:bg-brand",
  orange: "before:bg-cta",
  pink: "before:bg-tag-pink",
  violet: "before:bg-tag-violet",
  sky: "before:bg-tag-sky",
};

const SPAN: Record<NonNullable<Props["span"]>, string> = {
  "1x1": "col-span-1 row-span-1",
  "2x1": "col-span-2 row-span-1",
  "1x2": "col-span-1 row-span-2",
};

export function BentoCard({
  title,
  accent = "teal",
  span = "1x1",
  seeMoreHref,
  className,
  children,
}: Props) {
  return (
    <section
      className={cn(
        "relative rounded-card bg-card border border-line p-4",
        "shadow-elevation transition-shadow hover:shadow-elevation-hover",
        "before:content-[''] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-0.5 before:rounded",
        ACCENT_BORDER[accent],
        SPAN[span],
        className,
      )}
    >
      <header className="flex items-center justify-between mb-3 pl-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {seeMoreHref ? (
          <Link
            to={seeMoreHref}
            className="inline-flex items-center gap-1 text-xs text-muted-ink hover:text-ink"
          >
            모두 보기
            <ArrowRight className="w-3 h-3" />
          </Link>
        ) : null}
      </header>
      <div className="pl-2">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: 컴파일 검증**

Run: `npx tsc -b --noEmit`
Expected: PASS.

만약 `bg-tag-violet` / `bg-tag-sky` Tailwind 토큰이 없으면 `tailwind.config.ts` 에 추가하거나 `bg-violet-500` 같은 기본 컬러로 대체. (spec §2-2 의 보조 액센트와 정합되도록 추가하는 게 권장.)

- [ ] **Step 3: 커밋**

```bash
git add src/components/home/BentoCard.tsx
git commit -m "feat(home): BentoCard — shared card shell with accent + span"
```

---

## Task 11: `ProjectsInProgressCard` 컴포넌트 (TDD)

**Files:**
- Create: `src/components/home/ProjectsInProgressCard.tsx`
- Test: `src/components/home/ProjectsInProgressCard.test.tsx`

- [ ] **Step 1: 테스트**

```tsx
// src/components/home/ProjectsInProgressCard.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { ProjectsInProgressCard } from "./ProjectsInProgressCard";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProjectsInProgressCard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectsInProgressCard", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("status=in_progress 프로젝트만 표시한다", async () => {
    setup();
    await waitFor(() =>
      expect(screen.queryAllByRole("listitem").length).toBeGreaterThan(0),
    );
    const inProgressProjects = db.pages.filter(
      (p) =>
        p.properties.type === "project" &&
        p.properties.status === "in_progress",
    );
    inProgressProjects.forEach((p) => {
      expect(screen.getByText(p.title)).toBeInTheDocument();
    });
  });

  it("진행률 바가 함께 렌더된다", async () => {
    setup();
    await waitFor(() =>
      expect(screen.queryAllByRole("progressbar").length).toBeGreaterThan(0),
    );
  });

  it("프로젝트가 없으면 '진행중인 프로젝트 없음' 안내", async () => {
    db.pages.forEach((p) => {
      if (p.properties.status === "in_progress") {
        p.properties.status = "planned";
      }
    });
    setup();
    await waitFor(() =>
      expect(screen.getByText(/진행중인 프로젝트 없음/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/components/home/ProjectsInProgressCard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/home/ProjectsInProgressCard.tsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPages } from "@/api/pages";
import { useWorkspace } from "@/hooks/useWorkspace";
import { BentoCard } from "./BentoCard";
import type { Page } from "@/types/page";

export function ProjectsInProgressCard() {
  const { workspaceId, rootFolders } = useWorkspace();
  const projectsRoot = rootFolders?.projects;
  const query = useQuery({
    queryKey: ["pages", { workspaceId, parentPageId: projectsRoot, includeArchived: false }],
    queryFn: () =>
      getPages({
        workspaceId: workspaceId!,
        parentPageId: projectsRoot,
        includeArchived: false,
      }),
    enabled: !!workspaceId && !!projectsRoot,
    staleTime: 30_000,
  });

  const inProgress = useMemo<Page[]>(() => {
    return (query.data ?? []).filter(
      (p) => p.properties.status === "in_progress",
    );
  }, [query.data]);

  return (
    <BentoCard
      title="진행중 프로젝트"
      accent="orange"
      span="2x1"
      seeMoreHref="/projects"
    >
      {query.isLoading ? (
        <p className="text-xs text-muted-ink">불러오는 중...</p>
      ) : inProgress.length === 0 ? (
        <p className="text-xs text-muted-ink">진행중인 프로젝트 없음</p>
      ) : (
        <ul className="space-y-2">
          {inProgress.map((p) => {
            const progress = Math.max(
              0,
              Math.min(100, p.properties.progress ?? 0),
            );
            return (
              <li key={p._id}>
                <Link
                  to={`/projects/${p._id}`}
                  className="block hover:bg-page rounded-md p-2 -mx-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink line-clamp-1">{p.title}</span>
                    <span className="text-xs text-muted-ink shrink-0 ml-2">
                      {progress}%
                    </span>
                  </div>
                  <div
                    className="h-1 w-full rounded-full bg-line/60 overflow-hidden mt-1"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div
                      className="h-full bg-status-progressFg"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </BentoCard>
  );
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/components/home/ProjectsInProgressCard.test.tsx`
Expected: PASS — 3/3.

- [ ] **Step 5: 커밋**

```bash
git add src/components/home/ProjectsInProgressCard.tsx src/components/home/ProjectsInProgressCard.test.tsx
git commit -m "feat(home): ProjectsInProgressCard — bento card with progress bars"
```

---

## Task 12: `QuickActionsCard` 컴포넌트

**Files:**
- Create: `src/components/home/QuickActionsCard.tsx`

**Why:** Plan 2 와 Plan 3 의 새 페이지 생성 흐름 (`useCreatePage`) 을 카드 안에 노출. ⌘K 버튼은 `commandPaletteStore.toggle()` 호출.

**참고:** 기존 `MeetingsListPage.tsx` 와 `ProjectsKanbanPage.tsx` 가 새 페이지 생성 후 navigate 하는 패턴 — 그 로직을 함수로 빼서 재사용해도 좋지만, 이번은 단순화를 위해 navigate 만 한다 (사용자가 리스트 페이지에서 + 버튼 누르는 것과 동일). 이 카드는 스테이트풀 mutation 을 직접 호출하지 않는다.

- [ ] **Step 1: 구현**

```tsx
// src/components/home/QuickActionsCard.tsx
import { Link } from "react-router-dom";
import { FileText, KanbanSquare, Search } from "lucide-react";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { BentoCard } from "./BentoCard";

export function QuickActionsCard() {
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  return (
    <BentoCard title="빠른 액션" accent="teal" span="1x1">
      <div className="space-y-2">
        <Link
          to="/meetings"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink hover:bg-page"
        >
          <FileText className="w-4 h-4 text-muted-ink" />
          새 회의록
        </Link>
        <Link
          to="/projects"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink hover:bg-page"
        >
          <KanbanSquare className="w-4 h-4 text-muted-ink" />
          새 프로젝트
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink hover:bg-page text-left"
        >
          <Search className="w-4 h-4 text-muted-ink" />
          ⌘K 검색
        </button>
      </div>
    </BentoCard>
  );
}
```

- [ ] **Step 2: 컴파일 검증**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add src/components/home/QuickActionsCard.tsx
git commit -m "feat(home): QuickActionsCard — shortcuts to meetings/projects/⌘K"
```

---

## Task 13: `RecentMeetingsCard` 컴포넌트

**Files:**
- Create: `src/components/home/RecentMeetingsCard.tsx`

- [ ] **Step 1: 구현**

```tsx
// src/components/home/RecentMeetingsCard.tsx
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPages } from "@/api/pages";
import { sortByUpdatedAt } from "@/lib/sortByUpdatedAt";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import { useWorkspace } from "@/hooks/useWorkspace";
import { BentoCard } from "./BentoCard";

export function RecentMeetingsCard() {
  const { workspaceId, rootFolders } = useWorkspace();
  const meetingsRoot = rootFolders?.meetings;
  const query = useQuery({
    queryKey: ["pages", { workspaceId, parentPageId: meetingsRoot, includeArchived: false }],
    queryFn: () =>
      getPages({
        workspaceId: workspaceId!,
        parentPageId: meetingsRoot,
        includeArchived: false,
      }),
    enabled: !!workspaceId && !!meetingsRoot,
    staleTime: 30_000,
  });

  const recent = useMemo(() => sortByUpdatedAt(query.data ?? [], 5), [query.data]);

  return (
    <BentoCard
      title="최근 회의록"
      accent="violet"
      span="1x1"
      seeMoreHref="/meetings"
    >
      {query.isLoading ? (
        <p className="text-xs text-muted-ink">불러오는 중...</p>
      ) : recent.length === 0 ? (
        <p className="text-xs text-muted-ink">회의록 없음</p>
      ) : (
        <ul className="space-y-1">
          {recent.map((p) => (
            <li key={p._id}>
              <Link
                to={`/meetings/${p._id}`}
                className="block hover:bg-page rounded-md p-1.5 -mx-1.5 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink line-clamp-1">{p.title || "제목 없음"}</span>
                  <span className="text-[10px] text-muted-ink shrink-0">
                    {formatMeetingDate(p.properties.date)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BentoCard>
  );
}
```

- [ ] **Step 2: 컴파일 검증 + 커밋**

Run: `npx tsc -b --noEmit`

```bash
git add src/components/home/RecentMeetingsCard.tsx
git commit -m "feat(home): RecentMeetingsCard — top 5 by updatedAt"
```

---

## Task 14: `RecentChangesCard` 컴포넌트

**Files:**
- Create: `src/components/home/RecentChangesCard.tsx`

**Why:** spec §4-1 #4 — 회의록+프로젝트 통합, 상대 시간. 위에서 만든 `useRecentPages` + `relativeTime` 의 첫 호출처.

- [ ] **Step 1: 구현**

```tsx
// src/components/home/RecentChangesCard.tsx
import { Link } from "react-router-dom";
import { FileText, KanbanSquare } from "lucide-react";
import { useRecentPages } from "@/hooks/useRecentPages";
import { relativeTime } from "@/lib/relativeTime";
import { BentoCard } from "./BentoCard";

function pageHref(p: { _id: string; properties: { type?: string } }): string {
  return p.properties.type === "project"
    ? `/projects/${p._id}`
    : `/meetings/${p._id}`;
}

export function RecentChangesCard() {
  const recent = useRecentPages(8);

  return (
    <BentoCard title="최근 변경" accent="sky" span="2x1">
      {recent.isLoading ? (
        <p className="text-xs text-muted-ink">불러오는 중...</p>
      ) : !recent.data || recent.data.length === 0 ? (
        <p className="text-xs text-muted-ink">변경된 항목 없음</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
          {recent.data.map((p) => {
            const Icon = p.properties.type === "project" ? KanbanSquare : FileText;
            return (
              <li key={p._id}>
                <Link
                  to={pageHref(p)}
                  className="flex items-center gap-2 hover:bg-page rounded-md px-1.5 py-1 -mx-1.5 text-sm"
                >
                  <Icon className="w-3.5 h-3.5 text-muted-ink shrink-0" />
                  <span className="text-ink line-clamp-1 flex-1">
                    {p.title || "제목 없음"}
                  </span>
                  <span className="text-[10px] text-muted-ink shrink-0">
                    {relativeTime(p.updatedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </BentoCard>
  );
}
```

- [ ] **Step 2: 컴파일 + 커밋**

Run: `npx tsc -b --noEmit`

```bash
git add src/components/home/RecentChangesCard.tsx
git commit -m "feat(home): RecentChangesCard — workspace-wide recent updates"
```

---

## Task 15: `FavoritesCard` 컴포넌트

**Files:**
- Create: `src/components/home/FavoritesCard.tsx`

- [ ] **Step 1: 구현**

```tsx
// src/components/home/FavoritesCard.tsx
import { Link } from "react-router-dom";
import { FileText, KanbanSquare, Pin } from "lucide-react";
import { useFavoritePages } from "@/hooks/useFavoritePages";
import { BentoCard } from "./BentoCard";

function pageHref(p: { _id: string; properties: { type?: string } }): string {
  return p.properties.type === "project"
    ? `/projects/${p._id}`
    : `/meetings/${p._id}`;
}

export function FavoritesCard() {
  const favs = useFavoritePages(5);

  return (
    <BentoCard title="즐겨찾기" accent="pink" span="1x1">
      {favs.isLoading ? (
        <p className="text-xs text-muted-ink">불러오는 중...</p>
      ) : !favs.data || favs.data.length === 0 ? (
        <p className="text-xs text-muted-ink">
          핀 고정한 항목이 없습니다.
        </p>
      ) : (
        <ul className="space-y-1">
          {favs.data.map((p) => {
            const Icon = p.properties.type === "project" ? KanbanSquare : FileText;
            return (
              <li key={p._id}>
                <Link
                  to={pageHref(p)}
                  className="flex items-center gap-2 hover:bg-page rounded-md p-1.5 -mx-1.5 text-sm"
                >
                  <Icon className="w-3.5 h-3.5 text-muted-ink shrink-0" />
                  <span className="text-ink line-clamp-1 flex-1">
                    {p.title || "제목 없음"}
                  </span>
                  <Pin className="w-3 h-3 text-tag-pink shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </BentoCard>
  );
}
```

- [ ] **Step 2: 컴파일 + 커밋**

```bash
git add src/components/home/FavoritesCard.tsx
git commit -m "feat(home): FavoritesCard — pinned pages list"
```

---

## Task 16: `HomePage` Bento 그리드 통합

**Files:**
- Modify: `src/routes/HomePage.tsx`
- Test: `src/routes/HomePage.test.tsx`

- [ ] **Step 1: 테스트**

```tsx
// src/routes/HomePage.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React from "react";
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
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/routes/HomePage.test.tsx`
Expected: FAIL — HomePage stub.

- [ ] **Step 3: HomePage 구현**

```tsx
// src/routes/HomePage.tsx
import { ProjectsInProgressCard } from "@/components/home/ProjectsInProgressCard";
import { QuickActionsCard } from "@/components/home/QuickActionsCard";
import { RecentMeetingsCard } from "@/components/home/RecentMeetingsCard";
import { RecentChangesCard } from "@/components/home/RecentChangesCard";
import { FavoritesCard } from "@/components/home/FavoritesCard";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">홈</h1>
        <p className="text-sm text-muted-ink mt-1">
          오늘의 변경 사항과 진행 상황
        </p>
      </header>
      <div className="grid grid-cols-3 gap-5 auto-rows-min">
        <ProjectsInProgressCard />
        <QuickActionsCard />
        <RecentMeetingsCard />
        <RecentChangesCard />
        <FavoritesCard />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/routes/HomePage.test.tsx`
Expected: PASS.

- [ ] **Step 5: 수동 sanity check**

```bash
npm run dev
```
브라우저에서 `/` 접속:
- 5개 카드 보임
- 카드 hover → 그림자 변화
- 진행중 프로젝트 클릭 → 프로젝트 상세 모달
- 즐겨찾기에 항목이 안 보이면 칸반에서 ProjectMetaBar 의 PinToggle 로 핀 → 카드에 즉시 노출

- [ ] **Step 6: 커밋**

```bash
git add src/routes/HomePage.tsx src/routes/HomePage.test.tsx
git commit -m "feat(home): HomePage — 5-card Bento grid"
```

---

## Task 17: `SidebarFavorites` + `SidebarRecent` 섹션 + Sidebar 통합

**Files:**
- Create: `src/components/layout/SidebarFavorites.tsx`
- Create: `src/components/layout/SidebarRecent.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Why:** spec §3-2 의 사이드바 두 섹션. 즐겨찾기는 항상 표시, 최근은 펼침/접힘 토글 (collapsed 상태에선 둘 다 숨김).

**Design:** Sidebar 가 collapsed 일 때 두 섹션은 렌더하지 않음 (좁은 공간). 대신 collapsed 일 땐 메인 NAV 만.

- [ ] **Step 1: SidebarFavorites 구현**

```tsx
// src/components/layout/SidebarFavorites.tsx
import { Link } from "react-router-dom";
import { FileText, KanbanSquare, Pin } from "lucide-react";
import { useFavoritePages } from "@/hooks/useFavoritePages";
import type { Page } from "@/types/page";

function href(p: Page): string {
  return p.properties.type === "project"
    ? `/projects/${p._id}`
    : `/meetings/${p._id}`;
}

export function SidebarFavorites() {
  const favs = useFavoritePages(10);
  if (!favs.data || favs.data.length === 0) return null;

  return (
    <section className="px-2 py-2 border-t border-line">
      <h3 className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-ink flex items-center gap-1">
        <Pin className="w-3 h-3" />
        즐겨찾기
      </h3>
      <ul className="space-y-0.5">
        {favs.data.map((p) => {
          const Icon = p.properties.type === "project" ? KanbanSquare : FileText;
          return (
            <li key={p._id}>
              <Link
                to={href(p)}
                className="flex items-center gap-2 px-3 py-1 rounded-md text-xs text-ink hover:bg-page"
              >
                <Icon className="w-3.5 h-3.5 text-muted-ink shrink-0" />
                <span className="line-clamp-1">{p.title || "제목 없음"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: SidebarRecent 구현**

```tsx
// src/components/layout/SidebarRecent.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronDown, FileText, KanbanSquare, FolderClock } from "lucide-react";
import { useRecentPages } from "@/hooks/useRecentPages";
import { cn } from "@/lib/cn";
import type { Page } from "@/types/page";

function href(p: Page): string {
  return p.properties.type === "project"
    ? `/projects/${p._id}`
    : `/meetings/${p._id}`;
}

export function SidebarRecent() {
  const [expanded, setExpanded] = useState(true);
  const recent = useRecentPages(5);
  if (!recent.data || recent.data.length === 0) return null;

  return (
    <section className="px-2 py-2 border-t border-line">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-1 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-ink hover:text-ink"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <FolderClock className="w-3 h-3" />
        최근 항목
      </button>
      <ul className={cn("space-y-0.5", !expanded && "hidden")}>
        {recent.data.map((p) => {
          const Icon = p.properties.type === "project" ? KanbanSquare : FileText;
          return (
            <li key={p._id}>
              <Link
                to={href(p)}
                className="flex items-center gap-2 px-3 py-1 rounded-md text-xs text-ink hover:bg-page"
              >
                <Icon className="w-3.5 h-3.5 text-muted-ink shrink-0" />
                <span className="line-clamp-1">{p.title || "제목 없음"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Sidebar 통합**

`src/components/layout/Sidebar.tsx` 의 `<nav>` 와 하단 fixed 영역 사이에 두 섹션 추가, collapsed 일 때 숨김:

```tsx
// src/components/layout/Sidebar.tsx
import { NavLink } from "react-router-dom";
import { Home, FileText, KanbanSquare, Settings, Search } from "lucide-react";
import { useSidebarStore } from "@/store/sidebarStore";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { SidebarFavorites } from "./SidebarFavorites";
import { SidebarRecent } from "./SidebarRecent";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/", label: "홈", icon: Home },
  { to: "/meetings", label: "회의록", icon: FileText },
  { to: "/projects", label: "프로젝트", icon: KanbanSquare },
];

export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const openPalette = useCommandPaletteStore((s) => s.setOpen);

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col border-r border-line bg-card transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center justify-between px-4 h-14 border-b border-line">
        {!collapsed && (
          <span className="font-bold text-brand">Newtion</span>
        )}
        <button
          type="button"
          onClick={() => openPalette(true)}
          className="text-xs text-muted-ink hover:text-ink"
          aria-label="검색 열기"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      <nav className="px-2 py-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-ink hover:bg-page",
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {!collapsed && (
          <>
            <SidebarFavorites />
            <SidebarRecent />
          </>
        )}
      </div>

      <div className="border-t border-line p-2">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink hover:bg-page"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>설정</span>}
        </NavLink>
        <button
          type="button"
          onClick={toggle}
          className="w-full text-left text-xs text-muted-ink px-3 py-2 hover:text-ink"
        >
          {collapsed ? "▶" : "◀ 접기"}
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: 풀스위트 + 수동 검증**

Run: `npx vitest run`
Expected: PASS.

```bash
npm run dev
```
- 사이드바에 "즐겨찾기" / "최근 항목" 헤더 보임
- 페이지를 핀 → 사이드바 즐겨찾기에 즉시 추가
- 사이드바 접기 → 두 섹션 숨김 + 메인 NAV 만 노출
- 최근 항목 토글 → 펼침/접힘 동작

- [ ] **Step 5: 커밋**

```bash
git add src/components/layout/SidebarFavorites.tsx src/components/layout/SidebarRecent.tsx \
        src/components/layout/Sidebar.tsx
git commit -m "feat(layout): sidebar favorites + recent sections"
```

---

## Wrap-up

**완료 기준:**
- 모든 task PASS
- `npx vitest run` 풀스위트 PASS
- `npm run build` PASS
- 수동 sanity:
  - 홈 `/` → Bento 5종 카드 표시, 호버 인터랙션 정상
  - 사이드바: 핀 항목이 "즐겨찾기" 섹션에 즉시 반영, "최근 항목" 토글
  - 칸반 카드 hover → PinToggle 노출, 클릭 → 즉시 핀 토글 (홈/사이드바 동기화)
  - 프로젝트 모달 → ProjectMetaBar 의 진행률/태그/마감일 클릭 → 인라인 편집 → blur 시 저장
  - 회의록 상세 헤더 → PinToggle 동작

**Plan 6 으로 넘어가기 전 체크:**
- 페이지 properties 의 모든 편집 affordance 가 deep-merge 안전 (다른 properties 손실 없음)
- 사이드바 / 홈 / 칸반 / 모달이 같은 캐시를 공유 — 한 곳에서 편집 시 다른 모든 곳이 갱신됨
- BentoCard 의 액센트 컬러 토큰 (`bg-tag-violet` / `bg-tag-sky`) 이 tailwind config 에 정의되어 있음

---

## 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-04-29 | 초안 작성 (Plan 5 — 홈 Bento + 사이드바 즐겨찾기/최근 + 칸반 메타 편집, 17 tasks) |
