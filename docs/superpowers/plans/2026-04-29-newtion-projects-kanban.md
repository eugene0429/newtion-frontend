# Newtion: Projects + Kanban + Modal Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트 칸반 보드 (`/projects`) + 드래그 앤 드롭으로 status/order 변경 + 프로젝트 상세 모달 (`/projects/:id`, BlockNote 자동 저장 + 관련 회의록) 을 구현한다.

**Architecture:**
- Plan 1/2 의 산출물 위에서 진행. 새로운 도메인 훅은 만들지 않고 `usePages`/`usePageMutations` 를 그대로 재사용 (parent = `projects_root`).
- 드래그는 `@dnd-kit/core` + `@dnd-kit/sortable` 로 구성. 드롭 시 `PATCH /pages/:id` 로 `properties.status` + `order` 를 한 번에 갱신하고, 실패 시 TanStack Query 의 onError 롤백 + Toast 로 처리한다 (spec 5-6).
- 모달은 React Router 의 nested route + Radix `<Dialog open={!!pageId}>` 로 구현. Esc/✕/뒤로가기 → `/projects` 로 navigate, 풀스크린 토글은 Zustand `modalStore` (URL 유지).
- 본문 자동 저장은 회의록과 동일하게 `useAutosaveBlocks` 재사용 — `BlockEditor` 도 그대로 lazy import.

**Tech Stack (신규만):** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`. (BlockNote, Tailwind, TanStack Query, Zustand, Sonner, Radix Dialog 는 Plan 1/2 에서 이미 셋업됨.)

---

## File Structure

**Modify:**
- `src/hooks/usePageMutations.ts` — `useUpdatePage` 의 onMutate 가 `properties` 를 deep-merge 하도록 수정 (Plan 2 끝의 알려진 이슈; Task 1).
- `src/hooks/usePageMutations.test.tsx` — 위 동작을 보호하는 테스트 추가.
- `src/mocks/handlers/pages.ts` — PATCH `/pages/:pageId` 핸들러도 properties 를 deep-merge 하도록 수정 (서버/캐시 대칭).
- `src/mocks/db/seed.ts` — 프로젝트 8개에 BlockNote 시드 블록(개요 + 본문 + 체크박스) 추가.
- `src/mocks/db/seed.test.ts` — 프로젝트 블록 시드 검증 추가.
- `src/routes/ProjectsKanbanPage.tsx` — placeholder 를 풀 구현으로 교체.
- `src/routes/ProjectDetailPage.tsx` — placeholder 를 모달 + BlockEditor + 메타 + 관련 회의록으로 교체.
- `package.json` — dnd-kit 의존성.

**Create (lib):**
- `src/lib/computeKanbanOrder.ts` + `.test.ts` — 정렬된 order 배열에 카드 끼워 넣을 때 새 order 계산 (분수 ordering).
- `src/lib/projectStatus.ts` + `.test.ts` — `ProjectStatus` 라벨/배지 클래스/이모지 헬퍼.
- `src/lib/planKanbanDragMove.ts` + `.test.ts` — DnD onDragEnd 의 순수 로직 (페이지 목록 + dragged/over id → `{ pageId, newStatus, newOrder } | null`).

**Create (components/projects/):**
- `src/components/projects/ProjectCard.tsx` (+ `.test.tsx`) — 단순 표시. DnD 무관.
- `src/components/projects/KanbanColumn.tsx` — droppable + sortable wrapper.
- `src/components/projects/KanbanBoard.tsx` (+ `.test.tsx`) — DndContext + 3개 컬럼 렌더 + onDragEnd → useUpdatePage.
- `src/components/projects/ProjectModalShell.tsx` — Dialog + 풀스크린 토글 헤더.
- `src/components/projects/ProjectMetaBar.tsx` — 상태 드롭다운 / 진행률 / 마감일 / 태그.
- `src/components/projects/RelatedMeetings.tsx` — `usePages({ mentionedPageId })`.

---

## Task 1: `useUpdatePage` 와 PATCH 핸들러가 `properties` 를 deep-merge

**Files:**
- Modify: `src/hooks/usePageMutations.ts:21-58` (`useUpdatePage`)
- Test: `src/hooks/usePageMutations.test.tsx`
- Modify: `src/mocks/handlers/pages.ts:107-113` (PATCH `/pages/:pageId`)

**Why first:** Plan 3 의 모든 status 변경(드래그, 메타바 드롭다운, 자동 저장 후속) 이 `{ properties: { status } }` 같은 부분 업데이트를 보낸다. 현재 onMutate 와 서버 핸들러 모두 `Object.assign(... ,input)` 으로 properties 를 통째로 덮어쓰기 때문에 `type`/`date`/`mentionedPageIds` 가 사라진다. 모든 후속 task 의 정확성이 이 fix 에 달려 있다.

- [ ] **Step 1: 실패하는 테스트 추가 (캐시 deep-merge)**

`src/hooks/usePageMutations.test.tsx` 의 `describe("useUpdatePage", ...)` 블록 끝에 두 개의 it 추가:

```tsx
it("부분 properties 업데이트는 다른 properties를 보존한다 (서버)", async () => {
  const project = db.pages.find(
    (p) => p.properties.type === "project" && p.properties.tags?.length,
  )!;
  const originalType = project.properties.type;
  const originalTags = project.properties.tags;

  const { result } = renderHook(() => useUpdatePage(), {
    wrapper: wrapper(),
  });
  await act(async () => {
    await result.current.mutateAsync({
      pageId: project._id,
      input: { properties: { status: "in_progress" } },
    });
  });

  const updated = db.pages.find((p) => p._id === project._id)!;
  expect(updated.properties.status).toBe("in_progress");
  expect(updated.properties.type).toBe(originalType);
  expect(updated.properties.tags).toEqual(originalTags);
});

it("optimistic 캐시도 properties 를 deep-merge 한다", async () => {
  const project = db.pages.find(
    (p) => p.properties.type === "project" && p.properties.tags?.length,
  )!;
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // 캐시에 page-detail 미리 심어둠
  qc.setQueryData(["page-detail", project._id], {
    page: project,
    blocks: [],
    blockTree: [],
  });
  const w = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useUpdatePage(), { wrapper: w });
  // 테스트 중 onMutate 가 동기적으로 실행됨 → mutate 호출 직후 캐시 검사
  result.current.mutate({
    pageId: project._id,
    input: { properties: { status: "done" } },
  });
  await waitFor(() => {
    const cached = qc.getQueryData<{ page: typeof project }>([
      "page-detail",
      project._id,
    ])!;
    expect(cached.page.properties.status).toBe("done");
    expect(cached.page.properties.type).toBe(project.properties.type);
    expect(cached.page.properties.tags).toEqual(project.properties.tags);
  });
});
```

상단 import 에 `waitFor` 와 (이미 있다면 그대로) 다음을 보장:

```tsx
import { renderHook, act, waitFor } from "@testing-library/react";
```

- [ ] **Step 2: 테스트 실행 — RED 확인**

Run: `npx vitest run src/hooks/usePageMutations.test.tsx`
Expected: 두 신규 테스트가 FAIL. 첫 번째는 서버 properties 가 `{ status: "in_progress" }` 만 남고 type/tags 가 사라져서 실패. 두 번째는 캐시도 마찬가지로 properties 가 `{ status: "done" }` 만 남아서 실패.

- [ ] **Step 3: PATCH 핸들러 수정 (서버 deep-merge)**

`src/mocks/handlers/pages.ts` 의 `http.patch("*/pages/:pageId", ...)` 블록 전체를 다음으로 교체:

```ts
http.patch("*/pages/:pageId", async ({ params, request }) => {
  const body = (await request.json()) as Partial<Page>;
  const p = db.pages.find((x) => x._id === params.pageId);
  if (!p) {
    return HttpResponse.json({ message: "not found" }, { status: 404 });
  }
  const { properties: nextProps, ...rest } = body;
  Object.assign(p, rest, { updatedAt: nowIso() });
  if (nextProps) {
    p.properties = { ...p.properties, ...nextProps };
  }
  return HttpResponse.json(p);
}),
```

- [ ] **Step 4: `useUpdatePage` onMutate 수정 (캐시 deep-merge)**

`src/hooks/usePageMutations.ts` 의 `useUpdatePage` onMutate 블록을 다음으로 교체:

```ts
onMutate: async ({ pageId, input }) => {
  await qc.cancelQueries({ queryKey: ["page-detail", pageId] });
  const previous = qc.getQueryData<{ page: Page }>([
    "page-detail",
    pageId,
  ]);
  if (previous) {
    const { properties: nextProps, ...rest } = input;
    qc.setQueryData(["page-detail", pageId], {
      ...previous,
      page: {
        ...previous.page,
        ...rest,
        properties: nextProps
          ? { ...previous.page.properties, ...nextProps }
          : previous.page.properties,
      },
    });
  }
  return { previous };
},
```

- [ ] **Step 5: 테스트 실행 — GREEN 확인**

Run: `npx vitest run src/hooks/usePageMutations.test.tsx`
Expected: 모든 useUpdatePage 테스트 PASS (기존 + 신규 2개).

- [ ] **Step 6: 회귀 — 전체 테스트**

Run: `npx vitest run`
Expected: 모두 PASS (Plan 2 의 69 + 신규 2 = 71).

- [ ] **Step 7: 커밋**

```bash
git add src/hooks/usePageMutations.ts src/hooks/usePageMutations.test.tsx src/mocks/handlers/pages.ts
git commit -m "fix(pages): deep-merge properties in useUpdatePage + MSW PATCH handler"
```

---

## Task 2: `@dnd-kit` 의존성 설치 + sanity check

**Files:**
- Modify: `package.json`
- Modify (자동): `package-lock.json`

- [ ] **Step 1: 설치**

Run:

```bash
npm install @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/utilities@^3.2.2
```

Expected: 설치 완료, peer 경고는 React 18 호환이라 발생할 수 있음. `package.json` 의 `dependencies` 에 세 항목 추가.

- [ ] **Step 2: 타입 sanity — 한 줄 import 가 컴파일되는지 확인**

임시로 다음 파일 생성: `src/lib/__dnd_sanity.ts`

```ts
import { DndContext, useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

void DndContext;
void useDroppable;
void useSortable;
void SortableContext;
void CSS;
```

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: 에러 없음.

- [ ] **Step 3: sanity 파일 삭제**

Run: `rm src/lib/__dnd_sanity.ts`

- [ ] **Step 4: 테스트 + 빌드 회귀**

Run: `npx vitest run`
Expected: PASS (변경 없음).

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): install @dnd-kit/core + sortable + utilities for kanban"
```

---

## Task 3: `lib/computeKanbanOrder.ts` (TDD)

**Files:**
- Create: `src/lib/computeKanbanOrder.ts`
- Test: `src/lib/computeKanbanOrder.test.ts`

**Why:** 드롭 시 도착 컬럼의 카드 사이에 `order` 를 끼워 넣어야 한다. 정수 reindex 대신 분수(midpoint) ordering 으로 단일 PATCH 만 보내도록 한다. (`PATCH /pages/reorder` 사용은 스코프 외.)

- [ ] **Step 1: 테스트 작성**

`src/lib/computeKanbanOrder.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeKanbanOrder, KANBAN_ORDER_STEP } from "./computeKanbanOrder";

describe("computeKanbanOrder", () => {
  it("빈 배열이면 0", () => {
    expect(computeKanbanOrder([], 0)).toBe(0);
  });

  it("맨 앞에 끼우면 first - STEP", () => {
    expect(computeKanbanOrder([10, 20, 30], 0)).toBe(10 - KANBAN_ORDER_STEP);
  });

  it("맨 뒤에 끼우면 last + STEP", () => {
    expect(computeKanbanOrder([10, 20, 30], 3)).toBe(30 + KANBAN_ORDER_STEP);
  });

  it("중간에 끼우면 양 옆 midpoint", () => {
    expect(computeKanbanOrder([10, 20, 30], 1)).toBe(15);
    expect(computeKanbanOrder([10, 20, 30], 2)).toBe(25);
  });

  it("insertIndex 가 길이를 초과하면 끝으로 클램프", () => {
    expect(computeKanbanOrder([10, 20], 99)).toBe(20 + KANBAN_ORDER_STEP);
  });

  it("insertIndex 가 음수이면 앞으로 클램프", () => {
    expect(computeKanbanOrder([10, 20], -5)).toBe(10 - KANBAN_ORDER_STEP);
  });
});
```

- [ ] **Step 2: 테스트 실행 — RED**

Run: `npx vitest run src/lib/computeKanbanOrder.test.ts`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현 작성**

`src/lib/computeKanbanOrder.ts`:

```ts
export const KANBAN_ORDER_STEP = 1000;

/**
 * 정렬된(오름차순) 카드 order 배열에 새 카드를 `insertIndex` 에 끼워 넣을 때
 * 새 카드의 order 를 계산한다. 호출자는 드래그 중인 카드를 sortedOrders 에서
 * 미리 제외해서 넘긴다.
 */
export function computeKanbanOrder(
  sortedOrders: number[],
  insertIndex: number,
): number {
  if (sortedOrders.length === 0) return 0;
  const idx = Math.max(0, Math.min(insertIndex, sortedOrders.length));
  if (idx === 0) return sortedOrders[0] - KANBAN_ORDER_STEP;
  if (idx === sortedOrders.length) {
    return sortedOrders[sortedOrders.length - 1] + KANBAN_ORDER_STEP;
  }
  return (sortedOrders[idx - 1] + sortedOrders[idx]) / 2;
}
```

- [ ] **Step 4: 테스트 실행 — GREEN**

Run: `npx vitest run src/lib/computeKanbanOrder.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/computeKanbanOrder.ts src/lib/computeKanbanOrder.test.ts
git commit -m "feat(lib): computeKanbanOrder — fractional ordering for kanban inserts"
```

---

## Task 4: `lib/projectStatus.ts` (TDD)

**Files:**
- Create: `src/lib/projectStatus.ts`
- Test: `src/lib/projectStatus.test.ts`

**Why:** `ProjectStatus` 의 라벨/이모지/배지 클래스를 한 곳에서 관리해야 ProjectCard, KanbanColumn, ProjectMetaBar 가 일관되게 표시한다.

- [ ] **Step 1: 테스트 작성**

`src/lib/projectStatus.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  PROJECT_STATUSES,
  projectStatusLabel,
  projectStatusEmoji,
  projectStatusBadgeClass,
} from "./projectStatus";

describe("projectStatus helpers", () => {
  it("PROJECT_STATUSES 는 spec 4-4 순서 (예정 → 진행중 → 완료)", () => {
    expect(PROJECT_STATUSES).toEqual(["planned", "in_progress", "done"]);
  });

  it("projectStatusLabel 은 한국어 라벨을 돌려준다", () => {
    expect(projectStatusLabel("planned")).toBe("예정");
    expect(projectStatusLabel("in_progress")).toBe("진행중");
    expect(projectStatusLabel("done")).toBe("완료");
  });

  it("projectStatusEmoji 는 spec 컬러 이모지", () => {
    expect(projectStatusEmoji("planned")).toBe("🟦");
    expect(projectStatusEmoji("in_progress")).toBe("🟧");
    expect(projectStatusEmoji("done")).toBe("🟩");
  });

  it("projectStatusBadgeClass 는 tailwind 토큰을 포함한다", () => {
    expect(projectStatusBadgeClass("planned")).toContain("status-plannedFg");
    expect(projectStatusBadgeClass("in_progress")).toContain(
      "status-progressFg",
    );
    expect(projectStatusBadgeClass("done")).toContain("status-doneFg");
  });
});
```

- [ ] **Step 2: 테스트 실행 — RED**

Run: `npx vitest run src/lib/projectStatus.test.ts`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현 작성**

`src/lib/projectStatus.ts`:

```ts
import type { ProjectStatus } from "@/types/page";

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "planned",
  "in_progress",
  "done",
] as const;

export function projectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case "planned":
      return "예정";
    case "in_progress":
      return "진행중";
    case "done":
      return "완료";
  }
}

export function projectStatusEmoji(status: ProjectStatus): string {
  switch (status) {
    case "planned":
      return "🟦";
    case "in_progress":
      return "🟧";
    case "done":
      return "🟩";
  }
}

export function projectStatusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "planned":
      return "bg-status-plannedBg text-status-plannedFg";
    case "in_progress":
      return "bg-status-progressBg text-status-progressFg";
    case "done":
      return "bg-status-doneBg text-status-doneFg";
  }
}

export function projectStatusDotClass(status: ProjectStatus): string {
  switch (status) {
    case "planned":
      return "bg-status-plannedFg";
    case "in_progress":
      return "bg-status-progressFg";
    case "done":
      return "bg-status-doneFg";
  }
}
```

- [ ] **Step 4: 테스트 실행 — GREEN**

Run: `npx vitest run src/lib/projectStatus.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/projectStatus.ts src/lib/projectStatus.test.ts
git commit -m "feat(lib): projectStatus — label/emoji/badge/dot helpers"
```

---

## Task 5: `lib/planKanbanDragMove.ts` (TDD)

**Files:**
- Create: `src/lib/planKanbanDragMove.ts`
- Test: `src/lib/planKanbanDragMove.test.ts`

**Why:** DnD onDragEnd 의 결정 로직을 컴포넌트 밖으로 빼면 단위 테스트가 간단해지고, KanbanBoard 통합 테스트는 "이 함수 결과로 PATCH 가 호출된다" 만 확인하면 된다 (jsdom 의 PointerEvent 시뮬레이션 없이).

함수 시그니처:
- 입력: 모든 프로젝트 페이지 + dragged id + over id (over 가 없는 빈 영역 드롭은 호출되지 않음)
- 출력: `{ pageId, newStatus, newOrder } | null` (no-op 또는 에러 케이스는 null)

- [ ] **Step 1: 테스트 작성**

`src/lib/planKanbanDragMove.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { planKanbanDragMove } from "./planKanbanDragMove";
import type { Page } from "@/types/page";

function project(
  id: string,
  status: "planned" | "in_progress" | "done",
  order: number,
): Page {
  return {
    _id: id,
    workspaceId: "ws_1",
    parentPageId: "pg_projects_root",
    title: id,
    order,
    isArchived: false,
    isPublished: false,
    properties: { type: "project", status },
    createdAt: "2026-04-29T00:00:00.000Z",
    updatedAt: "2026-04-29T00:00:00.000Z",
    removedAt: null,
  };
}

const projects: Page[] = [
  project("p1", "planned", 0),
  project("p2", "planned", 1000),
  project("p3", "planned", 2000),
  project("p4", "in_progress", 0),
  project("p5", "in_progress", 1000),
  project("p6", "done", 0),
];

describe("planKanbanDragMove", () => {
  it("다른 컬럼 카드 위에 드롭하면 status 가 그 컬럼으로 바뀌고 새 order 는 카드 사이로 들어간다", () => {
    const move = planKanbanDragMove({
      projects,
      draggedId: "p1",
      overId: "p5",
    });
    expect(move).not.toBeNull();
    expect(move!.pageId).toBe("p1");
    expect(move!.newStatus).toBe("in_progress");
    // p4(0) 와 p5(1000) 사이에 끼움 → midpoint? insertIndex=p5 의 위치(1)
    // dragged 제외한 in_progress = [p4(0), p5(1000)], insertIndex=1 → midpoint 500
    expect(move!.newOrder).toBe(500);
  });

  it("빈 컬럼(droppable column) 위에 드롭하면 그 컬럼으로 이동, order=0", () => {
    // done 컬럼에는 p6 만 있음. column id `column:done` 에 드롭 = 끝에 추가
    const move = planKanbanDragMove({
      projects,
      draggedId: "p1",
      overId: "column:done",
    });
    expect(move).not.toBeNull();
    expect(move!.newStatus).toBe("done");
    // dragged 제외한 done = [p6(0)], insertIndex=length=1 → 0 + STEP
    expect(move!.newOrder).toBe(1000);
  });

  it("같은 컬럼 같은 자리 드롭은 null (no-op)", () => {
    const move = planKanbanDragMove({
      projects,
      draggedId: "p2",
      overId: "p2",
    });
    expect(move).toBeNull();
  });

  it("같은 컬럼 다른 카드 위 드롭은 컬럼 내 재정렬", () => {
    // p3 를 p1 위로 → planned 컬럼 내 [p1, p2, p3] → [p3, p1, p2]
    // dragged 제외 [p1(0), p2(1000)], insertIndex = p1 의 위치(0) → 0 - STEP
    const move = planKanbanDragMove({
      projects,
      draggedId: "p3",
      overId: "p1",
    });
    expect(move).not.toBeNull();
    expect(move!.newStatus).toBe("planned");
    expect(move!.newOrder).toBe(-1000);
  });

  it("dragged id 가 프로젝트 목록에 없으면 null", () => {
    const move = planKanbanDragMove({
      projects,
      draggedId: "ghost",
      overId: "p1",
    });
    expect(move).toBeNull();
  });

  it("over id 가 프로젝트도 컬럼도 아니면 null", () => {
    const move = planKanbanDragMove({
      projects,
      draggedId: "p1",
      overId: "garbage",
    });
    expect(move).toBeNull();
  });

  it("status 가 없는 프로젝트는 planned 로 간주", () => {
    const noStatus = project("orphan", "planned", 5000);
    delete noStatus.properties.status;
    const move = planKanbanDragMove({
      projects: [...projects, noStatus],
      draggedId: "orphan",
      overId: "column:in_progress",
    });
    expect(move!.newStatus).toBe("in_progress");
  });
});
```

- [ ] **Step 2: 테스트 실행 — RED**

Run: `npx vitest run src/lib/planKanbanDragMove.test.ts`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현 작성**

`src/lib/planKanbanDragMove.ts`:

```ts
import { computeKanbanOrder } from "./computeKanbanOrder";
import type { Page, ProjectStatus } from "@/types/page";

const COLUMN_ID_PREFIX = "column:";
const STATUSES: ProjectStatus[] = ["planned", "in_progress", "done"];

export interface KanbanDragMove {
  pageId: string;
  newStatus: ProjectStatus;
  newOrder: number;
}

export interface PlanKanbanDragArgs {
  projects: Page[];
  draggedId: string;
  overId: string;
}

function statusOf(p: Page): ProjectStatus {
  return (p.properties.status ?? "planned") as ProjectStatus;
}

function parseColumnId(id: string): ProjectStatus | null {
  if (!id.startsWith(COLUMN_ID_PREFIX)) return null;
  const candidate = id.slice(COLUMN_ID_PREFIX.length) as ProjectStatus;
  return STATUSES.includes(candidate) ? candidate : null;
}

export function planKanbanDragMove(
  args: PlanKanbanDragArgs,
): KanbanDragMove | null {
  const { projects, draggedId, overId } = args;
  const dragged = projects.find((p) => p._id === draggedId);
  if (!dragged) return null;

  const overColumn = parseColumnId(overId);
  const overCard = projects.find((p) => p._id === overId);

  let destStatus: ProjectStatus;
  let destCardId: string | null;
  if (overColumn) {
    destStatus = overColumn;
    destCardId = null;
  } else if (overCard) {
    destStatus = statusOf(overCard);
    destCardId = overCard._id;
  } else {
    return null;
  }

  // No-op: 자기 위에 드롭
  if (destCardId === draggedId) return null;

  const destColumn = projects
    .filter((p) => statusOf(p) === destStatus && p._id !== draggedId)
    .sort((a, b) => a.order - b.order);

  let insertIndex = destColumn.length;
  if (destCardId) {
    const idx = destColumn.findIndex((p) => p._id === destCardId);
    insertIndex = idx === -1 ? destColumn.length : idx;
  }

  const newOrder = computeKanbanOrder(
    destColumn.map((p) => p.order),
    insertIndex,
  );
  return {
    pageId: draggedId,
    newStatus: destStatus,
    newOrder,
  };
}
```

- [ ] **Step 4: 테스트 실행 — GREEN**

Run: `npx vitest run src/lib/planKanbanDragMove.test.ts`
Expected: PASS (7/7).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/planKanbanDragMove.ts src/lib/planKanbanDragMove.test.ts
git commit -m "feat(lib): planKanbanDragMove — pure drag resolution for kanban"
```

---

## Task 6: 시드에 프로젝트 블록 트리 추가

**Files:**
- Modify: `src/mocks/db/seed.ts`
- Modify: `src/mocks/db/seed.test.ts`

**Why:** 프로젝트 모달에서 BlockEditor 가 비어 있지 않게 하려면 seed 가 블록을 채워야 한다. 회의록과 같이 어댑터 라운드트립도 검증된다.

- [ ] **Step 1: seed.test.ts 에 실패 테스트 추가**

`src/mocks/db/seed.test.ts` 의 적당한 위치에 추가:

```ts
it("프로젝트 8개 각각에 블록 트리가 시드된다", () => {
  seed();
  const projects = db.pages.filter((p) => p.properties.type === "project");
  expect(projects).toHaveLength(8);
  for (const project of projects) {
    const blocks = db.blocks.filter((b) => b.pageId === project._id);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
  }
});
```

- [ ] **Step 2: 테스트 실행 — RED**

Run: `npx vitest run src/mocks/db/seed.test.ts`
Expected: FAIL — 프로젝트 페이지에 블록이 0개.

- [ ] **Step 3: seed.ts 에 헬퍼 추가 + 호출**

`src/mocks/db/seed.ts` 의 `seedMeetingBlocks` 함수 아래에 다음을 추가:

```ts
function seedProjectBlocks(pageId: string, index: number): void {
  const items: Block[] = [
    {
      _id: newId("bl"),
      pageId,
      parentBlockId: null,
      type: "heading_2",
      content: {
        props: { level: 2 },
        inline: [{ type: "text", text: "개요", styles: {} }],
      },
      order: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    },
    {
      _id: newId("bl"),
      pageId,
      parentBlockId: null,
      type: "paragraph",
      content: {
        props: {},
        inline: [
          {
            type: "text",
            text: `프로젝트 ${index + 1} 의 목표와 진행 상황을 기록합니다.`,
            styles: {},
          },
        ],
      },
      order: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    },
    {
      _id: newId("bl"),
      pageId,
      parentBlockId: null,
      type: "to_do",
      content: {
        props: { checked: false },
        inline: [{ type: "text", text: "다음 마일스톤 정의", styles: {} }],
      },
      order: 2,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    },
  ];
  db.blocks.push(...items);
}
```

그리고 `projectStatus.forEach((status, i) => { ... db.pages.push(...) })` 블록 안에서, `db.pages.push(...)` 호출 직후 (블록 안의 마지막 줄로) 다음을 추가:

```ts
seedProjectBlocks(id, i);
```

- [ ] **Step 4: 테스트 실행 — GREEN**

Run: `npx vitest run src/mocks/db/seed.test.ts`
Expected: PASS (신규 + 기존).

- [ ] **Step 5: 회귀 — 전체 테스트**

Run: `npx vitest run`
Expected: PASS (어댑터/페이지 디테일 테스트 영향 없음).

- [ ] **Step 6: 커밋**

```bash
git add src/mocks/db/seed.ts src/mocks/db/seed.test.ts
git commit -m "feat(seed): project block trees for kanban detail modal"
```

---

## Task 7: `ProjectCard` 컴포넌트

**Files:**
- Create: `src/components/projects/ProjectCard.tsx`
- Test: `src/components/projects/ProjectCard.test.tsx`

**Why:** 표시 전용 — DnD 인지 안 함. 클릭 → 모달 라우트 navigate.

- [ ] **Step 1: 테스트 작성**

`src/components/projects/ProjectCard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectCard } from "./ProjectCard";
import type { Page } from "@/types/page";

function makeProject(overrides: Partial<Page["properties"]> = {}): Page {
  return {
    _id: "pg_p1",
    workspaceId: "ws_1",
    parentPageId: "pg_projects_root",
    title: "결제 모듈 리뉴얼",
    order: 0,
    isArchived: false,
    isPublished: false,
    properties: {
      type: "project",
      status: "in_progress",
      progress: 60,
      tags: ["product"],
      ...overrides,
    },
    createdAt: "2026-04-29T00:00:00.000Z",
    updatedAt: "2026-04-29T00:00:00.000Z",
    removedAt: null,
  };
}

function renderCard(project: Page, preview = "") {
  return render(
    <MemoryRouter>
      <ProjectCard project={project} preview={preview} />
    </MemoryRouter>,
  );
}

describe("ProjectCard", () => {
  it("제목과 미리보기를 렌더한다", () => {
    renderCard(makeProject(), "분기별 결제 흐름 정리");
    expect(screen.getByText("결제 모듈 리뉴얼")).toBeInTheDocument();
    expect(screen.getByText("분기별 결제 흐름 정리")).toBeInTheDocument();
  });

  it("진행중 상태이고 progress 가 있으면 진행률 바 노출", () => {
    renderCard(makeProject({ status: "in_progress", progress: 42 }));
    const bar = screen.getByLabelText("진행률 42%");
    expect(bar).toBeInTheDocument();
  });

  it("planned 상태면 진행률 바를 노출하지 않는다", () => {
    renderCard(makeProject({ status: "planned", progress: 0 }));
    expect(screen.queryByLabelText(/진행률/)).not.toBeInTheDocument();
  });

  it("태그를 칩으로 표시", () => {
    renderCard(makeProject({ tags: ["product", "infra"] }));
    expect(screen.getByText("product")).toBeInTheDocument();
    expect(screen.getByText("infra")).toBeInTheDocument();
  });

  it("isPinned 면 핀 아이콘 노출", () => {
    renderCard(makeProject({ isPinned: true }));
    expect(screen.getByLabelText("고정됨")).toBeInTheDocument();
  });

  it("클릭하면 /projects/:id 로 이동하는 link 역할", () => {
    renderCard(makeProject());
    const link = screen.getByRole("link", { name: /결제 모듈 리뉴얼/ });
    expect(link).toHaveAttribute("href", "/projects/pg_p1");
  });
});
```

- [ ] **Step 2: 테스트 실행 — RED**

Run: `npx vitest run src/components/projects/ProjectCard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현 작성**

`src/components/projects/ProjectCard.tsx`:

```tsx
import { Link } from "react-router-dom";
import { Pin } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Page, ProjectStatus } from "@/types/page";

interface ProjectCardProps {
  project: Page;
  preview: string;
}

export function ProjectCard({ project, preview }: ProjectCardProps) {
  const status = (project.properties.status ?? "planned") as ProjectStatus;
  const progress = project.properties.progress;
  const tags = project.properties.tags ?? [];
  const showProgress =
    status === "in_progress" && typeof progress === "number";
  const clampedProgress = Math.max(0, Math.min(100, progress ?? 0));

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
        {project.properties.isPinned && (
          <Pin className="w-3 h-3 text-tag-pink shrink-0" aria-label="고정됨" />
        )}
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

- [ ] **Step 4: 테스트 실행 — GREEN**

Run: `npx vitest run src/components/projects/ProjectCard.test.tsx`
Expected: PASS (6/6).

- [ ] **Step 5: 커밋**

```bash
git add src/components/projects/ProjectCard.tsx src/components/projects/ProjectCard.test.tsx
git commit -m "feat(projects): ProjectCard with progress/tags/pin"
```

---

## Task 8: `KanbanColumn` 컴포넌트

**Files:**
- Create: `src/components/projects/KanbanColumn.tsx`

**Why:** 컬럼 헤더(상태 도트 + 라벨 + 카운트) + droppable 영역 + sortable 카드 리스트 + "+ 카드 추가" 버튼. 이 단계에서는 단위 RTL 테스트는 생략 — KanbanBoard 통합 테스트가 컬럼 렌더를 보장.

- [ ] **Step 1: 구현 작성**

`src/components/projects/KanbanColumn.tsx`:

```tsx
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import type { Page, ProjectStatus } from "@/types/page";
import {
  projectStatusDotClass,
  projectStatusLabel,
} from "@/lib/projectStatus";
import { cn } from "@/lib/cn";

interface KanbanColumnProps {
  status: ProjectStatus;
  projects: Page[];
  previews: Record<string, string>;
  onAddCard: (status: ProjectStatus) => void;
  isCreating?: boolean;
}

export function KanbanColumn({
  status,
  projects,
  previews,
  onAddCard,
  isCreating,
}: KanbanColumnProps) {
  const columnId = `column:${status}`;
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: { type: "column", status },
  });
  const ids = projects.map((p) => p._id);

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      className={cn(
        "flex flex-col rounded-card bg-card-muted border border-line p-3 min-h-[200px] transition-colors",
        isOver && "ring-2 ring-brand/40",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              projectStatusDotClass(status),
            )}
            aria-hidden
          />
          <h2 className="text-sm font-medium text-ink">
            {projectStatusLabel(status)}
          </h2>
        </div>
        <span className="text-xs text-muted-ink" aria-label="카드 수">
          {projects.length}
        </span>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1 min-h-[40px]">
          {projects.map((p) => (
            <SortableProjectCard
              key={p._id}
              project={p}
              preview={previews[p._id] ?? ""}
            />
          ))}
        </div>
      </SortableContext>
      <button
        type="button"
        onClick={() => onAddCard(status)}
        disabled={isCreating}
        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-ink hover:text-ink py-1.5 disabled:opacity-50"
      >
        <Plus className="w-3.5 h-3.5" />
        카드 추가
      </button>
    </div>
  );
}

function SortableProjectCard({
  project,
  preview,
}: {
  project: Page;
  preview: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project._id,
    data: {
      type: "card",
      status: project.properties.status ?? "planned",
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <ProjectCard project={project} preview={preview} />
    </div>
  );
}
```

> **참고:** `useSortable` 의 listeners 가 카드 전체에 붙는다. PointerSensor 의 `activationConstraint: { distance: 5 }` (Task 9 의 KanbanBoard 에서 설정) 덕분에 5px 미만 이동은 click 으로 처리되어 ProjectCard 의 `<Link>` 가 정상 동작한다.

- [ ] **Step 2: 컴파일 확인**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/components/projects/KanbanColumn.tsx
git commit -m "feat(projects): KanbanColumn — droppable + sortable column"
```

---

## Task 9: `KanbanBoard` 컴포넌트 + 통합 테스트

**Files:**
- Create: `src/components/projects/KanbanBoard.tsx`
- Test: `src/components/projects/KanbanBoard.test.tsx`

**Why:** 3개 컬럼을 병치하고 DndContext 로 묶는다. onDragEnd 는 `planKanbanDragMove` 를 호출 → useUpdatePage 로 PATCH. 통합 테스트는 onDragEnd 를 직접 호출하는 방식으로 (jsdom 의 PointerEvent 시뮬레이션 회피) PATCH 가 올바른 properties 와 order 로 호출되는지 확인.

- [ ] **Step 1: 통합 테스트 작성 (RED)**

`src/components/projects/KanbanBoard.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw";
import { db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { KanbanBoard } from "./KanbanBoard";
import type { Page } from "@/types/page";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => seed());

function wrap(children: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function getProjects(): Page[] {
  return db.pages
    .filter((p) => p.properties.type === "project")
    .sort((a, b) => a.order - b.order);
}

describe("KanbanBoard", () => {
  it("3개 컬럼(예정/진행중/완료) 을 렌더한다", () => {
    const projects = getProjects();
    render(
      wrap(
        <KanbanBoard
          projects={projects}
          previews={{}}
          onAddCard={() => {}}
        />,
      ),
    );
    expect(screen.getByText("예정")).toBeInTheDocument();
    expect(screen.getByText("진행중")).toBeInTheDocument();
    expect(screen.getByText("완료")).toBeInTheDocument();
  });

  it("프로젝트는 status 별 컬럼으로 분류된다", () => {
    const projects = getProjects();
    render(
      wrap(
        <KanbanBoard
          projects={projects}
          previews={{}}
          onAddCard={() => {}}
        />,
      ),
    );
    const planned = screen.getByTestId("kanban-column-planned");
    const inProgress = screen.getByTestId("kanban-column-in_progress");
    const done = screen.getByTestId("kanban-column-done");
    expect(planned.textContent).toMatch(/3/); // 카운트 3
    expect(inProgress.textContent).toMatch(/3/);
    expect(done.textContent).toMatch(/2/);
  });

  it("'카드 추가' 클릭 시 onAddCard(status) 호출", async () => {
    const user = userEvent.setup();
    const onAddCard = vi.fn();
    const projects = getProjects();
    render(
      wrap(
        <KanbanBoard
          projects={projects}
          previews={{}}
          onAddCard={onAddCard}
        />,
      ),
    );
    const buttons = screen.getAllByRole("button", { name: /카드 추가/ });
    await user.click(buttons[1]); // 두 번째 = in_progress
    expect(onAddCard).toHaveBeenCalledWith("in_progress");
  });

  it("드래그 종료 시 PATCH /pages/:id 가 status + order 로 호출된다", async () => {
    const projects = getProjects();
    const planned = projects.filter((p) => p.properties.status === "planned");
    const target = planned[0]; // 'planned' 의 첫 카드를 'done' 컬럼으로 이동
    const patches: Array<{ pageId: string; body: unknown }> = [];

    server.use(
      http.patch("*/pages/:pageId", async ({ params, request }) => {
        const body = await request.json();
        patches.push({ pageId: String(params.pageId), body });
        return HttpResponse.json({ ok: true });
      }),
    );

    let dragEnd: ((args: { active: { id: string }; over: { id: string } | null }) => void) | null = null;
    render(
      wrap(
        <KanbanBoard
          projects={projects}
          previews={{}}
          onAddCard={() => {}}
          onDragEndForTest={(handler) => {
            dragEnd = handler;
          }}
        />,
      ),
    );

    expect(dragEnd).not.toBeNull();
    dragEnd!({
      active: { id: target._id },
      over: { id: "column:done" },
    });

    // mutation 은 비동기 — flush
    await vi.waitFor(() => {
      expect(patches.length).toBeGreaterThan(0);
    });
    const sent = patches[0];
    expect(sent.pageId).toBe(target._id);
    expect(sent.body).toMatchObject({
      properties: { status: "done" },
    });
    expect(typeof (sent.body as { order: number }).order).toBe("number");
  });
});
```

- [ ] **Step 2: 테스트 실행 — RED**

Run: `npx vitest run src/components/projects/KanbanBoard.test.tsx`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현 작성**

`src/components/projects/KanbanBoard.tsx`:

```tsx
import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { KanbanColumn } from "./KanbanColumn";
import { ProjectCard } from "./ProjectCard";
import { useUpdatePage } from "@/hooks/usePageMutations";
import { planKanbanDragMove } from "@/lib/planKanbanDragMove";
import { PROJECT_STATUSES } from "@/lib/projectStatus";
import type { Page, ProjectStatus } from "@/types/page";

interface KanbanBoardProps {
  projects: Page[];
  previews: Record<string, string>;
  onAddCard: (status: ProjectStatus) => void;
  isCreating?: boolean;
  /** 테스트 전용 — 마운트 시점에 onDragEnd 핸들러를 부모에 전달. */
  onDragEndForTest?: (handler: (event: DragEndEvent) => void) => void;
}

export function KanbanBoard({
  projects,
  previews,
  onAddCard,
  isCreating,
  onDragEndForTest,
}: KanbanBoardProps) {
  const updatePage = useUpdatePage();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const grouped: Record<ProjectStatus, Page[]> = {
    planned: [],
    in_progress: [],
    done: [],
  };
  for (const p of projects) {
    const s = (p.properties.status ?? "planned") as ProjectStatus;
    grouped[s].push(p);
  }
  for (const s of PROJECT_STATUSES) {
    grouped[s].sort((a, b) => a.order - b.order);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const move = planKanbanDragMove({
      projects,
      draggedId: String(active.id),
      overId: String(over.id),
    });
    if (!move) return;
    updatePage.mutate(
      {
        pageId: move.pageId,
        input: {
          properties: { status: move.newStatus },
          order: move.newOrder,
        },
      },
      {
        onError: () => toast.error("이동 실패 — 잠시 후 다시 시도해주세요"),
      },
    );
  }

  // 테스트 전용 — handleDragEnd 자체를 외부로 노출
  useEffect(() => {
    if (onDragEndForTest) onDragEndForTest(handleDragEnd);
    // handleDragEnd 는 매 렌더 새로 만들어지지만, 테스트는 1회 실행이라 OK
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const activeProject = activeId
    ? projects.find((p) => p._id === activeId) ?? null
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROJECT_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            projects={grouped[status]}
            previews={previews}
            onAddCard={onAddCard}
            isCreating={isCreating}
          />
        ))}
      </div>
      <DragOverlay>
        {activeProject ? (
          <ProjectCard
            project={activeProject}
            preview={previews[activeProject._id] ?? ""}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 4: 테스트 실행 — GREEN**

Run: `npx vitest run src/components/projects/KanbanBoard.test.tsx`
Expected: PASS (4/4). 만약 마지막 테스트에서 PATCH 호출 횟수가 0 이라면, `onDragEndForTest` 가 onDragEnd 를 즉시 캡쳐하는지(useEffect 가 마운트 후 실행되었는지) 확인. 필요시 useEffect deps 를 `[]` 로 변경.

- [ ] **Step 5: 회귀**

Run: `npx vitest run`
Expected: 전체 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/components/projects/KanbanBoard.tsx src/components/projects/KanbanBoard.test.tsx
git commit -m "feat(projects): KanbanBoard — DndContext + 3 columns + drag-to-PATCH"
```

---

## Task 10: `ProjectsKanbanPage` 풀 구현

**Files:**
- Modify: `src/routes/ProjectsKanbanPage.tsx` (현재 placeholder 교체)

**Why:** workspace bootstrap → projects fetch → previews(useQueries) → KanbanBoard. "+ 새 프로젝트" 는 planned 컬럼에 새로 만들고 모달로 navigate.

> **N+1 미리보기 주의:** 프로젝트 8개 × `getBlockTree` 8회. seed 8개라 OK 지만 staleTime 60s 로 재페치 비용을 제어한다. 카드가 50+ 으로 늘면 prefetch 또는 backend list 응답에 preview 포함을 검토 (Plan 4 폴리싱).

- [ ] **Step 1: 구현 교체**

`src/routes/ProjectsKanbanPage.tsx` 전체 내용 교체:

```tsx
import { useMemo } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePages } from "@/hooks/usePages";
import { useCreatePage } from "@/hooks/usePageMutations";
import { getBlockTree } from "@/api/blocks";
import { extractBlockPreview } from "@/lib/extractBlockPreview";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import type { ProjectStatus } from "@/types/page";

export default function ProjectsKanbanPage() {
  const navigate = useNavigate();
  const { workspaceId, rootFolders } = useWorkspace();
  const projectsRoot = rootFolders?.projects;
  const projectsQuery = usePages({
    workspaceId,
    parentPageId: projectsRoot,
  });
  const projects = projectsQuery.data ?? [];

  const previewQueries = useQueries({
    queries: projects.map((p) => ({
      queryKey: ["blocks", p._id],
      queryFn: () => getBlockTree(p._id),
      enabled: !!p._id,
      staleTime: 60_000,
    })),
  });

  const previews = useMemo(() => {
    const out: Record<string, string> = {};
    projects.forEach((p, i) => {
      const data = previewQueries[i]?.data;
      out[p._id] = data
        ? extractBlockPreview(data.blocks, { maxLength: 80 })
        : "";
    });
    return out;
  }, [projects, previewQueries]);

  const createPage = useCreatePage();

  const handleAddCard = async (status: ProjectStatus) => {
    if (!workspaceId || !projectsRoot) return;
    const created = await createPage.mutateAsync({
      workspaceId,
      parentPageId: projectsRoot,
      title: "",
      emoji: "🆕",
      order: -Date.now(),
      properties: { type: "project", status },
    });
    navigate(`/projects/${created._id}`);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">프로젝트</h1>
        <button
          type="button"
          onClick={() => handleAddCard("planned")}
          disabled={createPage.isPending || !workspaceId}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-brand text-white text-sm hover:bg-brand/90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {createPage.isPending ? "생성 중..." : "새 프로젝트"}
        </button>
      </header>

      {projectsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-48 rounded-card bg-card-muted animate-pulse"
            />
          ))}
        </div>
      ) : (
        <KanbanBoard
          projects={projects}
          previews={previews}
          onAddCard={handleAddCard}
          isCreating={createPage.isPending}
        />
      )}

      <Outlet />
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: 에러 없음.

- [ ] **Step 3: 회귀**

Run: `npx vitest run`
Expected: 전체 PASS (이 라우트는 단위 테스트 없음 — Task 14 manual smoke).

- [ ] **Step 4: 커밋**

```bash
git add src/routes/ProjectsKanbanPage.tsx
git commit -m "feat(projects): ProjectsKanbanPage with KanbanBoard + create flow"
```

---

## Task 11: `ProjectModalShell` 컴포넌트

**Files:**
- Create: `src/components/projects/ProjectModalShell.tsx`

**Why:** Dialog 래퍼 — `open` 이 false 가 되면 `onClose` 호출. 풀스크린 토글은 Zustand `modalStore` 로 관리(URL 유지). 모달이 닫힐 때 풀스크린 상태도 리셋한다.

- [ ] **Step 1: 구현 작성**

`src/components/projects/ProjectModalShell.tsx`:

```tsx
import { useEffect, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useModalStore } from "@/store/modalStore";
import { cn } from "@/lib/cn";

interface ProjectModalShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function ProjectModalShell({
  open,
  onClose,
  children,
}: ProjectModalShellProps) {
  const fullscreen = useModalStore((s) => s.fullscreen);
  const toggleFullscreen = useModalStore((s) => s.toggleFullscreen);
  const setFullscreen = useModalStore((s) => s.setFullscreen);

  useEffect(() => {
    if (!open) setFullscreen(false);
  }, [open, setFullscreen]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "bg-card text-ink",
          fullscreen
            ? "max-w-none w-screen h-screen rounded-none p-0"
            : "max-w-4xl max-h-[85vh] overflow-y-auto",
        )}
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute right-12 top-4 rounded-sm p-1 opacity-70 hover:opacity-100 z-10"
          aria-label={fullscreen ? "기본 크기" : "풀스크린"}
        >
          {fullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
        {children}
      </DialogContent>
    </Dialog>
  );
}
```

> **참고:** Radix `<DialogContent>` 가 자체 ✕ 버튼 (right-4 top-4) 을 포함. 우리는 그 왼쪽(right-12) 에 풀스크린 토글을 둔다.

- [ ] **Step 2: 컴파일 확인**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/components/projects/ProjectModalShell.tsx
git commit -m "feat(projects): ProjectModalShell — Dialog with fullscreen toggle"
```

---

## Task 12: `ProjectMetaBar` 컴포넌트

**Files:**
- Create: `src/components/projects/ProjectMetaBar.tsx`

**Why:** spec 4-5 의 메타바 — 상태 드롭다운 / 진행률 / 마감일 / 태그.

- [ ] **Step 1: 구현 작성**

`src/components/projects/ProjectMetaBar.tsx`:

```tsx
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}

export function ProjectMetaBar({
  project,
  onStatusChange,
}: ProjectMetaBarProps) {
  const status = (project.properties.status ?? "planned") as ProjectStatus;
  const progress = project.properties.progress;
  const dueDate = project.properties.dueDate;
  const tags = project.properties.tags ?? [];

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-ink">
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

- [ ] **Step 2: 컴파일 확인**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/components/projects/ProjectMetaBar.tsx
git commit -m "feat(projects): ProjectMetaBar — status dropdown + progress + due + tags"
```

---

## Task 13: `RelatedMeetings` 컴포넌트

**Files:**
- Create: `src/components/projects/RelatedMeetings.tsx`

**Why:** spec 4-5 하단의 "📎 관련 회의록" — 역인덱스 (`GET /pages?mentionedPageId=:id`). 이미 `usePages({ mentionedPageId })` 가 Plan 2 에서 구현됨.

- [ ] **Step 1: 구현 작성**

`src/components/projects/RelatedMeetings.tsx`:

```tsx
import { Link } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePages } from "@/hooks/usePages";
import { formatMeetingDate } from "@/lib/formatMeetingDate";

interface RelatedMeetingsProps {
  projectId: string;
}

export function RelatedMeetings({ projectId }: RelatedMeetingsProps) {
  const { workspaceId } = useWorkspace();
  const query = usePages({ workspaceId, mentionedPageId: projectId });

  if (query.isLoading) {
    return <p className="text-xs text-muted-ink">관련 회의록 로딩...</p>;
  }
  const meetings = query.data ?? [];
  if (meetings.length === 0) {
    return (
      <p className="text-xs text-muted-ink">📎 관련 회의록 없음</p>
    );
  }

  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-medium text-muted-ink">
        📎 관련 회의록 ({meetings.length})
      </h3>
      <ul className="space-y-1">
        {meetings.map((m) => (
          <li key={m._id}>
            <Link
              to={`/meetings/${m._id}`}
              className="text-sm text-ink hover:text-brand underline-offset-2 hover:underline"
            >
              <span className="text-muted-ink mr-2">
                {formatMeetingDate(m.properties.date)}
              </span>
              {m.title || "제목 없음"}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: 컴파일 확인**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/components/projects/RelatedMeetings.tsx
git commit -m "feat(projects): RelatedMeetings — reverse-index meeting links"
```

---

## Task 14: `ProjectDetailPage` 풀 구현

**Files:**
- Modify: `src/routes/ProjectDetailPage.tsx` (placeholder 교체)
- Test: `src/routes/ProjectDetailPage.test.tsx` (생성)

**Why:** 모달 + 제목 input + 메타바 + BlockEditor(lazy) + autosave + 관련 회의록. 자동 저장 status 는 `SaveIndicator` 로 표시. 닫기는 `navigate("/projects")`.

- [ ] **Step 1: 통합 테스트 작성 (RED)**

`src/routes/ProjectDetailPage.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import ProjectDetailPage from "./ProjectDetailPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => seed());

// jsdom 에서 BlockNote 의 ProseMirror 마운트가 불안정 — 모달 와이어링/PATCH 흐름만 검증.
// (Plan 2 의 MeetingDetailPage 테스트와 동일 패턴.)
vi.mock("@/components/editor/BlockEditor", () => ({
  default: () => <div data-testid="block-editor-stub" />,
}));

function wrap(initialPath: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/projects" element={<div>kanban</div>}>
            <Route path=":id" element={<ProjectDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectDetailPage", () => {
  it("프로젝트 페이지의 제목과 상태 라벨을 모달에 렌더한다", async () => {
    const project = db.pages.find(
      (p) => p.properties.type === "project" && p.properties.status === "in_progress",
    )!;
    wrap(`/projects/${project._id}`);
    await waitFor(() => {
      expect(screen.getByDisplayValue(project.title)).toBeInTheDocument();
    });
    expect(screen.getByLabelText("상태 변경")).toHaveTextContent("진행중");
  });

  it("존재하지 않는 프로젝트 id 면 '찾을 수 없음' 표시", async () => {
    wrap("/projects/pg_does_not_exist");
    await waitFor(() => {
      expect(
        screen.getByText(/찾을 수 없습니다/),
      ).toBeInTheDocument();
    });
  });

  it("상태 드롭다운으로 'done' 선택 시 PATCH 가 호출되고 type 등 다른 properties 는 보존", async () => {
    const user = userEvent.setup();
    const project = db.pages.find(
      (p) => p.properties.type === "project" && p.properties.status === "planned",
    )!;
    const originalType = project.properties.type;

    wrap(`/projects/${project._id}`);
    await waitFor(() =>
      expect(screen.getByLabelText("상태 변경")).toBeInTheDocument(),
    );

    await user.click(screen.getByLabelText("상태 변경"));
    await user.click(await screen.findByRole("menuitem", { name: "완료" }));

    await waitFor(() => {
      const updated = db.pages.find((p) => p._id === project._id)!;
      expect(updated.properties.status).toBe("done");
      expect(updated.properties.type).toBe(originalType);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 — RED**

Run: `npx vitest run src/routes/ProjectDetailPage.test.tsx`
Expected: FAIL — 모달이 placeholder.

- [ ] **Step 3: 구현 교체**

`src/routes/ProjectDetailPage.tsx` 전체 내용 교체:

```tsx
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePageDetail } from "@/hooks/usePageDetail";
import { useUpdatePage } from "@/hooks/usePageMutations";
import { useAutosaveBlocks } from "@/hooks/useAutosaveBlocks";
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

  const autosave = useAutosaveBlocks({
    pageId,
    initialBlocks,
  });

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
              onChange={(blocks) => autosave.save(blocks)}
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

- [ ] **Step 4: 테스트 실행 — GREEN**

Run: `npx vitest run src/routes/ProjectDetailPage.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: 회귀 — 전체 테스트**

Run: `npx vitest run`
Expected: 전체 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/routes/ProjectDetailPage.tsx src/routes/ProjectDetailPage.test.tsx
git commit -m "feat(projects): ProjectDetailPage modal with BlockEditor + autosave + related"
```

---

## Task 15: 엔드투엔드 검증 + manual smoke

**Files:** 없음 (검증만; manual 검증 중 발견한 버그 수정만 별도 커밋)

- [ ] **Step 1: 전체 테스트**

Run: `npx vitest run`
Expected: 전체 PASS. Plan 2 의 69 + Plan 3 신규 (정확 카운트는 환경에 따라 ~85+).

- [ ] **Step 2: 빌드**

Run: `npm run build`
Expected: PASS (`tsc -b` 부터 깨끗하게 통과 + vite 번들 생성).

- [ ] **Step 3: dev 서버 실행 + manual smoke**

Run: `npm run dev` (별도 터미널, 포트 5173)

브라우저 `http://localhost:5173/projects` 에서:

1. 칸반 보드가 3개 컬럼(예정/진행중/완료) 으로 렌더, 각 컬럼에 프로젝트 카드.
2. 진행중 컬럼의 카드들은 진행률 바가 보인다.
3. 카드 클릭 → 모달이 `/projects/:id` 로 열림. 새로고침 시 모달 즉시 복원.
4. 모달 헤더 우측 풀스크린 버튼 → 모달이 viewport 전체. 다시 누르면 복귀. URL 은 그대로.
5. 모달 안 상태 드롭다운으로 '완료' 선택 → 모달 닫고 칸반 가서 카드가 완료 컬럼으로 이동.
6. 모달 본문에서 텍스트 입력 → 1초 후 저장됨 표시.
7. 칸반에서 카드를 다른 컬럼으로 드래그 → 즉시 옮겨짐 (낙관적). DevTools Network 탭에서 PATCH /pages/:id 가 properties.status 와 order 로 호출된 것 확인.
8. "+ 새 프로젝트" → 빈 카드가 모달에서 열리고, 입력 시 자동 저장 동작.
9. 컬럼 하단 "+ 카드 추가" → 해당 status 로 새 카드 생성 후 모달 오픈.
10. 다크 모드 토글 (사이드바 ⚙ 옆) → 칸반 + 모달 + BlockNote 가 다크 토큰으로 전환.
11. 모달에서 ✕ 또는 Esc → /projects 로 복귀, 칸반 그대로.
12. 회의록(Plan 2) 페이지 정상 동작 회귀: `/meetings`, `/meetings/:id` 이상 없음.

- [ ] **Step 4: 커밋 (manual 검증 발견 버그가 있으면 별도 커밋, 없으면 no-op)**

manual 검증 중 발견한 버그 수정만 별도 커밋. 깨끗했다면 이 step 은 no-op.

---

## Plan 4 시작 시 첫 작업 (참고)

1. `@멘션` 도메인 — BlockNote 슬래시 메뉴 + extractMentions + 멘션 시 `mentionedPageIds` 갱신.
2. ⌘K 글로벌 검색 모달 (debounce 200ms, useSearch 훅, 라우트 결과 페이지).
3. 즐겨찾기 / 최근 항목 / 홈 Bento 카드 5종.
4. 폴리싱: ErrorBoundary, 네트워크 끊김 배너, 핀 토글, 회의록 리스트 칩 필터/그리드토글, "수동 재시도" 버튼, prefetch / preview backend 확장 검토.
5. **프로젝트 메타 편집 affordance** — Plan 3 에서 표시-only 로 시작한 진행률/마감일/태그/isPinned 의 입력 컴포넌트 (슬라이더, date picker, tag input, 핀 토글) + PATCH 와이어링. `useUpdatePage` 의 deep-merge 가 이미 들어가 있어 `{ properties: { progress: n } }` 같은 부분 PATCH 로 안전하게 추가 가능.

---

## Self-Review 체크리스트 (작성자용)

**Spec 4-4 (프로젝트 칸반):**
- [x] 페이지 제목 + `[+ 새 프로젝트]` 버튼 — Task 10 ProjectsKanbanPage.
- [x] 3개 컬럼(예정/진행중/완료) + 컬럼 헤더의 컬러 도트 + 카운트 — Task 8 KanbanColumn + projectStatusDotClass (Task 4).
- [x] 카드: 제목 / 본문 미리보기 / 진행률(진행중일 때) / (옵션) 핀 — Task 7 ProjectCard. **첨부 개수 배지는 Plan 4 (파일 시스템 미구현).**
- [x] 컬럼 하단 "+ 카드 추가" — Task 8 KanbanColumn.
- [x] 드래그 (`@dnd-kit/sortable`) — Task 9 KanbanBoard + Task 5 planKanbanDragMove.

**Spec 4-5 (프로젝트 상세 모달):**
- [x] 모달 기본 크기 `max-w-4xl max-h-[85vh]` — Task 11 ProjectModalShell.
- [x] 풀스크린 토글 (URL 유지) — Task 11 + modalStore (Plan 1).
- [x] 헤더 ✕ 닫기 — Radix Dialog 내장.
- [x] 메타바 — Task 12 ProjectMetaBar.
  - 상태 드롭다운: 편집 가능 (드롭다운 → `useUpdatePage({ properties: { status } })`).
  - 진행률 / 마감일 / 태그: **표시만** — 입력 affordance(슬라이더/date picker/tag input)는 **Plan 4 폴리싱**. spec 4-5 가 "메타바: 상태 드롭다운 / 진행률 / 마감일 / 태그" 로만 적혀 입력 수단이 명시되지 않아 보수적으로 표시-only 로 시작.
- [x] BlockNote 에디터 — Task 14 (lazy + Suspense).
- [x] `📎 관련 회의록` (멘션 역인덱스) — Task 13 RelatedMeetings.

**Spec 5-2 (API):**
- [x] `PATCH /pages/:id` — useUpdatePage (Task 1 deep-merge fix + Task 14 사용).
- [x] `GET /pages?parentPageId=projects_root` — usePages (Task 10).
- [x] `GET /pages/:id/detail` — usePageDetail (Task 14).
- [x] `GET /pages?mentionedPageId` — usePages (Task 13).
- [x] 자동 저장 4종 (`POST /blocks/batch`, `PATCH /blocks/:id`, `DELETE /blocks/:id`, `GET /blocks/tree`) — useAutosaveBlocks 재사용 (Plan 2).
- [ ] `PATCH /pages/reorder` — **사용 안 함**. 단일 PATCH 와 분수 ordering 으로 충분 (spec 5-6 도 단일 PATCH 예시).

**Spec 5-6 (칸반 드래그):**
- [x] 드래그 종료 → 즉시 UI 업데이트 (낙관적) — Task 1 onMutate deep-merge.
- [x] PATCH /pages/:id `{ properties: { ...status }, order: <새 순서> }` — Task 9 onDragEnd.
- [x] 실패 시 롤백 + Toast — Task 1 onError context + Task 9 toast.error.

**Spec 6-4 (URL ↔ 모달):**
- [x] `useParams<{ id?: string }>()` 로 모달 오픈 판정 — Task 14.
- [x] 카드 클릭 → `navigate("/projects/:id")` — Task 7 `<Link to={...}>`.
- [x] Esc / ✕ / 뒤로가기 → `navigate("/projects")` — Task 11 onOpenChange.
- [x] 풀스크린 토글 — modalStore (URL 유지).

**Spec 7-1 (에러):**
- [x] 칸반 드래그 실패 → 낙관적 롤백 + Toast "이동 실패" — Task 1 + Task 9.
- [x] 모달 진입 시 페이지 없음 → "찾을 수 없음" + 칸반 복귀 버튼 — Task 14.
- [ ] 자동 저장 실패 — Plan 2 에서 cover 됨 (useAutosaveBlocks 재사용).

**Spec 7-2 (TanStack Query):** Plan 1 에서 main.tsx 에 설정. 자동 저장은 useAutosaveBlocks 가 retry: 2 override (재사용).

**Spec 7-3 (로딩 패턴):**
- [x] 칸반 shimmer — Task 10.
- [x] 모달 헤더 즉시 + 본문만 로딩 — Task 14 (헤더는 detailQuery 데이터 도착 후 렌더, BlockEditor 만 Suspense).

**Spec 7-4 / 7-5 (테스트):**
- [x] 유닛: computeKanbanOrder, projectStatus, planKanbanDragMove.
- [x] 컴포넌트: ProjectCard.
- [x] 통합: KanbanBoard (드래그 → PATCH), ProjectDetailPage (모달 + 메타 드롭다운 + 404).
- [ ] BlockEditor 컴포넌트 단위 RTL — 작성 안 함 (jsdom + ProseMirror 호환성. Plan 2 와 동일).

**Spec 7-7 (성능):**
- [x] BlockNote 동적 import — Task 14.
- [x] 칸반 드래그 응답 < 16ms — DnD 라이브러리 + 낙관적 (서버 PATCH 는 별도 mutation).
- [ ] 카드 미리보기 N+1 — staleTime 60s 로 비용 제어. 50+ 카드 시 backend 응답 확장 검토 (Plan 4).

**Placeholder/타입 일관성 점검:**
- [x] 모든 코드 블록은 실제 작성 가능한 완전한 형태.
- [x] `KanbanDragMove`/`planKanbanDragMove` 시그니처가 KanbanBoard 와 동일.
- [x] `ProjectCard`/`KanbanColumn` 의 `previews: Record<string, string>` shape 이 ProjectsKanbanPage 에서 동일하게 생성.
- [x] `useUpdatePage` 시그니처 그대로 사용 (Task 9, Task 14).
- [x] `useAutosaveBlocks`, `BlockEditor`, `SaveIndicator`, `useModalStore` — Plan 1/2 에서 정의된 것 변경 없이 사용.
- [x] TBD/생략 없음.
