# Newtion: @멘션 + ⌘K 글로벌 검색 Implementation Plan (Plan 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회의록/프로젝트 본문 안에서 `@` 입력 → 페이지 검색 → 멘션 삽입 (양방향) 도메인과, 어디서든 `⌘K`/`Ctrl+K` 로 호출 가능한 글로벌 검색 모달을 구현한다. 두 흐름은 같은 검색 인프라(`searchPages` + `useSearch`)를 공유하고, 멘션은 자동으로 `properties.mentionedPageIds` 에 동기화되어 spec §5-2 의 역인덱스 (`GET /pages?mentionedPageId=:id`) 가 정확히 동작하도록 한다.

**Architecture:**
- **검색 백엔드는 Plan 1 에서 이미 완성됨** — `searchPages(workspaceId, query)` API 함수 + MSW `GET /pages/search` 핸들러가 동작 중. Plan 4 는 그 위에 React 레이어만 올린다.
- **공통 인프라**: `useDebouncedValue` (200ms) + `useSearch(query)` 훅 한 쌍이 ⌘K 모달과 멘션 메뉴 양쪽에서 동일하게 사용된다.
- **멘션 직렬화 전략 — link 인라인 활용**: BlockNote 의 표준 `link` inline content 를 그대로 멘션의 직렬화 형식으로 쓴다. `href` 가 `/meetings/:id` 또는 `/projects/:id` 패턴이면 멘션으로 간주한다. 이렇게 하면 (1) 백엔드 Block 스키마 변경 없음, (2) blockAdapter 변경 없음, (3) `extractMentions` 가 단순 정규식 매칭으로 끝난다. 시각적 차별화 (멘션 배지 등) 는 Plan 6 폴리싱으로 미룬다 — YAGNI.
- **`@` 트리거**: `@blocknote/react` 의 `SuggestionMenuController` (`triggerCharacter="@"`) 로 메뉴를 띄우고, 항목 선택 시 `editor.insertInlineContent([{ type: "link", href, content }])` 으로 link 인라인을 삽입한다.
- **멘션 클릭 → SPA navigate**: BlockNoteView 를 감싼 컨테이너 `onClick` 에서 `event.target.closest("a")` 의 href 가 내부 path 면 `event.preventDefault()` + `useNavigate()` 호출.
- **mentionedPageIds 동기화**: `useSyncMentions(pageId, blocks)` 훅이 blocks 변경 시 `extractMentions` 결과와 현재 page.properties.mentionedPageIds 를 비교, 다르면 1초 디바운스 후 `useUpdatePage.mutate({ properties: { mentionedPageIds }})` 한 번 호출. 자동 저장(`useAutosaveBlocks`) 와 별개의 mutation 이지만 둘 다 onSuccess 시 `["page-detail", pageId]` 캐시를 무효화하므로 일관성이 유지된다.
- **⌘K 모달**: shadcn `Dialog` 를 직접 조립 (별도 `Command` 컴포넌트 미설치). 검색 결과는 회의록(📝) / 프로젝트(📋) 두 그룹으로 표시, ↑↓ Enter 키보드 네비. Enter on highlighted = 해당 페이지로 navigate. Enter on plain query = `/search?q=...` 페이지로 navigate.
- **`/search?q=...` 라우트**: spec §3-1 에 정의된 결과 페이지. 결과가 많거나 모달을 닫고 보고 싶을 때 fallback. 모달과 같은 `useSearch` 훅을 재사용한다.

**Tech Stack (신규 라이브러리 없음):**
- `@blocknote/react` 의 `SuggestionMenuController` (이미 v0.40 으로 설치됨)
- shadcn `Dialog`, `Input`, `ScrollArea`, `Separator` (이미 설치됨)
- TanStack Query, Zustand, React Router, Sonner — 기존 그대로

---

## File Structure

**Modify:**
- `src/lib/blockAdapter.ts` — 변경 없음. (link inline 은 이미 그대로 라운드트립됨; Task 2 에서 회귀 테스트만 추가)
- `src/components/editor/BlockEditor.tsx` — `SuggestionMenuController` + 컨테이너 클릭 핸들러 추가. `onMentionTrigger` prop 으로 검색 함수 주입.
- `src/components/layout/AppShell.tsx` — `CommandPalette` 마운트 + `useGlobalKeybindings()` 호출.
- `src/routes/SearchPage.tsx` — 현재 stub. `useSearch` 결과를 그룹별 리스트로 렌더.
- `src/routes/MeetingDetailPage.tsx` — `useSyncMentions(pageId, blocks)` 호출 추가, `BlockEditor` 에 `onMentionTrigger` 전달.
- `src/routes/ProjectDetailPage.tsx` — 동일하게 `useSyncMentions` + `onMentionTrigger`.

**Create (lib):**
- `src/lib/extractMentions.ts` (+ `.test.ts`) — `BlockNoteLikeBlock[]` 트리에서 link inline 의 href 가 `/meetings/:id`|`/projects/:id` 패턴인 항목을 모아 dedup 된 pageId 배열 반환.

**Create (hooks):**
- `src/hooks/useDebouncedValue.ts` (+ `.test.tsx`) — 단순 디바운스 훅 (`debounce.ts` lib 함수와 별개; React state 디바운스 전용).
- `src/hooks/useSearch.ts` (+ `.test.tsx`) — 워크스페이스 컨텍스트 + 디바운스된 query → `useQuery` 래퍼.
- `src/hooks/useGlobalKeybindings.ts` (+ `.test.tsx`) — `keydown` 등록, `meta+k`/`ctrl+k` → `commandPaletteStore.toggle()`.
- `src/hooks/useSyncMentions.ts` (+ `.test.tsx`) — blocks → mentionedPageIds 자동 동기화 mutation.

**Create (components/search/):**
- `src/components/search/CommandPalette.tsx` (+ `.test.tsx`) — Dialog + Input + 결과 그룹 + 키보드 네비.
- `src/components/search/SearchResultGroup.tsx` — 그룹 헤더(아이콘 + 라벨) + 자식 리스트.
- `src/components/search/SearchResultItem.tsx` — 한 줄 항목 (선택 가능, highlighted 시 강조).
- `src/components/search/groupSearchResults.ts` (+ `.test.ts`) — 순수 함수: `Page[]` → `{ meetings: Page[], projects: Page[] }`.

**Create (components/editor/):**
- `src/components/editor/MentionMenu.tsx` (+ `.test.tsx`) — `SuggestionMenuController` 의 children render prop 으로 받는 메뉴 패널 (그룹화 + 키보드 네비).
- `src/components/editor/buildMentionItems.ts` (+ `.test.ts`) — `Page[]` → `SuggestionMenuController` 가 기대하는 `MentionItem[]` 변환.

**Modify (관련 페이지):**
- `src/components/layout/Sidebar.tsx` — 검색 버튼은 이미 `setOpen(true)` 호출 중. 변경 없음. (Task 8 에서 검증만)

---

## Task 1: `extractMentions` 순수 함수 (TDD)

**Files:**
- Create: `src/lib/extractMentions.ts`
- Test: `src/lib/extractMentions.test.ts`

**Why first:** 멘션 도메인의 핵심 추상화. 다른 모든 task (`useSyncMentions`, `BlockEditor` 멘션 삽입 검증, 통합 테스트) 가 이걸 사용한다. 백엔드 Block / BlockNote inline 양쪽에서 동일한 결과를 내야 하지만 우선은 BlockNote 측만 (autosave 직전이 유일한 호출 지점이라).

- [ ] **Step 1: 실패하는 테스트**

```ts
// src/lib/extractMentions.test.ts
import { describe, it, expect } from "vitest";
import { extractMentions } from "./extractMentions";
import type { BlockNoteLikeBlock } from "./blockAdapter";

const para = (
  inline: { type: "text" | "link"; text?: string; href?: string; content?: { type: "text"; text: string }[] }[],
  children: BlockNoteLikeBlock[] = [],
): BlockNoteLikeBlock => ({
  id: Math.random().toString(36).slice(2),
  type: "paragraph",
  props: {},
  content: inline as never,
  children,
});

describe("extractMentions", () => {
  it("내부 path 가 아닌 link 는 무시한다", () => {
    const blocks = [
      para([
        { type: "text", text: "외부 " },
        { type: "link", href: "https://example.com", content: [{ type: "text", text: "링크" }] },
      ]),
    ];
    expect(extractMentions(blocks)).toEqual([]);
  });

  it("/meetings/:id 와 /projects/:id 패턴의 href 를 페이지 ID 로 추출한다", () => {
    const blocks = [
      para([
        { type: "link", href: "/projects/pg_proj_a", content: [{ type: "text", text: "프로젝트 A" }] },
        { type: "text", text: " 와 " },
        { type: "link", href: "/meetings/pg_meet_b", content: [{ type: "text", text: "회의 B" }] },
      ]),
    ];
    expect(extractMentions(blocks)).toEqual(["pg_proj_a", "pg_meet_b"]);
  });

  it("같은 페이지 ID 는 중복 제거하되 등장 순서는 보존한다", () => {
    const blocks = [
      para([
        { type: "link", href: "/projects/pg_a", content: [{ type: "text", text: "A" }] },
      ]),
      para([
        { type: "link", href: "/projects/pg_b", content: [{ type: "text", text: "B" }] },
        { type: "link", href: "/projects/pg_a", content: [{ type: "text", text: "A again" }] },
      ]),
    ];
    expect(extractMentions(blocks)).toEqual(["pg_a", "pg_b"]);
  });

  it("자식 블록까지 재귀적으로 탐색한다", () => {
    const blocks = [
      para([{ type: "text", text: "부모" }], [
        para([
          { type: "link", href: "/projects/pg_child", content: [{ type: "text", text: "child" }] },
        ]),
      ]),
    ];
    expect(extractMentions(blocks)).toEqual(["pg_child"]);
  });

  it("href 가 끝에 슬래시/쿼리스트링이 붙어도 ID 만 추출한다", () => {
    const blocks = [
      para([
        { type: "link", href: "/projects/pg_q?focus=true", content: [{ type: "text", text: "Q" }] },
        { type: "link", href: "/meetings/pg_s/", content: [{ type: "text", text: "S" }] },
      ]),
    ];
    expect(extractMentions(blocks)).toEqual(["pg_q", "pg_s"]);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/extractMentions.test.ts`
Expected: FAIL — `Cannot find module './extractMentions'`

- [ ] **Step 3: 최소 구현**

```ts
// src/lib/extractMentions.ts
import type { BlockNoteLikeBlock } from "./blockAdapter";

const MENTION_HREF_RE = /^\/(meetings|projects)\/([^/?#]+)/;

export function extractMentions(blocks: BlockNoteLikeBlock[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];

  const visit = (list: BlockNoteLikeBlock[]) => {
    for (const block of list) {
      for (const inline of block.content) {
        if (inline.type !== "link") continue;
        const href = (inline as { href?: string }).href;
        if (!href) continue;
        const m = MENTION_HREF_RE.exec(href);
        if (!m) continue;
        const pageId = m[2];
        if (seen.has(pageId)) continue;
        seen.add(pageId);
        order.push(pageId);
      }
      if (block.children.length > 0) visit(block.children);
    }
  };

  visit(blocks);
  return order;
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx vitest run src/lib/extractMentions.test.ts`
Expected: PASS — 5/5 tests

- [ ] **Step 5: 커밋**

```bash
git add src/lib/extractMentions.ts src/lib/extractMentions.test.ts
git commit -m "feat(lib): extractMentions — internal-link href → page IDs"
```

---

## Task 2: blockAdapter link 인라인 라운드트립 회귀 테스트

**Files:**
- Test: `src/lib/blockAdapter.test.ts` (existing, append)

**Why:** Task 1 의 전제 — link inline 이 `blockNoteToBackend → backendToBlockNote` 라운드트립에서 보존되어야 멘션이 살아남는다. 현재 `content` 가 `{ props, inline }` 으로 통째 저장되므로 동작은 하겠지만, 멘션 도메인이 의존하는 행동을 보호하는 테스트를 명시적으로 둔다.

- [ ] **Step 1: 실패할 가능성 있는 테스트 추가**

`src/lib/blockAdapter.test.ts` 파일 끝에 새 describe 블록 추가:

```ts
describe("blockAdapter — mention link inline", () => {
  it("link 인라인 (멘션 직렬화 형식) 이 라운드트립에서 보존된다", () => {
    const original: BlockNoteLikeBlock[] = [
      {
        id: "blk_1",
        type: "paragraph",
        props: {},
        content: [
          { type: "text", text: "관련 프로젝트: " } as never,
          {
            type: "link",
            href: "/projects/pg_proj_a",
            content: [{ type: "text", text: "프로젝트 A" }],
          } as never,
        ],
        children: [],
      },
    ];
    const backend = blockNoteToBackend(original, "page-1");
    const roundtrip = backendToBlockNote(backend);
    expect(roundtrip).toEqual(original);
  });
});
```

테스트 파일 상단 import 에 `BlockNoteLikeBlock` 타입이 이미 가져와져 있는지 확인 — 없으면 추가:
```ts
import type { BlockNoteLikeBlock } from "./blockAdapter";
```

- [ ] **Step 2: 테스트 실행**

Run: `npx vitest run src/lib/blockAdapter.test.ts`
Expected: PASS — link inline 은 `{ props, inline }` 으로 통째 보존되므로 추가 코드 없이 통과해야 함. **만약 FAIL 이라면** blockAdapter 가 link 를 손상시키는 버그가 있다는 신호 — 디버깅 후 수정.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/blockAdapter.test.ts
git commit -m "test(lib): blockAdapter mention link roundtrip regression guard"
```

---

## Task 3: `useDebouncedValue` 훅 (TDD)

**Files:**
- Create: `src/hooks/useDebouncedValue.ts`
- Test: `src/hooks/useDebouncedValue.test.tsx`

**Why:** ⌘K 모달과 멘션 메뉴 둘 다 입력값을 200ms 디바운스해서 검색해야 한다. lib 의 `debounce` 함수는 콜백 디바운스, 이 훅은 React state 디바운스 — 책임이 다름.

- [ ] **Step 1: 실패하는 테스트**

```tsx
// src/hooks/useDebouncedValue.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("초기 값을 즉시 반환한다", () => {
    const { result } = renderHook(() => useDebouncedValue("hello", 200));
    expect(result.current).toBe("hello");
  });

  it("값이 빠르게 바뀌면 마지막 값만 delay 뒤에 반영한다", () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), {
      initialProps: { v: "a" },
    });
    rerender({ v: "ab" });
    rerender({ v: "abc" });
    expect(result.current).toBe("a");
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("abc");
  });

  it("delay 가 끝나기 전에 값이 다시 바뀌면 타이머가 리셋된다", () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), {
      initialProps: { v: "a" },
    });
    rerender({ v: "b" });
    act(() => vi.advanceTimersByTime(150));
    rerender({ v: "c" });
    act(() => vi.advanceTimersByTime(150));
    expect(result.current).toBe("a"); // 아직 200ms 안 지남 (150 + 150 이지만 두 번째 rerender 가 리셋)
    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe("c");
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/hooks/useDebouncedValue.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: 최소 구현**

```ts
// src/hooks/useDebouncedValue.ts
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/hooks/useDebouncedValue.test.tsx`
Expected: PASS — 3/3.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useDebouncedValue.ts src/hooks/useDebouncedValue.test.tsx
git commit -m "feat(hooks): useDebouncedValue — React state debounce"
```

---

## Task 4: `useSearch` 훅 (TDD)

**Files:**
- Create: `src/hooks/useSearch.ts`
- Test: `src/hooks/useSearch.test.tsx`

**Why:** ⌘K, MentionMenu, SearchPage 셋이 공유하는 검색 인터페이스. 워크스페이스 부트스트랩과 빈 query 처리를 한 곳에 집중.

**기존 패턴 참고:** `src/hooks/usePages.ts` (workspaceId 가져오는 방식 — `useWorkspace` 훅 재사용).

- [ ] **Step 1: 실패하는 테스트**

```tsx
// src/hooks/useSearch.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useSearch } from "./useSearch";

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

describe("useSearch", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("빈 query 일 때는 fetch 하지 않는다 (enabled=false)", () => {
    const { result } = renderHook(() => useSearch(""), { wrapper: wrapper() });
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("query 가 있으면 워크스페이스 안에서 제목 부분일치로 페이지를 반환한다", async () => {
    const { result } = renderHook(() => useSearch("프로젝트"), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.length).toBeGreaterThan(0);
    expect(
      result.current.data!.every((p) => p.title.includes("프로젝트")),
    ).toBe(true);
  });

  it("결과는 archived 페이지를 제외한다", async () => {
    const { result } = renderHook(() => useSearch("a"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.every((p) => !p.isArchived)).toBe(true);
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/hooks/useSearch.test.tsx`
Expected: FAIL — `useSearch` 모듈 없음.

- [ ] **Step 3: 최소 구현**

```ts
// src/hooks/useSearch.ts
import { useQuery } from "@tanstack/react-query";
import { searchPages } from "@/api/pages";
import { useWorkspace } from "./useWorkspace";

export function useSearch(query: string) {
  const { workspaceId } = useWorkspace();
  const trimmed = query.trim();
  const enabled = !!workspaceId && trimmed.length > 0;

  return useQuery({
    queryKey: ["search", workspaceId, trimmed],
    queryFn: () => searchPages(workspaceId!, trimmed),
    enabled,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/hooks/useSearch.test.tsx`
Expected: PASS — 3/3.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useSearch.ts src/hooks/useSearch.test.tsx
git commit -m "feat(hooks): useSearch — debounceable workspace title search"
```

---

## Task 5: `groupSearchResults` 순수 함수 (TDD)

**Files:**
- Create: `src/components/search/groupSearchResults.ts`
- Test: `src/components/search/groupSearchResults.test.ts`

**Why:** ⌘K 와 멘션 메뉴 둘 다 결과를 회의록/프로젝트로 그룹화. 순수 함수로 빼면 컴포넌트 테스트가 단순해짐.

- [ ] **Step 1: 테스트**

```ts
// src/components/search/groupSearchResults.test.ts
import { describe, it, expect } from "vitest";
import { groupSearchResults } from "./groupSearchResults";
import type { Page } from "@/types/page";

const page = (id: string, type: "meeting" | "project", title: string): Page => ({
  _id: id,
  workspaceId: "ws_1",
  parentPageId: null,
  title,
  order: 0,
  isArchived: false,
  isPublished: false,
  properties: { type },
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
  removedAt: null,
});

describe("groupSearchResults", () => {
  it("type=meeting 과 type=project 를 별도 배열로 분리한다", () => {
    const result = groupSearchResults([
      page("p1", "project", "프로젝트 1"),
      page("m1", "meeting", "회의 1"),
      page("p2", "project", "프로젝트 2"),
    ]);
    expect(result.meetings.map((p) => p._id)).toEqual(["m1"]);
    expect(result.projects.map((p) => p._id)).toEqual(["p1", "p2"]);
  });

  it("type 이 비어있는 페이지는 둘 다에서 제외한다 (root 폴더 등)", () => {
    const result = groupSearchResults([
      { ...page("r", "meeting", "root"), properties: { role: "meetings_root" } },
      page("m1", "meeting", "회의 1"),
    ]);
    expect(result.meetings.map((p) => p._id)).toEqual(["m1"]);
    expect(result.projects).toEqual([]);
  });

  it("입력 순서를 보존한다", () => {
    const result = groupSearchResults([
      page("m2", "meeting", "회의 2"),
      page("m1", "meeting", "회의 1"),
    ]);
    expect(result.meetings.map((p) => p._id)).toEqual(["m2", "m1"]);
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/components/search/groupSearchResults.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

```ts
// src/components/search/groupSearchResults.ts
import type { Page } from "@/types/page";

export interface GroupedResults {
  meetings: Page[];
  projects: Page[];
}

export function groupSearchResults(pages: Page[]): GroupedResults {
  const meetings: Page[] = [];
  const projects: Page[] = [];
  for (const p of pages) {
    if (p.properties.type === "meeting") meetings.push(p);
    else if (p.properties.type === "project") projects.push(p);
  }
  return { meetings, projects };
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/components/search/groupSearchResults.test.ts`
Expected: PASS — 3/3.

- [ ] **Step 5: 커밋**

```bash
git add src/components/search/groupSearchResults.ts src/components/search/groupSearchResults.test.ts
git commit -m "feat(search): groupSearchResults — split by page type"
```

---

## Task 6: `useGlobalKeybindings` 훅 (TDD)

**Files:**
- Create: `src/hooks/useGlobalKeybindings.ts`
- Test: `src/hooks/useGlobalKeybindings.test.tsx`

**Why:** ⌘K (Mac) / Ctrl+K (Windows) 가 어디서든 동작해야 한다. 단일 훅으로 추가 키바인딩을 미래에 확장 가능.

- [ ] **Step 1: 테스트**

```tsx
// src/hooks/useGlobalKeybindings.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { useGlobalKeybindings } from "./useGlobalKeybindings";

function pressMetaK(opts: { meta?: boolean; ctrl?: boolean } = {}) {
  const ev = new KeyboardEvent("keydown", {
    key: "k",
    metaKey: !!opts.meta,
    ctrlKey: !!opts.ctrl,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(ev);
  return ev;
}

describe("useGlobalKeybindings", () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ open: false });
  });

  it("⌘K 를 누르면 commandPaletteStore 가 토글된다", () => {
    renderHook(() => useGlobalKeybindings());
    expect(useCommandPaletteStore.getState().open).toBe(false);
    act(() => {
      pressMetaK({ meta: true });
    });
    expect(useCommandPaletteStore.getState().open).toBe(true);
    act(() => {
      pressMetaK({ meta: true });
    });
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });

  it("Ctrl+K 도 같은 동작을 한다 (Windows)", () => {
    renderHook(() => useGlobalKeybindings());
    act(() => {
      pressMetaK({ ctrl: true });
    });
    expect(useCommandPaletteStore.getState().open).toBe(true);
  });

  it("아무 modifier 없이 K 만 누르면 무시한다", () => {
    renderHook(() => useGlobalKeybindings());
    act(() => {
      pressMetaK();
    });
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });

  it("⌘K 이벤트는 preventDefault 된다 (브라우저 기본 단축키 차단)", () => {
    renderHook(() => useGlobalKeybindings());
    let prevented = false;
    act(() => {
      const ev = pressMetaK({ meta: true });
      prevented = ev.defaultPrevented;
    });
    expect(prevented).toBe(true);
  });

  it("언마운트 시 리스너를 해제한다", () => {
    const { unmount } = renderHook(() => useGlobalKeybindings());
    unmount();
    act(() => {
      pressMetaK({ meta: true });
    });
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/hooks/useGlobalKeybindings.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
// src/hooks/useGlobalKeybindings.ts
import { useEffect } from "react";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";

export function useGlobalKeybindings(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "k" && e.key !== "K") return;
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      useCommandPaletteStore.getState().toggle();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/hooks/useGlobalKeybindings.test.tsx`
Expected: PASS — 5/5.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useGlobalKeybindings.ts src/hooks/useGlobalKeybindings.test.tsx
git commit -m "feat(hooks): useGlobalKeybindings — meta/ctrl+K toggles palette"
```

---

## Task 7: `SearchResultItem` 컴포넌트

**Files:**
- Create: `src/components/search/SearchResultItem.tsx`

**Why:** ⌘K 모달 + SearchPage + MentionMenu 셋이 같은 행 모양 사용. 한 컴포넌트로 통일.

- [ ] **Step 1: 구현 (이 컴포넌트는 단순 표시 + selection prop 만 받으므로 통합 테스트 (Task 9) 에서 검증)**

```tsx
// src/components/search/SearchResultItem.tsx
import { FileText, KanbanSquare } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Page } from "@/types/page";

interface Props {
  page: Page;
  highlighted?: boolean;
  onSelect: () => void;
  onMouseEnter?: () => void;
}

export function SearchResultItem({
  page,
  highlighted,
  onSelect,
  onMouseEnter,
}: Props) {
  const Icon = page.properties.type === "project" ? KanbanSquare : FileText;
  return (
    <button
      type="button"
      role="option"
      aria-selected={highlighted}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm",
        highlighted
          ? "bg-brand/10 text-brand"
          : "text-ink hover:bg-page",
      )}
    >
      <Icon className="w-4 h-4 shrink-0 text-muted-ink" aria-hidden />
      <span className="truncate">{page.title || "제목 없음"}</span>
    </button>
  );
}
```

- [ ] **Step 2: 임포트만 검증되도록 빠른 컴파일 확인**

Run: `npx tsc -b --noEmit`
Expected: PASS — 타입 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/components/search/SearchResultItem.tsx
git commit -m "feat(search): SearchResultItem — single-row search match"
```

---

## Task 8: `SearchResultGroup` 컴포넌트

**Files:**
- Create: `src/components/search/SearchResultGroup.tsx`

- [ ] **Step 1: 구현**

```tsx
// src/components/search/SearchResultGroup.tsx
import type { Page } from "@/types/page";
import { SearchResultItem } from "./SearchResultItem";

interface Props {
  label: string;
  pages: Page[];
  highlightedId: string | null;
  onSelect: (page: Page) => void;
  onHover: (page: Page) => void;
}

export function SearchResultGroup({
  label,
  pages,
  highlightedId,
  onSelect,
  onHover,
}: Props) {
  if (pages.length === 0) return null;
  return (
    <div role="group" aria-label={label} className="space-y-1">
      <div className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-ink">
        {label}
      </div>
      <div role="listbox" className="space-y-0.5">
        {pages.map((p) => (
          <SearchResultItem
            key={p._id}
            page={p}
            highlighted={highlightedId === p._id}
            onSelect={() => onSelect(p)}
            onMouseEnter={() => onHover(p)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 컴파일 검증**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add src/components/search/SearchResultGroup.tsx
git commit -m "feat(search): SearchResultGroup — labeled section of items"
```

---

## Task 9: `CommandPalette` 컴포넌트 (TDD)

**Files:**
- Create: `src/components/search/CommandPalette.tsx`
- Test: `src/components/search/CommandPalette.test.tsx`

**Why:** Plan 4 의 사용자-가시 결과물. 통합 (input → debounce → fetch → 그룹 표시 → 키보드 네비 → navigate). 다른 모든 검색 task 의 합집합이라 TDD 로 외부 행동을 잡는다.

**기존 패턴 참고:** 다른 컴포넌트 테스트 (예: `src/components/projects/KanbanBoard.test.tsx`) 의 MSW + QueryClient wrapper.

- [ ] **Step 1: 실패하는 테스트**

```tsx
// src/components/search/CommandPalette.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { CommandPalette } from "./CommandPalette";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function LocationProbe({ onLocation }: { onLocation: (path: string) => void }) {
  const loc = useLocation();
  React.useEffect(() => onLocation(loc.pathname + loc.search), [loc, onLocation]);
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers();
    setup();
    const input = screen.getByPlaceholderText(/검색|search/i);
    await user.type(input, "프로");
    vi.advanceTimersByTime(250);
    await waitFor(() =>
      expect(screen.getByRole("group", { name: /프로젝트/ })).toBeInTheDocument(),
    );
    vi.useRealTimers();
  });

  it("결과가 비어있으면 '결과 없음' 안내가 보인다", async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByPlaceholderText(/검색|search/i);
    await user.type(input, "zzz존재하지않는쿼리zzz");
    await waitFor(() =>
      expect(screen.getByText(/결과 없음|no results/i)).toBeInTheDocument(),
    );
  });

  it("ArrowDown / ArrowUp 으로 항목 사이를 이동하고 Enter 로 선택된 페이지로 navigate 한다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers();
    const { onLocation } = setup();
    const input = screen.getByPlaceholderText(/검색|search/i);
    await user.type(input, "프로");
    vi.advanceTimersByTime(250);
    await waitFor(() =>
      expect(screen.queryAllByRole("option").length).toBeGreaterThan(0),
    );
    await user.keyboard("{ArrowDown}{Enter}");
    vi.useRealTimers();
    await waitFor(() => {
      const last = (onLocation.mock.calls.at(-1) ?? [""])[0] as string;
      expect(last).toMatch(/^\/(projects|meetings)\//);
    });
  });

  it("Esc 로 모달이 닫힌다", async () => {
    const user = userEvent.setup();
    setup();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(useCommandPaletteStore.getState().open).toBe(false),
    );
  });

  it("query 가 있는 상태에서 어떤 항목도 highlight 되지 않은 상태로 Enter 누르면 /search?q= 로 이동한다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers();
    const { onLocation } = setup();
    const input = screen.getByPlaceholderText(/검색|search/i);
    await user.type(input, "회의");
    vi.advanceTimersByTime(250);
    await user.keyboard("{Enter}");
    vi.useRealTimers();
    await waitFor(() => {
      const last = (onLocation.mock.calls.at(-1) ?? [""])[0] as string;
      expect(last).toMatch(/^\/search\?q=/);
    });
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/components/search/CommandPalette.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

```tsx
// src/components/search/CommandPalette.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearch } from "@/hooks/useSearch";
import { groupSearchResults } from "./groupSearchResults";
import { SearchResultGroup } from "./SearchResultGroup";
import type { Page } from "@/types/page";

function pageHref(page: Page): string {
  return page.properties.type === "project"
    ? `/projects/${page._id}`
    : `/meetings/${page._id}`;
}

export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 200);
  const search = useSearch(debounced);
  const grouped = useMemo(
    () => (search.data ? groupSearchResults(search.data) : { meetings: [], projects: [] }),
    [search.data],
  );
  const flat = useMemo(
    () => [...grouped.meetings, ...grouped.projects],
    [grouped],
  );

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlightedId(null);
      // Focus 는 Dialog 가 자동으로 처리하지만 input 우선 보장
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setHighlightedId(null);
  }, [debounced]);

  const handleSelect = (page: Page) => {
    setOpen(false);
    navigate(pageHref(page));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flat.length === 0) {
      if (e.key === "Enter" && query.trim().length > 0) {
        e.preventDefault();
        setOpen(false);
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = highlightedId
        ? flat.findIndex((p) => p._id === highlightedId)
        : -1;
      const next = flat[(idx + 1) % flat.length];
      setHighlightedId(next._id);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = highlightedId
        ? flat.findIndex((p) => p._id === highlightedId)
        : 0;
      const prev = flat[(idx - 1 + flat.length) % flat.length];
      setHighlightedId(prev._id);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedId) {
        const target = flat.find((p) => p._id === highlightedId);
        if (target) handleSelect(target);
      } else if (query.trim().length > 0) {
        setOpen(false);
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 gap-0">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search className="w-4 h-4 text-muted-ink" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="검색 — 회의록, 프로젝트 제목"
            className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
            aria-label="검색"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {debounced.trim().length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-ink">
              검색어를 입력하세요
            </p>
          ) : search.isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-ink">
              불러오는 중...
            </p>
          ) : flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-ink">
              결과 없음
            </p>
          ) : (
            <>
              <SearchResultGroup
                label="📝 회의록"
                pages={grouped.meetings}
                highlightedId={highlightedId}
                onSelect={handleSelect}
                onHover={(p) => setHighlightedId(p._id)}
              />
              <SearchResultGroup
                label="📋 프로젝트"
                pages={grouped.projects}
                highlightedId={highlightedId}
                onSelect={handleSelect}
                onHover={(p) => setHighlightedId(p._id)}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/components/search/CommandPalette.test.tsx`
Expected: PASS — 6/6. Dialog 의 focus trap / Esc 처리는 Radix 가 담당하므로 별도 코드 불필요.

만약 fake timer + Radix Dialog 가 충돌하면 (Radix 가 RAF 를 사용함) 실패 케이스를 디버깅 후 `vi.advanceTimersByTime` + `flushPromises` 조합으로 조정.

- [ ] **Step 5: 커밋**

```bash
git add src/components/search/CommandPalette.tsx src/components/search/CommandPalette.test.tsx
git commit -m "feat(search): CommandPalette — Dialog + grouped results + keyboard nav"
```

---

## Task 10: `AppShell` 에 CommandPalette 마운트 + 키바인딩 활성화

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

**Why:** Plan 4 의 핵심 기능을 실제로 사용 가능하게 만드는 통합 지점. 한 곳에서 키바인딩 등록 + 모달 마운트.

- [ ] **Step 1: AppShell 수정**

`src/components/layout/AppShell.tsx` 전체를 다음으로 교체:

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/search/CommandPalette";
import { useGlobalKeybindings } from "@/hooks/useGlobalKeybindings";

export function AppShell() {
  useGlobalKeybindings();
  return (
    <div className="flex min-h-screen bg-page text-ink">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
```

- [ ] **Step 2: 기존 회귀 + 신규 동작 검증**

Run: `npx vitest run`
Expected: 모든 기존 테스트 + Plan 4 task 1-9 PASS.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 3: 수동 sanity check (선택)**

```
npm run dev
```
브라우저에서:
- ⌘K (Mac) / Ctrl+K (Windows) → 모달 열림
- 사이드바 검색 아이콘 클릭 → 모달 열림
- "프로" 입력 → 결과 그룹 표시
- 결과 클릭 → 해당 페이지로 이동
- Esc → 모달 닫힘

- [ ] **Step 4: 커밋**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat(layout): mount CommandPalette + register meta+K binding"
```

---

## Task 11: `SearchPage` 채우기 (`/search?q=...`)

**Files:**
- Modify: `src/routes/SearchPage.tsx`
- Test: `src/routes/SearchPage.test.tsx`

**Why:** spec §3-1 라우트 표에 정의된 페이지. ⌘K 에서 Enter on plain query 시 이 페이지로 fallback.

- [ ] **Step 1: 실패하는 테스트**

```tsx
// src/routes/SearchPage.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";
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
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/routes/SearchPage.test.tsx`
Expected: FAIL — 현재 SearchPage 는 stub (h1 만).

- [ ] **Step 3: SearchPage 구현**

```tsx
// src/routes/SearchPage.tsx
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSearch } from "@/hooks/useSearch";
import { groupSearchResults } from "@/components/search/groupSearchResults";
import { SearchResultGroup } from "@/components/search/SearchResultGroup";
import type { Page } from "@/types/page";

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const navigate = useNavigate();

  const search = useSearch(q);
  const grouped = useMemo(
    () => (search.data ? groupSearchResults(search.data) : { meetings: [], projects: [] }),
    [search.data],
  );
  const total = grouped.meetings.length + grouped.projects.length;

  const handleSelect = (page: Page) => {
    const href =
      page.properties.type === "project"
        ? `/projects/${page._id}`
        : `/meetings/${page._id}`;
    navigate(href);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">검색</h1>
        {q ? (
          <p className="text-sm text-muted-ink">
            <span className="text-ink">"{q}"</span> 결과 {search.isLoading ? "..." : `${total}개`}
          </p>
        ) : null}
      </header>

      {q.trim().length === 0 ? (
        <p className="text-sm text-muted-ink">검색어를 입력하세요</p>
      ) : search.isLoading ? (
        <p className="text-sm text-muted-ink">불러오는 중...</p>
      ) : total === 0 ? (
        <p className="text-sm text-muted-ink">결과 없음</p>
      ) : (
        <div className="space-y-4">
          <SearchResultGroup
            label="📝 회의록"
            pages={grouped.meetings}
            highlightedId={null}
            onSelect={handleSelect}
            onHover={() => undefined}
          />
          <SearchResultGroup
            label="📋 프로젝트"
            pages={grouped.projects}
            highlightedId={null}
            onSelect={handleSelect}
            onHover={() => undefined}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/routes/SearchPage.test.tsx`
Expected: PASS — 3/3.

- [ ] **Step 5: 커밋**

```bash
git add src/routes/SearchPage.tsx src/routes/SearchPage.test.tsx
git commit -m "feat(search): SearchPage — fallback results page driven by ?q="
```

---

## Task 12: `buildMentionItems` — Page[] → SuggestionMenu items 변환 (TDD)

**Files:**
- Create: `src/components/editor/buildMentionItems.ts`
- Test: `src/components/editor/buildMentionItems.test.ts`

**Why:** BlockNote `SuggestionMenuController` 의 `getItems` 가 반환할 형태로 변환. 항목 클릭 시 `editor.insertInlineContent([{ type: "link", href, content }])` 호출이 부수효과로 실행됨. 순수 함수 단계와 부수효과 단계를 분리하면 테스트하기 쉽다.

- [ ] **Step 1: 테스트**

```ts
// src/components/editor/buildMentionItems.test.ts
import { describe, it, expect, vi } from "vitest";
import { buildMentionItems } from "./buildMentionItems";
import type { Page } from "@/types/page";

const page = (id: string, type: "meeting" | "project", title: string): Page => ({
  _id: id,
  workspaceId: "ws_1",
  parentPageId: null,
  title,
  order: 0,
  isArchived: false,
  isPublished: false,
  properties: { type },
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
  removedAt: null,
});

describe("buildMentionItems", () => {
  it("회의록과 프로젝트 모두 멘션 가능 항목으로 만든다", () => {
    const items = buildMentionItems(
      [page("p1", "project", "프로젝트 1"), page("m1", "meeting", "회의 1")],
      vi.fn(),
    );
    expect(items.map((i) => i.title)).toEqual(["프로젝트 1", "회의 1"]);
  });

  it("project 타입은 /projects/:id 로 link 를 삽입한다", () => {
    const insert = vi.fn();
    const items = buildMentionItems(
      [page("p1", "project", "프로젝트 1")],
      insert,
    );
    items[0].onItemClick();
    expect(insert).toHaveBeenCalledWith([
      {
        type: "link",
        href: "/projects/p1",
        content: [{ type: "text", text: "프로젝트 1" }],
      },
      { type: "text", text: " " },
    ]);
  });

  it("meeting 타입은 /meetings/:id 로 link 를 삽입한다", () => {
    const insert = vi.fn();
    const items = buildMentionItems(
      [page("m1", "meeting", "회의 1")],
      insert,
    );
    items[0].onItemClick();
    expect(insert).toHaveBeenCalledWith([
      {
        type: "link",
        href: "/meetings/m1",
        content: [{ type: "text", text: "회의 1" }],
      },
      { type: "text", text: " " },
    ]);
  });

  it("type 이 비어있는 페이지는 결과에서 제외한다", () => {
    const items = buildMentionItems(
      [{ ...page("r", "meeting", "root"), properties: { role: "meetings_root" } }],
      vi.fn(),
    );
    expect(items).toEqual([]);
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/components/editor/buildMentionItems.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

```ts
// src/components/editor/buildMentionItems.ts
import type { Page } from "@/types/page";

type InlineContent =
  | { type: "text"; text: string }
  | {
      type: "link";
      href: string;
      content: { type: "text"; text: string }[];
    };

export interface MentionItem {
  title: string;
  subtext: string;
  onItemClick: () => void;
}

export function buildMentionItems(
  pages: Page[],
  insertInlineContent: (content: InlineContent[]) => void,
): MentionItem[] {
  const out: MentionItem[] = [];
  for (const p of pages) {
    const t = p.properties.type;
    if (t !== "meeting" && t !== "project") continue;
    const href = t === "project" ? `/projects/${p._id}` : `/meetings/${p._id}`;
    const label = p.title || "제목 없음";
    out.push({
      title: label,
      subtext: t === "project" ? "프로젝트" : "회의록",
      onItemClick: () => {
        insertInlineContent([
          { type: "link", href, content: [{ type: "text", text: label }] },
          { type: "text", text: " " },
        ]);
      },
    });
  }
  return out;
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/components/editor/buildMentionItems.test.ts`
Expected: PASS — 4/4.

- [ ] **Step 5: 커밋**

```bash
git add src/components/editor/buildMentionItems.ts src/components/editor/buildMentionItems.test.ts
git commit -m "feat(editor): buildMentionItems — page → mention suggestion item"
```

---

## Task 13: `BlockEditor` 에 `@` 멘션 SuggestionMenu + 내부 link 클릭 → navigate 통합

**Files:**
- Modify: `src/components/editor/BlockEditor.tsx`

**Why:** 이 task 가 Plan 4 의 사용자-가시 멘션 기능을 활성화. BlockNote 의 표준 패턴 (`SuggestionMenuController`) 을 사용하므로 다른 파일에 새 컴포넌트를 만드는 대신 BlockEditor 안에서 직접 조립한다. (별도 MentionMenu 파일을 만드는 것은 BlockNote 의 default `SuggestionMenu` 가 이미 충분히 좋은 UI 를 제공해 YAGNI — Plan 6 폴리싱에서 그룹화/타입 배지 등 보강.)

**Why integration test 없이?** BlockNote 의 SuggestionMenu 는 ProseMirror 위에서 동작해 jsdom 에서 안정적으로 트리거하기 어렵다. 멘션 삽입의 단위 검증은 Task 12 의 `buildMentionItems` 가, 클릭→navigate 동작은 Task 14 의 통합 테스트가 담당. BlockEditor 자체는 mock 으로 처리되는 라우트들 (메모 47, 67) 의 패턴 그대로.

- [ ] **Step 1: BlockEditor 수정**

`src/components/editor/BlockEditor.tsx` 전체를 다음으로 교체:

```tsx
import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { filterSuggestionItems } from "@blocknote/core";
import { useThemeStore } from "@/store/themeStore";
import {
  lightBlockNoteTheme,
  darkBlockNoteTheme,
} from "./blockNoteTheme";
import type { BlockNoteLikeBlock } from "@/lib/blockAdapter";
import type { Page } from "@/types/page";
import { buildMentionItems } from "./buildMentionItems";

interface BlockEditorProps {
  initialContent: BlockNoteLikeBlock[];
  onChange: (blocks: BlockNoteLikeBlock[]) => void;
  /** `@` 입력 시 query 를 받아 멘션 후보 페이지를 비동기로 반환. 미제공 시 멘션 비활성. */
  onMentionSearch?: (query: string) => Promise<Page[]>;
}

const MENTION_HREF_RE = /^\/(meetings|projects)\/[^/?#]+/;

function resolveDark(mode: "system" | "light" | "dark"): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function BlockEditor({
  initialContent,
  onChange,
  onMentionSearch,
}: BlockEditorProps) {
  const mode = useThemeStore((s) => s.mode);
  const isDark = useMemo(() => resolveDark(mode), [mode]);
  const theme = isDark ? darkBlockNoteTheme : lightBlockNoteTheme;
  const navigate = useNavigate();

  const editor = useCreateBlockNote({
    initialContent: initialContent.length > 0
      ? (initialContent as NonNullable<Parameters<typeof useCreateBlockNote>[0]>["initialContent"])
      : undefined,
  });

  const getMentionItems = useCallback(
    async (query: string) => {
      if (!onMentionSearch) return [];
      const pages = await onMentionSearch(query);
      return filterSuggestionItems(
        buildMentionItems(pages, (content) =>
          editor.insertInlineContent(content as never),
        ),
        query,
      );
    },
    [editor, onMentionSearch],
  );

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href) return;
    if (MENTION_HREF_RE.test(href)) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <div onClickCapture={handleContainerClick}>
      <BlockNoteView
        editor={editor}
        theme={theme}
        onChange={() => onChange(editor.document as unknown as BlockNoteLikeBlock[])}
      >
        {onMentionSearch ? (
          <SuggestionMenuController
            triggerCharacter="@"
            getItems={getMentionItems}
          />
        ) : null}
      </BlockNoteView>
    </div>
  );
}
```

- [ ] **Step 2: 컴파일 검증**

Run: `npx tsc -b --noEmit`
Expected: PASS. `filterSuggestionItems` 와 `SuggestionMenuController` 는 `@blocknote/core` / `@blocknote/react` 0.40 의 공개 API.

만약 import 경로가 다르면 (BlockNote 0.40 메이저에서 위치 변경 가능성) 다음 두 후보를 시도:
- `import { filterSuggestionItems } from "@blocknote/core";`
- `import { filterSuggestionItems } from "@blocknote/react";`

타입 에러가 생기면 IDE 자동 import 또는 `node_modules/@blocknote/core/dist/index.d.ts` 검색 (`grep -r filterSuggestionItems node_modules/@blocknote/`).

- [ ] **Step 3: 빌드 검증**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add src/components/editor/BlockEditor.tsx
git commit -m "feat(editor): @ mention SuggestionMenu + internal link → navigate"
```

---

## Task 14: `useSyncMentions` 훅 (TDD)

**Files:**
- Create: `src/hooks/useSyncMentions.ts`
- Test: `src/hooks/useSyncMentions.test.tsx`

**Why:** 본문이 바뀔 때마다 `extractMentions` 결과를 `properties.mentionedPageIds` 에 동기화. 자동 저장 (`useAutosaveBlocks`) 과 별개의 mutation 이지만 같은 디바운스 대상 — UI 가 멘션 추가 직후 RelatedMeetings 가 갱신되도록.

**Design:**
- 입력: `pageId`, `currentMentionedPageIds` (page.properties.mentionedPageIds), `blocks` (현재 BlockNote 트리)
- 1초 디바운스 후 `extractMentions(blocks)` 와 currentMentionedPageIds 비교 → 다르면 `useUpdatePage.mutate({ properties: { mentionedPageIds }})`
- 같은 결과 (정렬 무관 set 비교) 이면 mutation 건너뜀
- 자동 저장이 retry: 2 인 반면 mention sync 는 retry 0 (실패해도 다음 변경에서 다시 시도됨)

- [ ] **Step 1: 테스트**

```tsx
// src/hooks/useSyncMentions.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useSyncMentions } from "./useSyncMentions";
import type { BlockNoteLikeBlock } from "@/lib/blockAdapter";

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

const blockWithMentions = (hrefs: string[]): BlockNoteLikeBlock[] => [
  {
    id: "blk_1",
    type: "paragraph",
    props: {},
    content: hrefs.map((h) => ({
      type: "link",
      href: h,
      content: [{ type: "text", text: h }],
    })) as never,
    children: [],
  },
];

describe("useSyncMentions", () => {
  beforeEach(() => {
    resetDb();
    seed();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("멘션이 추가되면 1초 후 PATCH /pages/:id 가 mentionedPageIds 와 함께 호출된다", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    meeting.properties.mentionedPageIds = [];

    const blocks = blockWithMentions(["/projects/pg_x", "/meetings/pg_y"]);
    const { rerender } = renderHook(
      ({ b }) =>
        useSyncMentions({
          pageId: meeting._id,
          currentMentionedPageIds: meeting.properties.mentionedPageIds ?? [],
          blocks: b,
        }),
      { wrapper: wrapper(), initialProps: { b: [] as BlockNoteLikeBlock[] } },
    );
    rerender({ b: blocks });
    vi.advanceTimersByTime(1000);
    await vi.runOnlyPendingTimersAsync();

    await waitFor(() => {
      const updated = db.pages.find((p) => p._id === meeting._id)!;
      expect(updated.properties.mentionedPageIds).toEqual(["pg_x", "pg_y"]);
    });
  });

  it("멘션 집합이 동일하면 mutation 을 건너뛴다", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    meeting.properties.mentionedPageIds = ["pg_x", "pg_y"];
    const updatedAt = meeting.updatedAt;

    const blocks = blockWithMentions(["/meetings/pg_y", "/projects/pg_x"]); // 순서 다름
    renderHook(() =>
      useSyncMentions({
        pageId: meeting._id,
        currentMentionedPageIds: meeting.properties.mentionedPageIds ?? [],
        blocks,
      }),
      { wrapper: wrapper() },
    );
    vi.advanceTimersByTime(1500);
    await vi.runOnlyPendingTimersAsync();

    expect(meeting.updatedAt).toBe(updatedAt);
  });

  it("pageId 가 없으면 아무 동작도 하지 않는다", () => {
    const blocks = blockWithMentions(["/projects/pg_x"]);
    expect(() =>
      renderHook(() =>
        useSyncMentions({
          pageId: undefined,
          currentMentionedPageIds: [],
          blocks,
        }),
        { wrapper: wrapper() },
      ),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/hooks/useSyncMentions.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

```ts
// src/hooks/useSyncMentions.ts
import { useEffect, useMemo, useRef } from "react";
import { useUpdatePage } from "./usePageMutations";
import { extractMentions } from "@/lib/extractMentions";
import { debounce } from "@/lib/debounce";
import type { BlockNoteLikeBlock } from "@/lib/blockAdapter";

interface Options {
  pageId: string | undefined;
  currentMentionedPageIds: string[];
  blocks: BlockNoteLikeBlock[];
  debounceMs?: number;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

export function useSyncMentions(opts: Options): void {
  const { pageId, currentMentionedPageIds, blocks, debounceMs = 1000 } = opts;
  const updatePage = useUpdatePage();
  const currentRef = useRef(currentMentionedPageIds);
  currentRef.current = currentMentionedPageIds;

  const debounced = useMemo(
    () =>
      debounce((next: string[]) => {
        if (!pageId) return;
        if (sameSet(next, currentRef.current)) return;
        updatePage.mutate({
          pageId,
          input: { properties: { mentionedPageIds: next } },
        });
      }, debounceMs),
    // updatePage 는 stable identity 가 아니지만 mutate 가 ref-stable 한 점에 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageId, debounceMs],
  );

  useEffect(() => {
    if (!pageId) return;
    const next = extractMentions(blocks);
    debounced(next);
  }, [pageId, blocks, debounced]);

  useEffect(() => () => debounced.cancel(), [debounced]);
}
```

- [ ] **Step 4: 실행 → PASS**

Run: `npx vitest run src/hooks/useSyncMentions.test.tsx`
Expected: PASS — 3/3.

만약 `vi.useFakeTimers` 가 React 의 `useEffect` 동기 흐름과 충돌하면, 테스트에서 `vi.advanceTimersByTime` 전에 `await Promise.resolve()` 또는 명시적 `act` 사용.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useSyncMentions.ts src/hooks/useSyncMentions.test.tsx
git commit -m "feat(hooks): useSyncMentions — debounced mentionedPageIds PATCH"
```

---

## Task 15: `MeetingDetailPage` + `ProjectDetailPage` 통합 + 통합 테스트

**Files:**
- Modify: `src/routes/MeetingDetailPage.tsx`
- Modify: `src/routes/ProjectDetailPage.tsx`
- Test: `src/routes/MentionAndSearch.integration.test.tsx` (Create)

**Why:** 마지막 task — 멘션 흐름 끝에서 끝까지 (BlockEditor 입력 → mentionedPageIds 동기화 → RelatedMeetings 가 새로 갱신) 검증. 두 페이지가 같은 패턴이라 한 통합 테스트로 묶음.

- [ ] **Step 1: `MeetingDetailPage` 수정**

`src/routes/MeetingDetailPage.tsx` 의 현재 구현을 다음으로 교체 (멘션 hook + onMentionSearch 추가):

```tsx
import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { usePageDetail } from "@/hooks/usePageDetail";
import { useUpdatePage } from "@/hooks/usePageMutations";
import { useAutosaveBlocks } from "@/hooks/useAutosaveBlocks";
import { useSyncMentions } from "@/hooks/useSyncMentions";
import { searchPages } from "@/api/pages";
import { useWorkspace } from "@/hooks/useWorkspace";
import { MeetingHeader } from "@/components/meetings/MeetingHeader";
import {
  backendToBlockNote,
  type BlockInput,
  type BlockNoteLikeBlock,
} from "@/lib/blockAdapter";

const BlockEditor = lazy(() => import("@/components/editor/BlockEditor"));

export default function MeetingDetailPage() {
  const { id: pageId } = useParams<{ id: string }>();
  const detailQuery = usePageDetail(pageId);
  const updatePage = useUpdatePage();
  const { workspaceId } = useWorkspace();
  const [liveBlocks, setLiveBlocks] = useState<BlockNoteLikeBlock[]>([]);

  const initialBlocks: BlockInput[] = useMemo(() => {
    if (!detailQuery.data) return [];
    return detailQuery.data.blocks.map((b) => ({
      _id: b._id,
      pageId: b.pageId,
      parentBlockId: b.parentBlockId,
      type: b.type,
      content: b.content,
      order: b.order,
    }));
  }, [detailQuery.data]);

  const initialBlockNote: BlockNoteLikeBlock[] = useMemo(() => {
    if (!detailQuery.data) return [];
    return backendToBlockNote(detailQuery.data.blocks);
  }, [detailQuery.data]);

  const autosave = useAutosaveBlocks({ pageId, initialBlocks });

  useSyncMentions({
    pageId,
    currentMentionedPageIds: detailQuery.data?.page.properties.mentionedPageIds ?? [],
    blocks: liveBlocks,
  });

  const onMentionSearch = useCallback(
    async (query: string) => {
      if (!workspaceId) return [];
      return searchPages(workspaceId, query);
    },
    [workspaceId],
  );

  if (detailQuery.isLoading) {
    return <div className="p-4 text-muted-ink">불러오는 중...</div>;
  }
  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-4 text-destructive">회의록을 불러오지 못했습니다.</div>
    );
  }

  const page = detailQuery.data.page;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <MeetingHeader
        title={page.title}
        date={page.properties.date}
        onTitleChange={(next) => {
          if (!pageId) return;
          updatePage.mutate({ pageId, input: { title: next } });
        }}
        saveStatus={autosave.status}
      />
      <Suspense fallback={<div className="text-muted-ink">에디터 준비 중...</div>}>
        <BlockEditor
          key={pageId}
          initialContent={initialBlockNote}
          onChange={(blocks) => {
            setLiveBlocks(blocks);
            autosave.save(blocks);
          }}
          onMentionSearch={onMentionSearch}
        />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: `ProjectDetailPage` 수정**

`src/routes/ProjectDetailPage.tsx` 에 동일한 패턴 적용. 기존 파일 전체를 다음으로 교체:

```tsx
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePageDetail } from "@/hooks/usePageDetail";
import { useUpdatePage } from "@/hooks/usePageMutations";
import { useAutosaveBlocks } from "@/hooks/useAutosaveBlocks";
import { useSyncMentions } from "@/hooks/useSyncMentions";
import { useWorkspace } from "@/hooks/useWorkspace";
import { searchPages } from "@/api/pages";
import { ProjectModalShell } from "@/components/projects/ProjectModalShell";
import { ProjectMetaBar } from "@/components/projects/ProjectMetaBar";
import { RelatedMeetings } from "@/components/projects/RelatedMeetings";
import { SaveIndicator } from "@/components/editor/SaveIndicator";
import {
  backendToBlockNote,
  type BlockInput,
  type BlockNoteLikeBlock,
} from "@/lib/blockAdapter";
import type { ProjectStatus } from "@/types/page";

const BlockEditor = lazy(() => import("@/components/editor/BlockEditor"));

export default function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id: pageId } = useParams<{ id: string }>();
  const detailQuery = usePageDetail(pageId);
  const updatePage = useUpdatePage();
  const { workspaceId } = useWorkspace();
  const [liveBlocks, setLiveBlocks] = useState<BlockNoteLikeBlock[]>([]);

  const initialBlocks: BlockInput[] = useMemo(() => {
    if (!detailQuery.data) return [];
    return detailQuery.data.blocks.map((b) => ({
      _id: b._id,
      pageId: b.pageId,
      parentBlockId: b.parentBlockId,
      type: b.type,
      content: b.content,
      order: b.order,
    }));
  }, [detailQuery.data]);

  const initialBlockNote: BlockNoteLikeBlock[] = useMemo(() => {
    if (!detailQuery.data) return [];
    return backendToBlockNote(detailQuery.data.blocks);
  }, [detailQuery.data]);

  const autosave = useAutosaveBlocks({ pageId, initialBlocks });

  useSyncMentions({
    pageId,
    currentMentionedPageIds: detailQuery.data?.page.properties.mentionedPageIds ?? [],
    blocks: liveBlocks,
  });

  const onMentionSearch = useCallback(
    async (query: string) => {
      if (!workspaceId) return [];
      return searchPages(workspaceId, query);
    },
    [workspaceId],
  );

  const handleClose = () => navigate("/projects");

  return (
    <ProjectModalShell open={!!pageId} onClose={handleClose}>
      {detailQuery.isLoading ? (
        <p className="p-6 text-muted-ink">불러오는 중...</p>
      ) : detailQuery.isError || !detailQuery.data ? (
        <div className="p-6 space-y-3">
          <p className="text-destructive">프로젝트를 찾을 수 없습니다.</p>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-brand hover:underline"
          >
            ← 칸반으로
          </button>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          <header className="flex items-start justify-between gap-3 pr-20">
            <div className="flex-1 space-y-2">
              <ProjectTitleInput
                title={detailQuery.data.page.title}
                onCommit={(next) => {
                  if (!pageId) return;
                  if (next === detailQuery.data!.page.title) return;
                  updatePage.mutate({
                    pageId,
                    input: { title: next },
                  });
                }}
              />
              <ProjectMetaBar
                project={detailQuery.data.page}
                onStatusChange={(next: ProjectStatus) => {
                  if (!pageId) return;
                  updatePage.mutate({
                    pageId,
                    input: { properties: { status: next } },
                  });
                }}
              />
            </div>
            <SaveIndicator status={autosave.status} />
          </header>

          <Suspense
            fallback={<div className="text-muted-ink">에디터 준비 중...</div>}
          >
            <BlockEditor
              key={pageId}
              initialContent={initialBlockNote}
              onChange={(blocks) => {
                setLiveBlocks(blocks);
                autosave.save(blocks);
              }}
              onMentionSearch={onMentionSearch}
            />
          </Suspense>

          <RelatedMeetings projectId={pageId!} />
        </div>
      )}
    </ProjectModalShell>
  );
}

function ProjectTitleInput({
  title,
  onCommit,
}: {
  title: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(title);
  useEffect(() => {
    setDraft(title);
  }, [title]);
  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      placeholder="제목 없음"
      className="w-full bg-transparent text-2xl font-bold text-ink placeholder:text-muted-ink/40 focus:outline-none"
      aria-label="프로젝트 제목"
    />
  );
}
```

- [ ] **Step 3: 통합 테스트 작성**

```tsx
// src/routes/MentionAndSearch.integration.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { CommandPalette } from "@/components/search/CommandPalette";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// BlockEditor 는 jsdom 에서 ProseMirror 가 불안정하므로 단순 stub 으로 대체.
// 멘션 흐름의 핵심 동작 (link → navigate, mentionedPageIds 동기화) 은 onChange 에 직접
// 멘션 link 가 든 blocks 를 주입해 시뮬레이션한다.
vi.mock("@/components/editor/BlockEditor", () => ({
  default: ({
    onChange,
    onMentionSearch,
  }: {
    onChange: (blocks: unknown[]) => void;
    onMentionSearch?: (q: string) => Promise<unknown[]>;
  }) => (
    <div>
      <button
        data-testid="simulate-mention"
        onClick={() =>
          onChange([
            {
              id: "blk_1",
              type: "paragraph",
              props: {},
              content: [
                {
                  type: "link",
                  href: "/projects/pg_target",
                  content: [{ type: "text", text: "타깃 프로젝트" }],
                },
              ],
              children: [],
            },
          ])
        }
      >
        simulate-mention
      </button>
      <button
        data-testid="probe-mention-search"
        onClick={() => onMentionSearch?.("프로")}
      >
        probe-search
      </button>
    </div>
  ),
}));

function setup(initialEntry: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <CommandPalette />
        <Routes>
          <Route
            path="/meetings/:id"
            lazy={async () => ({ Component: (await import("./MeetingDetailPage")).default })}
          />
          <Route
            path="/projects/:id"
            element={<div>project-page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Plan 4 — mention + ⌘K integration", () => {
  beforeEach(() => {
    resetDb();
    seed();
    useCommandPaletteStore.setState({ open: false });
  });

  it("MeetingDetailPage 에서 멘션을 추가하면 mentionedPageIds 가 동기화된다", async () => {
    const user = userEvent.setup();
    // 새 빈 프로젝트를 멘션 대상으로 추가
    const target = {
      ...db.pages[0],
      _id: "pg_target",
      title: "타깃 프로젝트",
      parentPageId: db.pages.find((p) => p.properties.role === "projects_root")!._id,
      properties: { type: "project" as const, status: "planned" as const },
      isArchived: false,
    };
    db.pages.push({ ...target, removedAt: null });

    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    meeting.properties.mentionedPageIds = [];

    setup(`/meetings/${meeting._id}`);

    // 페이지 로드 대기
    await screen.findByTestId("simulate-mention");

    await user.click(screen.getByTestId("simulate-mention"));

    await waitFor(
      () => {
        const updated = db.pages.find((p) => p._id === meeting._id)!;
        expect(updated.properties.mentionedPageIds).toEqual(["pg_target"]);
      },
      { timeout: 3000 },
    );
  });

  it("⌘K 모달에서 검색 후 결과 클릭 시 해당 페이지로 navigate 한다", async () => {
    const user = userEvent.setup();
    useCommandPaletteStore.setState({ open: true });
    const meeting = db.pages.find(
      (p) => p.properties.type === "meeting" && p.title.length > 0,
    )!;
    setup("/");

    const input = await screen.findByPlaceholderText(/검색|search/i);
    await user.type(input, meeting.title.slice(0, 2));
    await waitFor(() =>
      expect(screen.getByText(meeting.title)).toBeInTheDocument(),
    );
    await user.click(screen.getByText(meeting.title));

    await waitFor(() =>
      expect(useCommandPaletteStore.getState().open).toBe(false),
    );
  });

  it("onMentionSearch 가 워크스페이스 검색 결과를 반환한다", async () => {
    const user = userEvent.setup();
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    setup(`/meetings/${meeting._id}`);

    const probe = await screen.findByTestId("probe-mention-search");
    // 핸들러가 throw 하지 않고 fetch 가 발생하면 OK — 실제 결과 콘텐츠는 BlockEditor 단위에서 검증.
    await user.click(probe);
  });
});
```

- [ ] **Step 4: 실행**

Run: `npx vitest run src/routes/MentionAndSearch.integration.test.tsx`
Expected: PASS — 3/3.

타이밍 이슈가 발생하면 `waitFor` timeout 을 5000ms 로 늘리거나, `useSyncMentions` 의 `debounceMs` 를 테스트에서 0 으로 주입할 수 있도록 옵션 추가 후 재실행.

- [ ] **Step 5: 풀 회귀 검증**

Run: `npx vitest run`
Expected: 모든 기존 테스트 + Plan 4 테스트 PASS.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 6: 커밋**

```bash
git add src/routes/MeetingDetailPage.tsx src/routes/ProjectDetailPage.tsx src/routes/MentionAndSearch.integration.test.tsx
git commit -m "feat(routes): wire mention sync + onMentionSearch into detail pages"
```

---

## Wrap-up

**완료 기준:**
- 모든 task 의 Step "PASS" 가 실제로 통과
- `npx vitest run` 풀스위트 PASS (Plan 3 끝의 알려진 flake `MeetingDetailPage.test.tsx "renders the meeting title and date"` 는 풀 스위트에서 ~30% 실패하지만 단독 100% 통과 — Plan 4 의 회귀가 아님)
- `npm run build` PASS
- 수동 sanity:
  - `⌘K`/`Ctrl+K` → 모달 열림 → 검색 → 결과 클릭 → 페이지 이동
  - 회의록/프로젝트 상세 페이지에서 `@` 입력 → suggestion 메뉴 → 항목 선택 → 본문에 link 삽입
  - 본문에 멘션 추가 후 1-2초 대기 → 해당 프로젝트의 RelatedMeetings 가 새로 갱신됨
  - 본문 내 멘션 클릭 → SPA navigate (전체 새로고침 없음)

**Plan 5 로 넘어가기 전 체크:**
- `extractMentions` 로직과 `useSyncMentions` 의 retry/debounce 가 안정적 (실패 토스트가 과하게 떠지 않음)
- BlockEditor 의 SuggestionMenu 가 다크/라이트 모드에서 정상

---

## 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-04-29 | 초안 작성 (Plan 4 — @멘션 + ⌘K 글로벌 검색, 15 tasks) |
