# Newtion Meetings + BlockNote Implementation Plan (Plan 2 / 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan 1의 빈 AppShell 위에 회의록 도메인을 풀로 얹는다 — 시드된 회의록 5개가 [/meetings](src/routes/MeetingsListPage.tsx)에 월별 그룹으로 표시되고, 카드를 클릭하면 [/meetings/:id](src/routes/MeetingDetailPage.tsx)에서 BlockNote 에디터가 열려 1초 debounce 자동 저장(낙관적 업데이트, 2회 자동 재시도, 인디케이터)으로 본문이 보존된다.

**Architecture:** 서버 데이터는 4개의 TanStack Query 훅 묶음으로 캡슐화한다 — [`usePages`](src/hooks/usePages.ts)/[`usePageDetail`](src/hooks/usePageDetail.ts)는 fetch, [`usePageMutations`](src/hooks/usePageMutations.ts)는 회의록 생성/제목수정/삭제, [`useBlocks`](src/hooks/useBlocks.ts)는 블록 트리 read, [`useAutosaveBlocks`](src/hooks/useAutosaveBlocks.ts)는 BlockNote 변경을 디바운스→델타 계산→배치 mutate한다. BlockNote의 안정적인 client-generated 블록 ID를 백엔드 `_id`로 그대로 사용하므로 mock의 POST 핸들러는 client `_id`를 받아들이도록 확장한다 (실제 백엔드도 동일하게 맞춤). UI 컴포넌트는 도메인 폴더([`components/meetings`](src/components/meetings)/[`components/editor`](src/components/editor))로 분할하고, 에디터는 동적 import + Suspense로 초기 번들에서 분리한다.

**자동 저장 파이프라인:** BlockNote `onChange` → 1000ms debounce → `useMutation`에 현재 블록 트리 전달 → 마지막 저장 스냅샷과 ID 단위 비교(`computeBlockDelta`) → toCreate(POST batch) + toUpdate(PATCH 각각) + toDelete(DELETE 각각) 병렬 실행 → 성공 시 스냅샷 갱신 + 인디케이터 "저장됨 ✓", 실패 시 TanStack Query가 1초 간격으로 2회 재시도, 그래도 실패하면 인디케이터 "저장 실패" + Toast 수동 재시도. 디바운스 윈도우 내 추가 입력은 타이머만 리셋, 네트워크 inflight 중 도착한 입력은 응답 후 한 번 더 mutate.

**ID 정책:** BlockNote는 모든 블록에 자체 UUID를 발급한다. mock의 `POST /blocks` / `POST /blocks/batch` 핸들러는 본문 `_id`가 있으면 그것을, 없으면 `newId("bl")`을 사용한다 — 이 한 줄 변경으로 editor↔backend ID 매핑 레이어가 불필요해지고, [`computeBlockDelta`](src/lib/computeBlockDelta.ts)가 단순 set diff로 떨어진다. 백엔드도 같은 정책으로 맞춰질 예정 (BACKEND_REQUESTS.md에는 별도 항목 없음 — 일반적인 REST 관행이라 호환 가능).

**BlockNote 타입 매핑:** BlockNote 기본 스키마는 `paragraph`, `heading`(props.level), `bulletListItem`, `numberedListItem`, `checkListItem`, `quote`, `codeBlock`, `image`, `file` 등을 사용한다. 우리 백엔드 [`BlockType`](src/types/block.ts)은 `paragraph`, `heading_1/2/3`, `bulleted_list_item`, `numbered_list_item`, `to_do`, `quote`, `code`, `toggle`, `image`, `file`, `divider`. 매핑 테이블 두 개(`blockNoteToBackendType`, `backendToBlockNoteType`)를 [`blockAdapter.ts`](src/lib/blockAdapter.ts)에 추가하고, heading은 `props.level` ↔ 접미사 1/2/3로 정규화한다. 라운드트립 테스트가 매핑을 보호한다.

**Tech Stack (Plan 2 추가):** `@blocknote/core ^0.40`, `@blocknote/react ^0.40`, `@blocknote/mantine ^0.40` (Mantine UI variant — shadcn과 충돌 없는 격리된 스타일링 제공). 기존 React 18 / TanStack Query v5 / Vitest + RTL 그대로 사용.

**Plan 2 산출물:**
- `npm run dev` → [/meetings](src/routes/MeetingsListPage.tsx)가 월별 섹션 + 카드 그리드로 시드 회의록 5개 표시.
- `+ 새 회의록` → POST /pages → `/meetings/:newId`로 navigate → 빈 BlockNote 에디터.
- 본문 타이핑 → 1초 후 자동 저장, 헤더 우측에 "저장 중..." → "저장됨 ✓" 인디케이터.
- 제목 input 수정 → 500ms debounce PATCH /pages/:id.
- 새로고침 후 본문/제목 그대로 복원.
- `npm test` → 신규 hook 통합 테스트(usePages/useAutosaveBlocks/usePageMutations) + 신규 lib 유닛 테스트(`computeBlockDelta`, `debounce`, `groupMeetingsByMonth`, `formatMeetingDate`, `extractBlockPreview`) 모두 통과 + 기존 테스트(useWorkspace, blockAdapter, themeStore, cn, App boot) 회귀 없음.

**Plan 2 비포함 (다음 plan):**
- 프로젝트 칸반 / 모달 / 드래그 (Plan 3).
- @멘션 메뉴 / 역인덱스 / 관련 회의록 (Plan 4).
- ⌘K 글로벌 검색 / 즐겨찾기 / 최근 항목 / 홈 Bento (Plan 4).
- 파일/이미지 업로드 (Plan 4 또는 별도 plan — BlockNote의 image/file 블록은 placeholder만).
- vitest-axe a11y 자동 검증 (Plan 4 폴리싱).

---

## File Structure

이 plan에서 생성/수정하는 파일:

```
newtion/
├─ package.json                                  (수정: BlockNote deps)
└─ src/
   ├─ App.tsx                                    (변경 없음)
   ├─ main.tsx                                   (변경 없음)
   │
   ├─ mocks/
   │  ├─ browser.ts                              (수정: empty: false)
   │  ├─ db/seed.ts                              (수정: 회의록당 블록 3-4개 생성)
   │  └─ handlers/blocks.ts                      (수정: POST 핸들러가 client _id 수용)
   │
   ├─ lib/
   │  ├─ blockAdapter.ts                         (수정: BlockNote ↔ Backend type 매핑)
   │  ├─ blockAdapter.test.ts                    (수정: 매핑 테스트 추가)
   │  ├─ debounce.ts                             (NEW)
   │  ├─ debounce.test.ts                        (NEW)
   │  ├─ computeBlockDelta.ts                    (NEW)
   │  ├─ computeBlockDelta.test.ts               (NEW)
   │  ├─ formatMeetingDate.ts                    (NEW)
   │  ├─ formatMeetingDate.test.ts               (NEW)
   │  ├─ extractBlockPreview.ts                  (NEW)
   │  ├─ extractBlockPreview.test.ts             (NEW)
   │  ├─ groupMeetingsByMonth.ts                 (NEW)
   │  └─ groupMeetingsByMonth.test.ts            (NEW)
   │
   ├─ hooks/
   │  ├─ usePages.ts                             (NEW)
   │  ├─ usePages.test.tsx                       (NEW)
   │  ├─ usePageDetail.ts                        (NEW)
   │  ├─ usePageDetail.test.tsx                  (NEW)
   │  ├─ usePageMutations.ts                     (NEW)
   │  ├─ usePageMutations.test.tsx               (NEW)
   │  ├─ useBlocks.ts                            (NEW)
   │  ├─ useAutosaveBlocks.ts                    (NEW)
   │  └─ useAutosaveBlocks.test.tsx              (NEW)
   │
   ├─ components/
   │  ├─ meetings/                               (NEW 디렉토리)
   │  │  ├─ MeetingCard.tsx
   │  │  ├─ MeetingCard.test.tsx
   │  │  ├─ MeetingsGrid.tsx
   │  │  ├─ MeetingsListSkeleton.tsx
   │  │  ├─ MeetingsListEmpty.tsx
   │  │  └─ MeetingHeader.tsx
   │  └─ editor/                                 (NEW 디렉토리)
   │     ├─ BlockEditor.tsx                      (lazy import 대상)
   │     ├─ blockNoteTheme.ts                    (Mantine theme 매핑)
   │     └─ SaveIndicator.tsx
   │
   └─ routes/
      ├─ MeetingsListPage.tsx                    (수정: placeholder → 풀 구현)
      └─ MeetingDetailPage.tsx                   (수정: placeholder → 풀 구현)
```

**컴포넌트 책임 경계:**
- `meetings/` 폴더는 회의록 도메인 표현 컴포넌트만 (presentational + thin container).
- `editor/` 폴더는 BlockNote integration 전용 — 에디터 자체와 인디케이터, 테마 매핑까지. 다른 라우트(프로젝트 모달)에서도 재사용된다.
- `hooks/` 폴더의 훅들은 모두 단일 책임 — `usePages`는 read만, `usePageMutations`는 write만, `useAutosaveBlocks`는 BlockNote 전용 디바운스 자동 저장.
- `lib/` 헬퍼들은 React-free 순수 함수 — 모두 Vitest 단일 파일 단위 테스트.

각 파일은 100~150라인 이하 유지를 목표로 한다. 어떤 컴포넌트가 그 이상으로 커지면 sub-task로 분리하라는 신호.

---

## Task 1: MSW seed를 populated로 전환 + POST 핸들러가 client `_id` 수용

**Files:**
- Modify: [src/mocks/browser.ts](src/mocks/browser.ts)
- Modify: [src/mocks/handlers/blocks.ts](src/mocks/handlers/blocks.ts)
- Modify: [src/mocks/handlers/pages.ts](src/mocks/handlers/pages.ts)

**Why first:** Plan 2의 모든 후속 작업은 시드된 데이터를 가정한다 (`usePages` 테스트, MeetingCard 렌더링 등). 동시에 BlockNote가 client-side block ID를 발급하므로 POST 핸들러도 그 ID를 보존해야 자동 저장 델타가 단순해진다. 두 변경은 같은 mock 모듈에 있고 서로 의존하지 않으므로 한 task에 묶음.

- [ ] **Step 1: 실패하는 테스트부터 — `_id` 수용 + 시드 가시성**

[src/mocks/handlers/blocks.test.ts](src/mocks/handlers/blocks.test.ts) 신규 생성:

```ts
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { createBlock, createBlocksBatch } from "@/api/blocks";
import { createPage } from "@/api/pages";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => resetDb());

describe("blocks handler — client-supplied _id", () => {
  it("preserves _id when POST /blocks body provides it", async () => {
    const created = await createBlock({
      _id: "client-block-1",
      pageId: "pg_x",
      type: "paragraph",
      content: { props: {}, inline: [] },
      order: 0,
    } as Parameters<typeof createBlock>[0] & { _id: string });
    expect(created._id).toBe("client-block-1");
    expect(db.blocks.find((b) => b._id === "client-block-1")).toBeDefined();
  });

  it("preserves _id for every item in POST /blocks/batch", async () => {
    const created = await createBlocksBatch([
      { _id: "a", pageId: "pg_x", type: "paragraph", content: {}, order: 0 },
      { _id: "b", pageId: "pg_x", type: "paragraph", content: {}, order: 1 },
    ] as unknown as Parameters<typeof createBlocksBatch>[0]);
    expect(created.map((b) => b._id)).toEqual(["a", "b"]);
  });

  it("falls back to generated _id when none provided", async () => {
    const created = await createBlock({
      pageId: "pg_x",
      type: "paragraph",
      content: {},
      order: 0,
    });
    expect(created._id).toMatch(/^bl_/);
  });
});
```

이 test는 현재 `_id` 필드가 `CreateBlockInput`에 없어서 typescript-cast로 강제 통과한다 (Step 4에서 `_id?: string` 추가). 테스트 자체는 빌드에 통과해야 한다 — `as Parameters<typeof createBlock>[0] & { _id: string }` 캐스팅이 그 역할.

- [ ] **Step 2: 테스트가 실패함을 확인**

```bash
npx vitest run src/mocks/handlers/blocks.test.ts
```

Expected: 첫 두 테스트 FAIL — 실제로 mock이 `newId("bl")`로 새 ID를 생성해서 `created._id !== "client-block-1"`. 세 번째는 PASS.

- [ ] **Step 3: blocks 핸들러를 client `_id` 수용으로 수정**

[src/mocks/handlers/blocks.ts](src/mocks/handlers/blocks.ts) 두 핸들러:

```ts
http.post("*/blocks/batch", async ({ request }) => {
    const { items } = (await request.json()) as { items: Partial<Block>[] };
    const created: Block[] = items.map((item, i) => ({
      _id: item._id ?? newId("bl"),
      pageId: item.pageId!,
      parentBlockId: item.parentBlockId ?? null,
      type: item.type!,
      content: item.content ?? {},
      order: item.order ?? i,
      createdBy: item.createdBy,
      updatedBy: item.updatedBy,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    }));
    db.blocks.push(...created);
    return HttpResponse.json(created);
  }),

  http.post("*/blocks", async ({ request }) => {
    const body = (await request.json()) as Partial<Block>;
    const b: Block = {
      _id: body._id ?? newId("bl"),
      pageId: body.pageId!,
      parentBlockId: body.parentBlockId ?? null,
      type: body.type!,
      content: body.content ?? {},
      order: body.order ?? 0,
      createdBy: body.createdBy,
      updatedBy: body.updatedBy,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    };
    db.blocks.push(b);
    return HttpResponse.json(b);
  }),
```

- [ ] **Step 4: API 어댑터 타입에 선택적 `_id` 노출**

[src/api/blocks.ts](src/api/blocks.ts) `CreateBlockInput`:

```ts
export interface CreateBlockInput {
  _id?: string;
  pageId: string;
  parentBlockId?: string | null;
  type: BlockType;
  content: Record<string, unknown>;
  order: number;
  createdBy?: string;
  updatedBy?: string;
}
```

(다른 함수 시그니처는 변경 없음.) Pages 어댑터는 기존 `CreatePageInput`에 `_id`를 추가하지 않는다 — 페이지 생성은 서버가 ID를 만들도록 두는 일반 흐름.

- [ ] **Step 5: blocks 테스트 통과 확인**

```bash
npx vitest run src/mocks/handlers/blocks.test.ts
```

Expected: 3개 모두 PASS.

- [ ] **Step 6: `seed({ empty: false })`로 전환**

[src/mocks/browser.ts](src/mocks/browser.ts):

```ts
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { seed } from "./db/seed";

export const worker = setupWorker(...handlers);

export async function startMockServiceWorker(): Promise<void> {
  // Plan 2부터 populated seed: 회의록 5 + 프로젝트 8 + 회의록당 블록 트리.
  // 기존 워크스페이스가 localStorage에 캐시되어 있어도 부트스트랩 훅이
  // sidebar tree에서 두 루트 폴더 ID를 새로 derive한다 (useWorkspace 참고).
  seed({ empty: false });
  await worker.start({ onUnhandledRequest: "bypass" });
}
```

> `seed`는 `resetDb()`를 호출하므로 hot reload 시에도 깔끔. 이전 plan의 `empty: true` 모드는 더 이상 사용하지 않으므로 별도 분기/플래그 불필요 — 단순히 옵션을 변경.

- [ ] **Step 7: 전체 회귀 테스트**

```bash
npx vitest run
```

Expected: 모든 기존 테스트 PASS. 기존 [src/App.test.tsx](src/App.test.tsx)는 `resetDb()` + node `setupServer` 기반으로 작동하므로 (브라우저 워커의 `seed()` 호출과 무관), Task 1의 `mocks/browser.ts` 변경에 영향받지 않는다. 기존 [src/hooks/useWorkspace.test.tsx](src/hooks/useWorkspace.test.tsx)도 마찬가지. 만약 새로운 boot 시드 가정에 의존하는 테스트가 추가되어 있다면 (`grep -rl "seed({" src/`) 그 케이스에 한해 `seed({ empty: true })` 명시.

- [ ] **Step 8: 커밋**

```bash
git add src/mocks/browser.ts src/mocks/handlers/blocks.ts src/mocks/handlers/blocks.test.ts src/api/blocks.ts
git commit -m "feat(mocks): seed populated by default + accept client block _id"
```

---

## Task 2: BlockNote 의존성 설치 + 타입 sanity check

**Files:**
- Modify: `package.json` (npm install이 자동 갱신)

- [ ] **Step 1: BlockNote 패키지 설치**

```bash
cd /Users/baeg-yujin/Desktop/project/newtion
npm install @blocknote/core@^0.40 @blocknote/react@^0.40 @blocknote/mantine@^0.40
```

> Mantine variant를 선택하는 이유: BlockNote는 (a) Mantine, (b) shadcn, (c) Ariakit의 세 UI 변형을 제공한다. shadcn variant는 우리 디자인 토큰과 부분적으로만 충돌(예: `--accent`, `--popover`)하지만 BlockNote가 자체 shadcn 컴포넌트를 번들하므로 우리 [components/ui/](src/components/ui/) 와 중복 설치된다. Mantine variant는 자체 격리된 CSS namespace를 가져 우리 토큰과 깔끔히 분리되며, 외관은 [`blockNoteTheme.ts`](src/components/editor/blockNoteTheme.ts)에서 우리 디자인 토큰으로 덮어쓴다 (Task 9). 외부 Mantine UI를 도입하는 것이 아니라 BlockNote가 내부적으로 이미 번들한 것을 활용하는 것이라 추가 페이로드는 BlockNote 자체의 일부.

- [ ] **Step 2: 타입 import sanity check**

[src/components/editor/blockNoteTheme.ts](src/components/editor/blockNoteTheme.ts) 임시 stub 작성 (Task 9에서 완성):

```ts
// Plan 2 Task 9에서 채워짐. 이 파일은 import 경로 검증 + tsc 통과 목적.
export type {} from "@blocknote/core";
export type {} from "@blocknote/react";
export type {} from "@blocknote/mantine";
```

```bash
npm run build
```

Expected: 빌드 성공. `dist/` 생성. BlockNote 패키지 import 경로가 모두 valid.

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json src/components/editor/blockNoteTheme.ts
git commit -m "feat(deps): install BlockNote (core/react/mantine)"
```

---

## Task 3: blockAdapter 확장 — BlockNote ↔ Backend 타입 매핑 (TDD)

**Files:**
- Modify: [src/lib/blockAdapter.ts](src/lib/blockAdapter.ts)
- Modify: [src/lib/blockAdapter.test.ts](src/lib/blockAdapter.test.ts)

**Why:** Plan 1의 어댑터는 `BlockNoteLikeBlock.type`을 우리 백엔드 `BlockType`으로 직접 받았다. 하지만 BlockNote 실제 스키마는 `bulletListItem`/`numberedListItem`/`checkListItem`/`heading` (level prop 사용) 등 다른 이름을 사용한다. 매핑 테이블을 어댑터에 추가해야 BlockNote → 백엔드 → BlockNote 라운드트립이 실제 BlockNote 문서로도 통한다.

- [ ] **Step 1: 실패하는 매핑 테스트 작성**

[src/lib/blockAdapter.test.ts](src/lib/blockAdapter.test.ts) 끝에 추가:

```ts
import {
  blockNoteTypeToBackend,
  backendTypeToBlockNote,
} from "./blockAdapter";

describe("blockAdapter — type mapping", () => {
  it("maps BlockNote types to backend BlockType", () => {
    expect(blockNoteTypeToBackend("paragraph", {})).toEqual({
      type: "paragraph",
      props: {},
    });
    expect(blockNoteTypeToBackend("bulletListItem", {})).toEqual({
      type: "bulleted_list_item",
      props: {},
    });
    expect(blockNoteTypeToBackend("numberedListItem", {})).toEqual({
      type: "numbered_list_item",
      props: {},
    });
    expect(blockNoteTypeToBackend("checkListItem", { checked: true })).toEqual({
      type: "to_do",
      props: { checked: true },
    });
    expect(blockNoteTypeToBackend("codeBlock", { language: "ts" })).toEqual({
      type: "code",
      props: { language: "ts" },
    });
    expect(blockNoteTypeToBackend("quote", {})).toEqual({
      type: "quote",
      props: {},
    });
    expect(blockNoteTypeToBackend("image", {})).toEqual({
      type: "image",
      props: {},
    });
    expect(blockNoteTypeToBackend("file", {})).toEqual({
      type: "file",
      props: {},
    });
  });

  it("maps heading levels to heading_1/2/3", () => {
    expect(blockNoteTypeToBackend("heading", { level: 1 })).toEqual({
      type: "heading_1",
      props: { level: 1 },
    });
    expect(blockNoteTypeToBackend("heading", { level: 2 })).toEqual({
      type: "heading_2",
      props: { level: 2 },
    });
    expect(blockNoteTypeToBackend("heading", { level: 3 })).toEqual({
      type: "heading_3",
      props: { level: 3 },
    });
    expect(blockNoteTypeToBackend("heading", {})).toEqual({
      type: "heading_1",
      props: { level: 1 },
    });
  });

  it("inverse mapping: backend BlockType to BlockNote type", () => {
    expect(backendTypeToBlockNote("paragraph", {})).toEqual({
      type: "paragraph",
      props: {},
    });
    expect(backendTypeToBlockNote("bulleted_list_item", {})).toEqual({
      type: "bulletListItem",
      props: {},
    });
    expect(backendTypeToBlockNote("to_do", { checked: false })).toEqual({
      type: "checkListItem",
      props: { checked: false },
    });
    expect(backendTypeToBlockNote("code", { language: "ts" })).toEqual({
      type: "codeBlock",
      props: { language: "ts" },
    });
    expect(backendTypeToBlockNote("heading_1", { level: 1 })).toEqual({
      type: "heading",
      props: { level: 1 },
    });
    expect(backendTypeToBlockNote("heading_2", {})).toEqual({
      type: "heading",
      props: { level: 2 },
    });
    expect(backendTypeToBlockNote("heading_3", {})).toEqual({
      type: "heading",
      props: { level: 3 },
    });
  });

  it("roundtrips a realistic BlockNote document", () => {
    const blockNoteDoc: BlockNoteLikeBlock[] = [
      {
        id: "h1",
        type: "heading",
        props: { level: 1 },
        content: [{ type: "text", text: "Title", styles: {} }],
        children: [],
      },
      {
        id: "p1",
        type: "paragraph",
        props: {},
        content: [{ type: "text", text: "Body", styles: {} }],
        children: [],
      },
      {
        id: "todo1",
        type: "checkListItem",
        props: { checked: true },
        content: [{ type: "text", text: "Done", styles: {} }],
        children: [],
      },
    ];
    const backend = blockNoteToBackend(blockNoteDoc, "page-1");
    expect(backend[0].type).toBe("heading_1");
    expect(backend[2].type).toBe("to_do");
    const roundtrip = backendToBlockNote(backend);
    expect(roundtrip).toEqual(blockNoteDoc);
  });
});
```

또한 기존 `BlockNoteLikeBlock.type` 정의가 backend `BlockType`이 아닌 BlockNote string union임을 반영하도록 기존 테스트의 `sample` 객체에서 `"heading_1"`을 `"heading"` (props.level: 1)로 바꿔 새 의미와 일치시킨다 — Step 3 참조.

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/lib/blockAdapter.test.ts
```

Expected: 새 4개 케이스 FAIL ("blockNoteTypeToBackend is not a function" 등).

- [ ] **Step 3: 어댑터 매핑 + 타입 변경 구현**

[src/lib/blockAdapter.ts](src/lib/blockAdapter.ts) 전체 재작성:

```ts
import type { Block, BlockType } from "@/types/block";

export type BlockNoteType =
  | "paragraph"
  | "heading"
  | "bulletListItem"
  | "numberedListItem"
  | "checkListItem"
  | "quote"
  | "codeBlock"
  | "image"
  | "file";

export interface BlockNoteInlineContent {
  type: "text" | "link";
  text?: string;
  href?: string;
  styles?: Record<string, unknown>;
  content?: BlockNoteInlineContent[];
}

export interface BlockNoteLikeBlock {
  id: string;
  type: BlockNoteType;
  props: Record<string, unknown>;
  content: BlockNoteInlineContent[];
  children: BlockNoteLikeBlock[];
}

export type BlockInput = Pick<
  Block,
  "_id" | "pageId" | "parentBlockId" | "type" | "content" | "order"
>;

interface MappedType {
  type: BlockType;
  props: Record<string, unknown>;
}

interface MappedBlockNoteType {
  type: BlockNoteType;
  props: Record<string, unknown>;
}

export function blockNoteTypeToBackend(
  type: BlockNoteType,
  props: Record<string, unknown>,
): MappedType {
  switch (type) {
    case "paragraph":
      return { type: "paragraph", props };
    case "heading": {
      const level = (props.level as number) ?? 1;
      const clamped = level === 2 ? "heading_2" : level === 3 ? "heading_3" : "heading_1";
      return { type: clamped, props: { ...props, level: level === 2 ? 2 : level === 3 ? 3 : 1 } };
    }
    case "bulletListItem":
      return { type: "bulleted_list_item", props };
    case "numberedListItem":
      return { type: "numbered_list_item", props };
    case "checkListItem":
      return { type: "to_do", props };
    case "quote":
      return { type: "quote", props };
    case "codeBlock":
      return { type: "code", props };
    case "image":
      return { type: "image", props };
    case "file":
      return { type: "file", props };
  }
}

export function backendTypeToBlockNote(
  type: BlockType,
  props: Record<string, unknown>,
): MappedBlockNoteType {
  switch (type) {
    case "paragraph":
      return { type: "paragraph", props };
    case "heading_1":
      return { type: "heading", props: { ...props, level: 1 } };
    case "heading_2":
      return { type: "heading", props: { ...props, level: 2 } };
    case "heading_3":
      return { type: "heading", props: { ...props, level: 3 } };
    case "bulleted_list_item":
      return { type: "bulletListItem", props };
    case "numbered_list_item":
      return { type: "numberedListItem", props };
    case "to_do":
      return { type: "checkListItem", props };
    case "quote":
      return { type: "quote", props };
    case "code":
      return { type: "codeBlock", props };
    case "image":
      return { type: "image", props };
    case "file":
      return { type: "file", props };
    case "toggle":
      // BlockNote 기본 스키마에는 toggle이 없음 — paragraph로 다운그레이드.
      // 백엔드는 보존하지만 에디터에서는 paragraph로 표시.
      return { type: "paragraph", props };
    case "divider":
      // BlockNote 기본 스키마에는 divider 정식 타입이 없음 — paragraph로 다운그레이드.
      return { type: "paragraph", props };
  }
}

export function blockNoteToBackend(
  blocks: BlockNoteLikeBlock[],
  pageId: string,
  parentBlockId: string | null = null,
): BlockInput[] {
  const out: BlockInput[] = [];
  blocks.forEach((b, index) => {
    const mapped = blockNoteTypeToBackend(b.type, b.props);
    out.push({
      _id: b.id,
      pageId,
      parentBlockId,
      type: mapped.type,
      content: { props: mapped.props, inline: b.content },
      order: index,
    });
    if (b.children.length > 0) {
      out.push(...blockNoteToBackend(b.children, pageId, b.id));
    }
  });
  return out;
}

export function backendToBlockNote(
  blocks: Pick<Block, "_id" | "parentBlockId" | "type" | "content" | "order">[],
): BlockNoteLikeBlock[] {
  const byParent = new Map<string | null, typeof blocks>();
  blocks.forEach((b) => {
    const arr = byParent.get(b.parentBlockId) ?? [];
    arr.push(b);
    byParent.set(b.parentBlockId, arr);
  });

  const build = (parentId: string | null): BlockNoteLikeBlock[] => {
    const list = (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.order - b.order);
    return list.map((b) => {
      const c = b.content as { props?: Record<string, unknown>; inline?: BlockNoteInlineContent[] };
      const mapped = backendTypeToBlockNote(b.type, c.props ?? {});
      return {
        id: b._id,
        type: mapped.type,
        props: mapped.props,
        content: c.inline ?? [],
        children: build(b._id),
      };
    });
  };

  return build(null);
}
```

- [ ] **Step 4: 기존 라운드트립 테스트의 sample 데이터를 BlockNote 의미로 갱신**

[src/lib/blockAdapter.test.ts](src/lib/blockAdapter.test.ts) 상단의 `sample`:

```ts
const sample: BlockNoteLikeBlock[] = [
  {
    id: "b1",
    type: "heading",
    props: { level: 1 },
    content: [{ type: "text", text: "Title", styles: {} }],
    children: [],
  },
  {
    id: "b2",
    type: "paragraph",
    props: {},
    content: [{ type: "text", text: "Hello world", styles: {} }],
    children: [
      {
        id: "b2c1",
        type: "bulletListItem",
        props: {},
        content: [{ type: "text", text: "child", styles: {} }],
        children: [],
      },
    ],
  },
];
```

기존의 "flattens children with parentBlockId and order" 테스트도 새 매핑에 맞게 — `b1.type`이 백엔드에서는 `heading_1`로, `b2c1.type`이 `bulleted_list_item`으로 떨어진다. `toMatchObject({ _id: "b1", ... })` 는 그대로 통과 (type 검증 안 함). 라운드트립 테스트는 그대로 통과해야 한다.

- [ ] **Step 5: 모든 어댑터 테스트 통과 확인**

```bash
npx vitest run src/lib/blockAdapter.test.ts
```

Expected: 모든 케이스 PASS (기존 3개 + 신규 4개).

- [ ] **Step 6: 커밋**

```bash
git add src/lib/blockAdapter.ts src/lib/blockAdapter.test.ts
git commit -m "feat(adapter): map BlockNote types <-> backend BlockType (heading levels, list items, code, todo)"
```

---

## Task 4: 시드에 회의록 블록 트리 추가

**Files:**
- Modify: [src/mocks/db/seed.ts](src/mocks/db/seed.ts)

**Why:** Plan 2의 회의록 카드는 본문 미리보기 2줄을 보여주고, 회의록 상세는 블록을 BlockNote에 채운다. 시드된 5개 회의록 페이지 각각에 3-4개의 블록(heading + paragraph + bullet)이 필요. 또한 spec 5-4의 "각 페이지마다 BlockNote 콘텐츠를 백엔드 Block 트리로 변환한 시드 (어댑터 양방향 검증)" 요구사항을 충족.

- [ ] **Step 1: 시드 헬퍼 작성 + 호출 추가**

[src/mocks/db/seed.ts](src/mocks/db/seed.ts) 회의록 루프 직후에 블록 시드 추가. 회의록 페이지 ID를 캡처해야 하므로 루프 구조 수정:

```ts
import { db, newId, nowIso, resetDb } from "./store";
import type { Page } from "@/types/page";
import type { Block } from "@/types/block";

interface SeedOptions {
  empty?: boolean;
}

export function seed(options: SeedOptions = {}): void {
  resetDb();
  if (options.empty) return;

  const wsId = newId("ws");
  db.workspaces.push({
    _id: wsId,
    name: "Newtion",
    icon: "N",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    removedAt: null,
  });

  const meetingsRoot = newId("pg_meetings_root");
  const projectsRoot = newId("pg_projects_root");

  db.pages.push(makeRoot(meetingsRoot, wsId, "회의록", "📝", "meetings_root"));
  db.pages.push(makeRoot(projectsRoot, wsId, "프로젝트", "📋", "projects_root"));

  const projectIds: string[] = [];
  const projectStatus: Array<"planned" | "in_progress" | "done"> = [
    "planned", "planned", "planned",
    "in_progress", "in_progress", "in_progress",
    "done", "done",
  ];
  projectStatus.forEach((status, i) => {
    const id = newId("pg_project");
    projectIds.push(id);
    db.pages.push({
      _id: id,
      workspaceId: wsId,
      parentPageId: projectsRoot,
      title: `프로젝트 ${i + 1}`,
      emoji: status === "done" ? "✅" : status === "in_progress" ? "🔥" : "🆕",
      order: i,
      isArchived: false,
      isPublished: false,
      properties: {
        type: "project",
        status,
        progress: status === "in_progress" ? 30 + i * 15 : status === "done" ? 100 : 0,
        tags: i % 2 === 0 ? ["product"] : ["infra"],
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    });
  });

  for (let i = 0; i < 5; i += 1) {
    const meetingId = newId("pg_meeting");
    const dateStr = `2026-04-${String(20 + i).padStart(2, "0")}`;
    const mentioned = i < 2 ? [projectIds[3 + i]] : [];
    db.pages.push({
      _id: meetingId,
      workspaceId: wsId,
      parentPageId: meetingsRoot,
      title: `${dateStr} 위클리`,
      emoji: "📝",
      order: i,
      isArchived: false,
      isPublished: false,
      properties: {
        type: "meeting",
        date: dateStr,
        mentionedPageIds: mentioned,
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    });
    seedMeetingBlocks(meetingId, dateStr);
  }
}

function seedMeetingBlocks(pageId: string, dateStr: string): void {
  const items: Block[] = [
    {
      _id: newId("bl"),
      pageId,
      parentBlockId: null,
      type: "heading_2",
      content: {
        props: { level: 2 },
        inline: [{ type: "text", text: "안건", styles: {} }],
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
          { type: "text", text: `${dateStr} 위클리 회의 노트입니다.`, styles: {} },
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
      type: "bulleted_list_item",
      content: {
        props: {},
        inline: [{ type: "text", text: "지난주 진행 정리", styles: {} }],
      },
      order: 2,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    },
    {
      _id: newId("bl"),
      pageId,
      parentBlockId: null,
      type: "bulleted_list_item",
      content: {
        props: {},
        inline: [{ type: "text", text: "이번주 우선순위", styles: {} }],
      },
      order: 3,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    },
  ];
  db.blocks.push(...items);
}

function makeRoot(
  id: string,
  workspaceId: string,
  title: string,
  emoji: string,
  role: "meetings_root" | "projects_root",
): Page {
  return {
    _id: id,
    workspaceId,
    parentPageId: null,
    title,
    emoji,
    order: 0,
    isArchived: false,
    isPublished: false,
    properties: { role },
    createdAt: nowIso(),
    updatedAt: nowIso(),
    removedAt: null,
  };
}
```

- [ ] **Step 2: 시드 sanity 테스트 추가**

[src/mocks/db/seed.test.ts](src/mocks/db/seed.test.ts) 신규 작성:

```ts
import { seed } from "./seed";
import { db } from "./store";

describe("seed", () => {
  it("empty: true leaves db blank", () => {
    seed({ empty: true });
    expect(db.workspaces).toHaveLength(0);
    expect(db.pages).toHaveLength(0);
    expect(db.blocks).toHaveLength(0);
  });

  it("populated: 1 workspace, 2 root folders, 5 meetings, 8 projects", () => {
    seed();
    expect(db.workspaces).toHaveLength(1);
    const meetings = db.pages.filter((p) => p.properties.type === "meeting");
    const projects = db.pages.filter((p) => p.properties.type === "project");
    expect(meetings).toHaveLength(5);
    expect(projects).toHaveLength(8);
  });

  it("each meeting has at least 3 blocks at root level", () => {
    seed();
    const meetings = db.pages.filter((p) => p.properties.type === "meeting");
    meetings.forEach((m) => {
      const blocks = db.blocks.filter(
        (b) => b.pageId === m._id && b.parentBlockId === null,
      );
      expect(blocks.length).toBeGreaterThanOrEqual(3);
    });
  });
});
```

- [ ] **Step 3: 테스트 실행 + 통과 확인**

```bash
npx vitest run src/mocks/db/seed.test.ts
```

Expected: 3개 PASS.

- [ ] **Step 4: 회귀 테스트 — 전체 통과 확인**

```bash
npx vitest run
```

Expected: 모든 테스트 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/mocks/db/seed.ts src/mocks/db/seed.test.ts
git commit -m "feat(seed): meeting block trees (heading + paragraph + bullets) for previews"
```

---

## Task 5: `usePages` 훅 (TDD)

**Files:**
- Create: [src/hooks/usePages.ts](src/hooks/usePages.ts)
- Create: [src/hooks/usePages.test.tsx](src/hooks/usePages.test.tsx)

**Why:** 회의록 리스트 페이지가 부모 페이지 ID(meetings root) 아래의 페이지들을 fetch해야 한다. 동일 패턴이 프로젝트 칸반(Plan 3)에서도 재사용되므로 일반화된 훅으로 분리.

- [ ] **Step 1: 실패하는 테스트 작성**

[src/hooks/usePages.test.tsx](src/hooks/usePages.test.tsx):

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { db } from "@/mocks/db/store";
import { usePages } from "./usePages";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  seed();
});

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePages", () => {
  it("returns pages under the given parent (meetings root)", async () => {
    const ws = db.workspaces[0];
    const meetingsRoot = db.pages.find(
      (p) => p.properties.role === "meetings_root",
    )!;
    const { result } = renderHook(
      () =>
        usePages({
          workspaceId: ws._id,
          parentPageId: meetingsRoot._id,
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(5);
    expect(result.current.data!.every((p) => p.properties.type === "meeting"))
      .toBe(true);
  });

  it("is disabled until workspaceId and parentPageId are provided", () => {
    const { result } = renderHook(
      () =>
        usePages({
          workspaceId: undefined,
          parentPageId: undefined,
        }),
      { wrapper: wrapper() },
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  it("supports mentionedPageId for reverse-index queries", async () => {
    const ws = db.workspaces[0];
    const projects = db.pages.filter((p) => p.properties.type === "project");
    // 시드 상 projects[3]은 첫 회의록의 mentionedPageIds[0]에 들어있음.
    const projectId = projects[3]._id;
    const { result } = renderHook(
      () =>
        usePages({
          workspaceId: ws._id,
          mentionedPageId: projectId,
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npx vitest run src/hooks/usePages.test.tsx
```

Expected: 모듈 미존재 에러로 FAIL.

- [ ] **Step 3: 훅 구현**

[src/hooks/usePages.ts](src/hooks/usePages.ts):

```ts
import { useQuery } from "@tanstack/react-query";
import { getPages } from "@/api/pages";

interface UsePagesParams {
  workspaceId: string | undefined;
  parentPageId?: string | null;
  mentionedPageId?: string;
  includeArchived?: boolean;
}

export function usePages(params: UsePagesParams) {
  const enabled =
    !!params.workspaceId &&
    (params.parentPageId !== undefined || params.mentionedPageId !== undefined);

  return useQuery({
    queryKey: [
      "pages",
      {
        workspaceId: params.workspaceId,
        parentPageId: params.parentPageId,
        mentionedPageId: params.mentionedPageId,
        includeArchived: params.includeArchived ?? false,
      },
    ],
    queryFn: () =>
      getPages({
        workspaceId: params.workspaceId!,
        parentPageId: params.parentPageId,
        mentionedPageId: params.mentionedPageId,
        includeArchived: params.includeArchived,
      }),
    enabled,
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/hooks/usePages.test.tsx
```

Expected: 3개 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/usePages.ts src/hooks/usePages.test.tsx
git commit -m "feat(hooks): usePages — list pages by parent or mention"
```

---

## Task 6: `usePageDetail` 훅 (TDD)

**Files:**
- Create: [src/hooks/usePageDetail.ts](src/hooks/usePageDetail.ts)
- Create: [src/hooks/usePageDetail.test.tsx](src/hooks/usePageDetail.test.tsx)

**Why:** 회의록 상세 페이지가 페이지 메타 + 블록 트리를 한 번에 가져와야 한다. 백엔드의 `GET /pages/:id/detail`은 이미 `{page, blocks, blockTree}`를 반환하므로 단일 훅으로 래핑.

- [ ] **Step 1: 실패하는 테스트 작성**

[src/hooks/usePageDetail.test.tsx](src/hooks/usePageDetail.test.tsx):

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { usePageDetail } from "./usePageDetail";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  seed();
});

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePageDetail", () => {
  it("returns page + blocks + tree for a meeting", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result } = renderHook(() => usePageDetail(meeting._id), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.page._id).toBe(meeting._id);
    expect(result.current.data!.blocks.length).toBeGreaterThanOrEqual(3);
    expect(result.current.data!.blockTree.length).toBeGreaterThanOrEqual(3);
  });

  it("is disabled when pageId is undefined", () => {
    const { result } = renderHook(() => usePageDetail(undefined), {
      wrapper: wrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run src/hooks/usePageDetail.test.tsx
```

Expected: 모듈 미존재 FAIL.

- [ ] **Step 3: 훅 구현**

[src/hooks/usePageDetail.ts](src/hooks/usePageDetail.ts):

```ts
import { useQuery } from "@tanstack/react-query";
import { getPageDetail } from "@/api/pages";

export function usePageDetail(pageId: string | undefined) {
  return useQuery({
    queryKey: ["page-detail", pageId],
    queryFn: () => getPageDetail(pageId!),
    enabled: !!pageId,
  });
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
npx vitest run src/hooks/usePageDetail.test.tsx
```

Expected: 2개 PASS.

```bash
git add src/hooks/usePageDetail.ts src/hooks/usePageDetail.test.tsx
git commit -m "feat(hooks): usePageDetail — page meta + block tree in one query"
```

---

## Task 7: `usePageMutations` 훅 (TDD)

**Files:**
- Create: [src/hooks/usePageMutations.ts](src/hooks/usePageMutations.ts)
- Create: [src/hooks/usePageMutations.test.tsx](src/hooks/usePageMutations.test.tsx)

**Why:** 회의록 생성/제목 수정/삭제 세 mutation을 한 모듈에 묶고, 성공 시 적절한 query를 invalidate한다. 제목 수정은 `usePageDetail` 캐시에 optimistic update 적용 (즉각 UI 반영).

- [ ] **Step 1: 실패하는 테스트 작성**

[src/hooks/usePageMutations.test.tsx](src/hooks/usePageMutations.test.tsx):

```tsx
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import {
  useCreatePage,
  useUpdatePage,
  useDeletePage,
} from "./usePageMutations";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  seed();
});

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useCreatePage", () => {
  it("creates a meeting under the meetings root and returns the new page", async () => {
    const ws = db.workspaces[0];
    const meetingsRoot = db.pages.find(
      (p) => p.properties.role === "meetings_root",
    )!;
    const { result } = renderHook(() => useCreatePage(), { wrapper: wrapper() });
    let created;
    await act(async () => {
      created = await result.current.mutateAsync({
        workspaceId: ws._id,
        parentPageId: meetingsRoot._id,
        title: "신규 회의록",
        properties: { type: "meeting", date: "2026-04-27" },
      });
    });
    expect(created!._id).toMatch(/^pg/);
    expect(created!.title).toBe("신규 회의록");
    expect(db.pages.find((p) => p._id === created!._id)).toBeDefined();
  });
});

describe("useUpdatePage", () => {
  it("PATCH updates title and persists", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result } = renderHook(() => useUpdatePage(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        pageId: meeting._id,
        input: { title: "수정된 제목" },
      });
    });
    expect(db.pages.find((p) => p._id === meeting._id)!.title).toBe(
      "수정된 제목",
    );
  });
});

describe("useDeletePage", () => {
  it("soft-deletes the page (removedAt set)", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result } = renderHook(() => useDeletePage(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync(meeting._id);
    });
    expect(db.pages.find((p) => p._id === meeting._id)!.removedAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run src/hooks/usePageMutations.test.tsx
```

Expected: 모듈 미존재 FAIL.

- [ ] **Step 3: 훅 구현**

[src/hooks/usePageMutations.ts](src/hooks/usePageMutations.ts):

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPage,
  updatePage,
  deletePage,
  type CreatePageInput,
  type UpdatePageInput,
} from "@/api/pages";
import type { Page } from "@/types/page";

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePageInput) => createPage(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}

interface UpdatePageVariables {
  pageId: string;
  input: UpdatePageInput;
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, input }: UpdatePageVariables) =>
      updatePage(pageId, input),
    onMutate: async ({ pageId, input }) => {
      await qc.cancelQueries({ queryKey: ["page-detail", pageId] });
      const previous = qc.getQueryData<{ page: Page }>([
        "page-detail",
        pageId,
      ]);
      if (previous) {
        qc.setQueryData(["page-detail", pageId], {
          ...previous,
          page: { ...previous.page, ...input },
        });
      }
      return { previous };
    },
    onError: (_error, { pageId }, context) => {
      if (context?.previous) {
        qc.setQueryData(["page-detail", pageId], context.previous);
      }
    },
    onSettled: (_data, _error, { pageId }) => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      qc.invalidateQueries({ queryKey: ["page-detail", pageId] });
    },
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => deletePage(pageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}
```

- [ ] **Step 4: 통과 확인**

```bash
npx vitest run src/hooks/usePageMutations.test.tsx
```

Expected: 3개 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/usePageMutations.ts src/hooks/usePageMutations.test.tsx
git commit -m "feat(hooks): usePageMutations — create/update (optimistic)/delete"
```

---

## Task 8: `useBlocks` 훅 (TDD)

**Files:**
- Create: [src/hooks/useBlocks.ts](src/hooks/useBlocks.ts)
- Create: [src/hooks/useBlocks.test.tsx](src/hooks/useBlocks.test.tsx)

**Why:** 자동 저장 훅이 "현재 백엔드에 저장된 블록 셋"을 알아야 델타를 계산한다. `usePageDetail`이 페이지 메타까지 같이 가져오는 데 비해, 자동 저장 컨텍스트에서는 블록만 필요하므로 별도 훅으로 분리.

- [ ] **Step 1: 실패하는 테스트**

[src/hooks/useBlocks.test.tsx](src/hooks/useBlocks.test.tsx):

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useBlocks } from "./useBlocks";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  seed();
});

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useBlocks", () => {
  it("returns blocks + tree for a page", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result } = renderHook(() => useBlocks(meeting._id), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.blocks.length).toBeGreaterThanOrEqual(3);
    expect(result.current.data!.tree.length).toBeGreaterThanOrEqual(3);
  });

  it("is disabled when pageId is undefined", () => {
    const { result } = renderHook(() => useBlocks(undefined), {
      wrapper: wrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run src/hooks/useBlocks.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: 훅 구현**

[src/hooks/useBlocks.ts](src/hooks/useBlocks.ts):

```ts
import { useQuery } from "@tanstack/react-query";
import { getBlockTree } from "@/api/blocks";

export function useBlocks(pageId: string | undefined) {
  return useQuery({
    queryKey: ["blocks", pageId],
    queryFn: () => getBlockTree(pageId!),
    enabled: !!pageId,
  });
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
npx vitest run src/hooks/useBlocks.test.tsx
```

```bash
git add src/hooks/useBlocks.ts src/hooks/useBlocks.test.tsx
git commit -m "feat(hooks): useBlocks — block tree query for autosave snapshots"
```

---

## Task 9: `lib/debounce.ts` (TDD)

**Files:**
- Create: [src/lib/debounce.ts](src/lib/debounce.ts)
- Create: [src/lib/debounce.test.ts](src/lib/debounce.test.ts)

**Why:** 자동 저장 hook이 1초 디바운스로 input 이벤트를 합치고, unmount 시 pending 타이머를 cancel해야 한다. `lodash.debounce`를 의존성에 추가할 만큼의 가치는 없고, 17줄짜리 함수로 충분.

- [ ] **Step 1: 테스트 작성**

[src/lib/debounce.test.ts](src/lib/debounce.test.ts):

```ts
import { vi } from "vitest";
import { debounce } from "./debounce";

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("delays calls until quiet period elapses", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("a");
    d("b");
    d("c");
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("c");
  });

  it("cancel() prevents pending invocation", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("a");
    d.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });

  it("flush() invokes pending immediately and clears the timer", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("a");
    d.flush();
    expect(fn).toHaveBeenCalledWith("a");
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("flush() with no pending call is a no-op", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d.flush();
    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run src/lib/debounce.test.ts
```

- [ ] **Step 3: 구현**

[src/lib/debounce.ts](src/lib/debounce.ts):

```ts
export interface Debounced<TArgs extends unknown[]> {
  (...args: TArgs): void;
  cancel: () => void;
  flush: () => void;
}

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  ms: number,
): Debounced<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: TArgs | null = null;

  const debounced = ((...args: TArgs) => {
    pendingArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const a = pendingArgs!;
      pendingArgs = null;
      fn(...a);
    }, ms);
  }) as Debounced<TArgs>;

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pendingArgs = null;
  };

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      const a = pendingArgs!;
      pendingArgs = null;
      fn(...a);
    }
  };

  return debounced;
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
npx vitest run src/lib/debounce.test.ts
```

```bash
git add src/lib/debounce.ts src/lib/debounce.test.ts
git commit -m "feat(lib): debounce helper with cancel/flush"
```

---

## Task 10: `lib/computeBlockDelta.ts` (TDD)

**Files:**
- Create: [src/lib/computeBlockDelta.ts](src/lib/computeBlockDelta.ts)
- Create: [src/lib/computeBlockDelta.test.ts](src/lib/computeBlockDelta.test.ts)

**Why:** 자동 저장의 핵심. 마지막 저장 스냅샷과 현재 BlockNote 블록을 ID로 비교해 toCreate/toUpdate/toDelete를 분리. `BlockInput[]`로 양쪽을 평탄화한 뒤 단순 set-diff를 한다.

- [ ] **Step 1: 테스트 작성**

[src/lib/computeBlockDelta.test.ts](src/lib/computeBlockDelta.test.ts):

```ts
import { computeBlockDelta } from "./computeBlockDelta";
import type { BlockInput } from "./blockAdapter";

const make = (
  _id: string,
  overrides: Partial<BlockInput> = {},
): BlockInput => ({
  _id,
  pageId: "pg",
  parentBlockId: null,
  type: "paragraph",
  content: { props: {}, inline: [{ type: "text", text: _id, styles: {} }] },
  order: 0,
  ...overrides,
});

describe("computeBlockDelta", () => {
  it("empty previous + new blocks → all toCreate", () => {
    const next = [make("a"), make("b")];
    const delta = computeBlockDelta([], next);
    expect(delta.toCreate.map((b) => b._id)).toEqual(["a", "b"]);
    expect(delta.toUpdate).toEqual([]);
    expect(delta.toDelete).toEqual([]);
  });

  it("removed block goes to toDelete", () => {
    const prev = [make("a"), make("b")];
    const next = [make("a")];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toDelete).toEqual(["b"]);
    expect(delta.toCreate).toEqual([]);
    expect(delta.toUpdate).toEqual([]);
  });

  it("changed content moves to toUpdate", () => {
    const prev = [make("a", { content: { props: {}, inline: [{ type: "text", text: "old", styles: {} }] } })];
    const next = [make("a", { content: { props: {}, inline: [{ type: "text", text: "new", styles: {} }] } })];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toUpdate.map((b) => b._id)).toEqual(["a"]);
  });

  it("unchanged block is not in any bucket", () => {
    const prev = [make("a")];
    const next = [make("a")];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toCreate).toEqual([]);
    expect(delta.toUpdate).toEqual([]);
    expect(delta.toDelete).toEqual([]);
  });

  it("order change alone triggers toUpdate", () => {
    const prev = [make("a", { order: 0 }), make("b", { order: 1 })];
    const next = [make("a", { order: 1 }), make("b", { order: 0 })];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toUpdate.map((b) => b._id).sort()).toEqual(["a", "b"]);
  });

  it("parentBlockId change triggers toUpdate", () => {
    const prev = [make("a", { parentBlockId: null })];
    const next = [make("a", { parentBlockId: "p" })];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toUpdate.map((b) => b._id)).toEqual(["a"]);
  });

  it("type change triggers toUpdate", () => {
    const prev = [make("a", { type: "paragraph" })];
    const next = [make("a", { type: "heading_1" })];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toUpdate.map((b) => b._id)).toEqual(["a"]);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run src/lib/computeBlockDelta.test.ts
```

- [ ] **Step 3: 구현**

[src/lib/computeBlockDelta.ts](src/lib/computeBlockDelta.ts):

```ts
import type { BlockInput } from "./blockAdapter";

export interface BlockDelta {
  toCreate: BlockInput[];
  toUpdate: BlockInput[];
  toDelete: string[];
}

function isSame(a: BlockInput, b: BlockInput): boolean {
  return (
    a.type === b.type &&
    a.order === b.order &&
    a.parentBlockId === b.parentBlockId &&
    JSON.stringify(a.content) === JSON.stringify(b.content)
  );
}

export function computeBlockDelta(
  previous: BlockInput[],
  next: BlockInput[],
): BlockDelta {
  const prevById = new Map(previous.map((b) => [b._id, b]));
  const nextById = new Map(next.map((b) => [b._id, b]));

  const toCreate: BlockInput[] = [];
  const toUpdate: BlockInput[] = [];
  const toDelete: string[] = [];

  next.forEach((b) => {
    const before = prevById.get(b._id);
    if (!before) toCreate.push(b);
    else if (!isSame(before, b)) toUpdate.push(b);
  });

  prevById.forEach((_b, id) => {
    if (!nextById.has(id)) toDelete.push(id);
  });

  return { toCreate, toUpdate, toDelete };
}
```

> `JSON.stringify` 비교는 작은 블록에서는 충분히 빠르고 deep-equal 라이브러리를 추가할 가치가 없다. 한 페이지의 블록 수가 천 단위로 커지면 별도 deep-eq로 교체한다 (현재 MVP에서는 비현실적).

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
npx vitest run src/lib/computeBlockDelta.test.ts
```

```bash
git add src/lib/computeBlockDelta.ts src/lib/computeBlockDelta.test.ts
git commit -m "feat(lib): computeBlockDelta — set diff for autosave"
```

---

## Task 11: `useAutosaveBlocks` 훅 (TDD)

**Files:**
- Create: [src/hooks/useAutosaveBlocks.ts](src/hooks/useAutosaveBlocks.ts)
- Create: [src/hooks/useAutosaveBlocks.test.tsx](src/hooks/useAutosaveBlocks.test.tsx)

**Why:** Plan 2의 핵심 hook. BlockNote의 `onChange`로부터 받은 BlockNoteLikeBlock 트리를 디바운스 1초로 합치고, 마지막 저장 스냅샷과 비교해 델타를 백엔드에 적용한다. spec 5-5의 retry: 2 / retryDelay: 1000 / Toast 정책 모두 여기서 구현.

**상태 머신:** `idle → saving → saved` 또는 `idle → saving → error`. 새 변경이 들어오면 `saved`/`error`에서도 다시 `saving`으로 전이.

- [ ] **Step 1: 테스트 작성**

[src/hooks/useAutosaveBlocks.test.tsx](src/hooks/useAutosaveBlocks.test.tsx):

```tsx
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { useAutosaveBlocks } from "./useAutosaveBlocks";
import type { BlockNoteLikeBlock } from "@/lib/blockAdapter";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  seed();
});

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const txt = (text: string): BlockNoteLikeBlock => ({
  id: text,
  type: "paragraph",
  props: {},
  content: [{ type: "text", text, styles: {} }],
  children: [],
});

describe("useAutosaveBlocks", () => {
  it("status is 'idle' initially", () => {
    const { result } = renderHook(
      () => useAutosaveBlocks({ pageId: "pg_x", initialBlocks: [] }),
      { wrapper: wrapper() },
    );
    expect(result.current.status).toBe("idle");
  });

  it("debounces calls and POSTs after the quiet period", async () => {
    vi.useFakeTimers();
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result } = renderHook(
      () =>
        useAutosaveBlocks({
          pageId: meeting._id,
          initialBlocks: [],
          debounceMs: 1000,
        }),
      { wrapper: wrapper() },
    );

    act(() => {
      result.current.save([txt("a")]);
      result.current.save([txt("a"), txt("b")]);
    });
    expect(result.current.status).toBe("idle");

    await act(async () => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current.status).toBe("idle");

    await act(async () => {
      vi.advanceTimersByTime(1);
      vi.useRealTimers();
    });

    await waitFor(() => expect(result.current.status).toBe("saved"), {
      timeout: 3000,
    });
    const inDb = db.blocks.filter(
      (b) => b.pageId === meeting._id && b.removedAt === null,
    );
    // 시드의 4개 + 새로 추가된 2개 (a, b)
    expect(inDb.some((b) => b._id === "a")).toBe(true);
    expect(inDb.some((b) => b._id === "b")).toBe(true);
  });

  it("transitions to 'error' after retries exhaust on persistent failure", async () => {
    server.use(
      http.post("*/blocks/batch", () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
      http.post("*/blocks", () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result } = renderHook(
      () =>
        useAutosaveBlocks({
          pageId: meeting._id,
          initialBlocks: [],
          debounceMs: 0,
          retry: 2,
          retryDelay: 10,
        }),
      { wrapper: wrapper() },
    );

    act(() => {
      result.current.save([txt("x")]);
    });

    await waitFor(() => expect(result.current.status).toBe("error"), {
      timeout: 5000,
    });
  });

  it("flush() forces immediate save (used on unmount or navigation)", async () => {
    const meeting = db.pages.find((p) => p.properties.type === "meeting")!;
    const { result, unmount } = renderHook(
      () =>
        useAutosaveBlocks({
          pageId: meeting._id,
          initialBlocks: [],
          debounceMs: 5000,
        }),
      { wrapper: wrapper() },
    );

    act(() => {
      result.current.save([txt("flushme")]);
    });
    act(() => {
      result.current.flush();
    });

    await waitFor(() => expect(result.current.status).toBe("saved"), {
      timeout: 3000,
    });
    expect(db.blocks.some((b) => b._id === "flushme")).toBe(true);
    unmount();
  });
});
```

> 처음 mount된 시점에 시드 블록 4개가 백엔드에는 있지만 `initialBlocks: []`로 시작하면 useAutosave는 "지난 스냅샷이 빈 배열"로 인식한다. 새 입력이 들어오면 그 입력만 toCreate으로 분류한다 — 시드 블록은 다른 ID라서 toDelete에는 들어가지 않는다(이미 백엔드에 있는 블록을 우리가 모르는 채로 보존). 실전에서는 `initialBlocks`를 `useBlocks` 결과 + adapter로 변환해 넘긴다 (Task 16에서 통합).

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run src/hooks/useAutosaveBlocks.test.tsx
```

- [ ] **Step 3: 훅 구현**

[src/hooks/useAutosaveBlocks.ts](src/hooks/useAutosaveBlocks.ts):

```ts
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createBlocksBatch,
  deleteBlock,
  updateBlock,
} from "@/api/blocks";
import {
  blockNoteToBackend,
  type BlockInput,
  type BlockNoteLikeBlock,
} from "@/lib/blockAdapter";
import { computeBlockDelta } from "@/lib/computeBlockDelta";
import { debounce } from "@/lib/debounce";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveBlocksOptions {
  pageId: string | undefined;
  /** 마지막 저장 스냅샷의 시작값 — 페이지 로드 직후 백엔드 블록을 그대로 넘긴다. */
  initialBlocks: BlockInput[];
  debounceMs?: number;
  retry?: number;
  retryDelay?: number;
}

interface UseAutosaveBlocksResult {
  status: AutosaveStatus;
  save: (blocks: BlockNoteLikeBlock[]) => void;
  flush: () => void;
}

export function useAutosaveBlocks(
  options: UseAutosaveBlocksOptions,
): UseAutosaveBlocksResult {
  const {
    pageId,
    initialBlocks,
    debounceMs = 1000,
    retry = 2,
    retryDelay = 1000,
  } = options;

  const qc = useQueryClient();
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const snapshotRef = useRef<BlockInput[]>(initialBlocks);
  const lastInitialRef = useRef<BlockInput[]>(initialBlocks);
  const lastPageIdRef = useRef<string | undefined>(pageId);

  // Reset snapshot when initialBlocks reference changes (e.g. detail data
  // arrives after loading) or when pageId changes (navigation between meetings).
  // Doing this synchronously during render — instead of in useEffect — avoids a
  // race where the user's first save fires with an empty snapshot and tries to
  // recreate every existing block.
  if (
    lastInitialRef.current !== initialBlocks ||
    lastPageIdRef.current !== pageId
  ) {
    snapshotRef.current = initialBlocks;
    lastInitialRef.current = initialBlocks;
    lastPageIdRef.current = pageId;
  }

  useEffect(() => {
    setStatus("idle");
  }, [pageId]);

  const mutation = useMutation({
    retry,
    retryDelay,
    mutationFn: async (next: BlockInput[]) => {
      if (!pageId) throw new Error("pageId required");
      const delta = computeBlockDelta(snapshotRef.current, next);
      const ops: Promise<unknown>[] = [];
      if (delta.toCreate.length > 0) {
        ops.push(
          createBlocksBatch(
            delta.toCreate.map((b) => ({
              _id: b._id,
              pageId,
              parentBlockId: b.parentBlockId,
              type: b.type,
              content: b.content,
              order: b.order,
            })),
          ),
        );
      }
      delta.toUpdate.forEach((b) => {
        ops.push(
          updateBlock(b._id, {
            type: b.type,
            content: b.content,
            order: b.order,
            parentBlockId: b.parentBlockId,
          }),
        );
      });
      delta.toDelete.forEach((id) => {
        ops.push(deleteBlock(id));
      });
      await Promise.all(ops);
      return next;
    },
    onSuccess: (next) => {
      snapshotRef.current = next;
      setStatus("saved");
      if (pageId) qc.invalidateQueries({ queryKey: ["blocks", pageId] });
    },
    onError: () => {
      setStatus("error");
      toast.error("저장 실패 — 변경 사항이 아직 저장되지 않았습니다");
    },
  });

  const debouncedSave = useMemo(
    () =>
      debounce((blocks: BlockNoteLikeBlock[]) => {
        if (!pageId) return;
        setStatus("saving");
        const next = blockNoteToBackend(blocks, pageId);
        mutation.mutate(next);
      }, debounceMs),
    // mutation은 stable identity. pageId/debounceMs 변경 시에만 새 debouncer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageId, debounceMs],
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    status,
    save: (blocks) => debouncedSave(blocks),
    flush: () => debouncedSave.flush(),
  };
}
```

- [ ] **Step 4: 통과 확인**

```bash
npx vitest run src/hooks/useAutosaveBlocks.test.tsx
```

Expected: 4개 PASS. 디바운스 + 재시도 + flush 모두 검증.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useAutosaveBlocks.ts src/hooks/useAutosaveBlocks.test.tsx
git commit -m "feat(hooks): useAutosaveBlocks — debounced delta autosave with retries"
```

---

## Task 12: 리스트 표시용 lib 헬퍼 (TDD)

**Files:**
- Create: [src/lib/formatMeetingDate.ts](src/lib/formatMeetingDate.ts)
- Create: [src/lib/formatMeetingDate.test.ts](src/lib/formatMeetingDate.test.ts)
- Create: [src/lib/extractBlockPreview.ts](src/lib/extractBlockPreview.ts)
- Create: [src/lib/extractBlockPreview.test.ts](src/lib/extractBlockPreview.test.ts)
- Create: [src/lib/groupMeetingsByMonth.ts](src/lib/groupMeetingsByMonth.ts)
- Create: [src/lib/groupMeetingsByMonth.test.ts](src/lib/groupMeetingsByMonth.test.ts)

**Why:** 회의록 카드는 "4/20 (월)" 같은 날짜 라벨, 본문 미리보기 2줄, 월별 그룹 헤딩이 필요. 모두 React-free 순수 함수로 분리.

- [ ] **Step 1: `formatMeetingDate` 테스트 + 구현**

[src/lib/formatMeetingDate.test.ts](src/lib/formatMeetingDate.test.ts):

```ts
import { formatMeetingDate, formatMonthLabel } from "./formatMeetingDate";

describe("formatMeetingDate", () => {
  it("formats ISO date as 'M/D (요일)'", () => {
    expect(formatMeetingDate("2026-04-20")).toBe("4/20 (월)");
    expect(formatMeetingDate("2026-04-21")).toBe("4/21 (화)");
    expect(formatMeetingDate("2026-04-26")).toBe("4/26 (일)");
  });

  it("returns empty string for invalid input", () => {
    expect(formatMeetingDate(undefined)).toBe("");
    expect(formatMeetingDate("")).toBe("");
    expect(formatMeetingDate("not-a-date")).toBe("");
  });
});

describe("formatMonthLabel", () => {
  it("formats ISO date as 'YYYY년 M월'", () => {
    expect(formatMonthLabel("2026-04-20")).toBe("2026년 4월");
    expect(formatMonthLabel("2026-12-31")).toBe("2026년 12월");
  });
});
```

[src/lib/formatMeetingDate.ts](src/lib/formatMeetingDate.ts):

```ts
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parse(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatMeetingDate(iso: string | undefined): string {
  const d = parse(iso);
  if (!d) return "";
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

export function formatMonthLabel(iso: string): string {
  const d = parse(iso);
  if (!d) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}
```

```bash
npx vitest run src/lib/formatMeetingDate.test.ts
```

- [ ] **Step 2: `extractBlockPreview` 테스트 + 구현**

[src/lib/extractBlockPreview.test.ts](src/lib/extractBlockPreview.test.ts):

```ts
import { extractBlockPreview } from "./extractBlockPreview";
import type { Block } from "@/types/block";

const para = (text: string, order: number): Block => ({
  _id: `b${order}`,
  pageId: "pg",
  parentBlockId: null,
  type: "paragraph",
  content: { props: {}, inline: [{ type: "text", text, styles: {} }] },
  order,
  createdAt: "",
  updatedAt: "",
  removedAt: null,
});

describe("extractBlockPreview", () => {
  it("returns first paragraph text", () => {
    expect(extractBlockPreview([para("Hello", 0)])).toBe("Hello");
  });

  it("joins multiple paragraphs with newlines, capped at maxLength", () => {
    expect(
      extractBlockPreview(
        [para("first", 0), para("second", 1), para("third", 2)],
        { maxLength: 100 },
      ),
    ).toBe("first\nsecond\nthird");
  });

  it("truncates with ellipsis when text exceeds maxLength", () => {
    const long = "x".repeat(200);
    const out = extractBlockPreview([para(long, 0)], { maxLength: 50 });
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBe(51);
  });

  it("ignores blocks without inline text", () => {
    const dividerLike: Block = {
      _id: "d",
      pageId: "pg",
      parentBlockId: null,
      type: "divider",
      content: {},
      order: 0,
      createdAt: "",
      updatedAt: "",
      removedAt: null,
    };
    expect(extractBlockPreview([dividerLike, para("only this", 1)])).toBe(
      "only this",
    );
  });

  it("returns empty string for empty input", () => {
    expect(extractBlockPreview([])).toBe("");
  });
});
```

[src/lib/extractBlockPreview.ts](src/lib/extractBlockPreview.ts):

```ts
import type { Block } from "@/types/block";

interface InlineSegment {
  type: string;
  text?: string;
}

function extractInlineText(block: Block): string {
  const c = block.content as { inline?: InlineSegment[] };
  if (!c.inline) return "";
  return c.inline
    .map((seg) => (typeof seg.text === "string" ? seg.text : ""))
    .join("");
}

export function extractBlockPreview(
  blocks: Block[],
  options: { maxLength?: number } = {},
): string {
  const max = options.maxLength ?? 120;
  const lines: string[] = [];
  for (const b of blocks.slice().sort((a, b) => a.order - b.order)) {
    const text = extractInlineText(b).trim();
    if (!text) continue;
    lines.push(text);
    if (lines.join("\n").length >= max) break;
  }
  const joined = lines.join("\n");
  if (joined.length <= max) return joined;
  return joined.slice(0, max) + "…";
}
```

```bash
npx vitest run src/lib/extractBlockPreview.test.ts
```

- [ ] **Step 3: `groupMeetingsByMonth` 테스트 + 구현**

[src/lib/groupMeetingsByMonth.test.ts](src/lib/groupMeetingsByMonth.test.ts):

```ts
import { groupMeetingsByMonth } from "./groupMeetingsByMonth";
import type { Page } from "@/types/page";

const meeting = (id: string, date: string, order = 0): Page => ({
  _id: id,
  workspaceId: "ws",
  parentPageId: "root",
  title: id,
  order,
  isArchived: false,
  isPublished: false,
  properties: { type: "meeting", date },
  createdAt: "",
  updatedAt: "",
  removedAt: null,
});

describe("groupMeetingsByMonth", () => {
  it("groups by year+month from properties.date", () => {
    const out = groupMeetingsByMonth([
      meeting("a", "2026-04-20"),
      meeting("b", "2026-04-22"),
      meeting("c", "2026-03-10"),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe("2026년 4월");
    expect(out[0].items.map((m) => m._id).sort()).toEqual(["a", "b"]);
    expect(out[1].label).toBe("2026년 3월");
    expect(out[1].items.map((m) => m._id)).toEqual(["c"]);
  });

  it("orders months newest first", () => {
    const out = groupMeetingsByMonth([
      meeting("old", "2025-12-01"),
      meeting("new", "2026-04-01"),
    ]);
    expect(out[0].label).toBe("2026년 4월");
    expect(out[1].label).toBe("2025년 12월");
  });

  it("orders meetings within a month newest-first by date", () => {
    const out = groupMeetingsByMonth([
      meeting("early", "2026-04-01"),
      meeting("late", "2026-04-28"),
      meeting("mid", "2026-04-15"),
    ]);
    expect(out[0].items.map((m) => m._id)).toEqual(["late", "mid", "early"]);
  });

  it("places meetings without date into 'Unknown' bucket at the end", () => {
    const out = groupMeetingsByMonth([
      meeting("a", "2026-04-20"),
      { ...meeting("undated", ""), properties: { type: "meeting" } } as Page,
    ]);
    expect(out[out.length - 1].label).toBe("날짜 없음");
    expect(out[out.length - 1].items.map((m) => m._id)).toEqual(["undated"]);
  });
});
```

[src/lib/groupMeetingsByMonth.ts](src/lib/groupMeetingsByMonth.ts):

```ts
import type { Page } from "@/types/page";
import { formatMonthLabel } from "./formatMeetingDate";

export interface MeetingGroup {
  /** Sort key: "YYYY-MM" or "____" for undated. */
  key: string;
  label: string;
  items: Page[];
}

export function groupMeetingsByMonth(meetings: Page[]): MeetingGroup[] {
  const buckets = new Map<string, Page[]>();
  meetings.forEach((m) => {
    const date = m.properties.date;
    const key = date ? date.slice(0, 7) : "____";
    const arr = buckets.get(key) ?? [];
    arr.push(m);
    buckets.set(key, arr);
  });

  const groups: MeetingGroup[] = [];
  buckets.forEach((items, key) => {
    items.sort((a, b) => {
      const da = a.properties.date ?? "";
      const db = b.properties.date ?? "";
      return db.localeCompare(da);
    });
    groups.push({
      key,
      label:
        key === "____"
          ? "날짜 없음"
          : formatMonthLabel(items[0].properties.date ?? ""),
      items,
    });
  });

  groups.sort((a, b) => {
    if (a.key === "____") return 1;
    if (b.key === "____") return -1;
    return b.key.localeCompare(a.key);
  });

  return groups;
}
```

```bash
npx vitest run src/lib/groupMeetingsByMonth.test.ts
```

- [ ] **Step 4: 모든 lib 테스트 통과 확인 + 커밋**

```bash
npx vitest run src/lib
```

Expected: 모든 lib 테스트 PASS.

```bash
git add src/lib/formatMeetingDate.ts src/lib/formatMeetingDate.test.ts \
        src/lib/extractBlockPreview.ts src/lib/extractBlockPreview.test.ts \
        src/lib/groupMeetingsByMonth.ts src/lib/groupMeetingsByMonth.test.ts
git commit -m "feat(lib): meeting list helpers (date format, preview, month grouping)"
```

---

## Task 13: `MeetingCard` 컴포넌트

**Files:**
- Create: [src/components/meetings/MeetingCard.tsx](src/components/meetings/MeetingCard.tsx)
- Create: [src/components/meetings/MeetingCard.test.tsx](src/components/meetings/MeetingCard.test.tsx)

**Why:** 카드 한 장: 날짜 라벨 / 제목 / 본문 미리보기 2줄. spec 4-2 + 2-5 인터랙션 원칙 (호버 scale + 그림자) 적용.

- [ ] **Step 1: 테스트 작성**

[src/components/meetings/MeetingCard.test.tsx](src/components/meetings/MeetingCard.test.tsx):

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MeetingCard } from "./MeetingCard";
import type { Page } from "@/types/page";

const meeting: Page = {
  _id: "pg_meeting_x",
  workspaceId: "ws",
  parentPageId: "root",
  title: "스프린트 회고",
  emoji: "📝",
  order: 0,
  isArchived: false,
  isPublished: false,
  properties: { type: "meeting", date: "2026-04-20" },
  createdAt: "",
  updatedAt: "",
  removedAt: null,
};

describe("MeetingCard", () => {
  it("renders date label, title, and preview", () => {
    render(
      <MemoryRouter>
        <MeetingCard meeting={meeting} preview="안건과 정리..." />
      </MemoryRouter>,
    );
    expect(screen.getByText("4/20 (월)")).toBeInTheDocument();
    expect(screen.getByText("스프린트 회고")).toBeInTheDocument();
    expect(screen.getByText(/안건과 정리/)).toBeInTheDocument();
  });

  it("links to /meetings/:id", () => {
    render(
      <MemoryRouter>
        <MeetingCard meeting={meeting} preview="" />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/meetings/${meeting._id}`);
  });

  it("renders pin badge when isPinned is true", () => {
    const pinned = {
      ...meeting,
      properties: { ...meeting.properties, isPinned: true },
    };
    render(
      <MemoryRouter>
        <MeetingCard meeting={pinned} preview="" />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("고정됨")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run src/components/meetings/MeetingCard.test.tsx
```

- [ ] **Step 3: 컴포넌트 구현**

[src/components/meetings/MeetingCard.tsx](src/components/meetings/MeetingCard.tsx):

```tsx
import { Link } from "react-router-dom";
import { Pin } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import type { Page } from "@/types/page";

interface MeetingCardProps {
  meeting: Page;
  preview: string;
}

export function MeetingCard({ meeting, preview }: MeetingCardProps) {
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
        {meeting.properties.isPinned && (
          <Pin
            className="w-3.5 h-3.5 text-tag-pink"
            aria-label="고정됨"
          />
        )}
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

> `line-clamp-*` 유틸리티는 Tailwind v3 코어. `tailwindcss/line-clamp` 별도 플러그인은 필요 없다 (v3.3+에서 코어로 통합됨).

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
npx vitest run src/components/meetings/MeetingCard.test.tsx
```

```bash
git add src/components/meetings/MeetingCard.tsx src/components/meetings/MeetingCard.test.tsx
git commit -m "feat(meetings): MeetingCard with date/title/preview/pin"
```

---

## Task 14: `MeetingsListPage` 풀 구현

**Files:**
- Create: [src/components/meetings/MeetingsGrid.tsx](src/components/meetings/MeetingsGrid.tsx)
- Create: [src/components/meetings/MeetingsListSkeleton.tsx](src/components/meetings/MeetingsListSkeleton.tsx)
- Create: [src/components/meetings/MeetingsListEmpty.tsx](src/components/meetings/MeetingsListEmpty.tsx)
- Modify: [src/routes/MeetingsListPage.tsx](src/routes/MeetingsListPage.tsx)

**Why:** 페이지 자체는 thin container — `useWorkspace`로 부모 ID를 얻고, `usePages`로 회의록 fetch, 월별 그룹으로 묶어서 `MeetingsGrid`로 렌더. "+ 새 회의록" 버튼은 `useCreatePage`로 생성 후 navigate.

- [ ] **Step 1: `MeetingsGrid` 작성 (presentational)**

[src/components/meetings/MeetingsGrid.tsx](src/components/meetings/MeetingsGrid.tsx):

```tsx
import { MeetingCard } from "./MeetingCard";
import type { Page } from "@/types/page";

interface MeetingsGridProps {
  meetings: Page[];
  previews: Record<string, string>;
}

export function MeetingsGrid({ meetings, previews }: MeetingsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {meetings.map((m) => (
        <MeetingCard key={m._id} meeting={m} preview={previews[m._id] ?? ""} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 스켈레톤 + 빈 상태 컴포넌트**

[src/components/meetings/MeetingsListSkeleton.tsx](src/components/meetings/MeetingsListSkeleton.tsx):

```tsx
export function MeetingsListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-card bg-card border border-line p-4 h-32 animate-pulse"
        >
          <div className="h-3 w-16 bg-muted rounded mb-3" />
          <div className="h-4 w-3/4 bg-muted rounded mb-2" />
          <div className="h-3 w-full bg-muted rounded mb-1" />
          <div className="h-3 w-2/3 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
```

[src/components/meetings/MeetingsListEmpty.tsx](src/components/meetings/MeetingsListEmpty.tsx):

```tsx
import { FileText } from "lucide-react";

interface MeetingsListEmptyProps {
  onCreate: () => void;
  isCreating: boolean;
}

export function MeetingsListEmpty({
  onCreate,
  isCreating,
}: MeetingsListEmptyProps) {
  return (
    <div className="rounded-card bg-card border border-line p-12 text-center">
      <FileText className="w-10 h-10 mx-auto text-muted-ink mb-3" />
      <h2 className="text-lg font-semibold text-ink mb-1">
        아직 회의록이 없어요
      </h2>
      <p className="text-sm text-muted-ink mb-6">
        첫 회의록을 만들어 팀의 기록을 시작해보세요.
      </p>
      <button
        type="button"
        onClick={onCreate}
        disabled={isCreating}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-50"
      >
        {isCreating ? "생성 중..." : "+ 첫 회의록 만들기"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: `MeetingsListPage` 풀 구현**

[src/routes/MeetingsListPage.tsx](src/routes/MeetingsListPage.tsx):

```tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePages } from "@/hooks/usePages";
import { useCreatePage } from "@/hooks/usePageMutations";
import { getBlockTree } from "@/api/blocks";
import { extractBlockPreview } from "@/lib/extractBlockPreview";
import { groupMeetingsByMonth } from "@/lib/groupMeetingsByMonth";
import { MeetingsGrid } from "@/components/meetings/MeetingsGrid";
import { MeetingsListSkeleton } from "@/components/meetings/MeetingsListSkeleton";
import { MeetingsListEmpty } from "@/components/meetings/MeetingsListEmpty";

export default function MeetingsListPage() {
  const navigate = useNavigate();
  const { workspaceId, rootFolders } = useWorkspace();
  const meetingsRoot = rootFolders?.meetings;
  const meetingsQuery = usePages({
    workspaceId,
    parentPageId: meetingsRoot,
  });
  const meetings = meetingsQuery.data ?? [];

  const previewQueries = useQueries({
    queries: meetings.map((m) => ({
      queryKey: ["blocks", m._id],
      queryFn: () => getBlockTree(m._id),
      enabled: !!m._id,
      staleTime: 60_000,
    })),
  });

  const previews = useMemo(() => {
    const out: Record<string, string> = {};
    meetings.forEach((m, i) => {
      const data = previewQueries[i]?.data;
      out[m._id] = data
        ? extractBlockPreview(data.blocks, { maxLength: 120 })
        : "";
    });
    return out;
  }, [meetings, previewQueries]);

  const groups = useMemo(() => groupMeetingsByMonth(meetings), [meetings]);

  const createPage = useCreatePage();

  const handleCreate = async () => {
    if (!workspaceId || !meetingsRoot) return;
    const today = new Date().toISOString().slice(0, 10);
    const created = await createPage.mutateAsync({
      workspaceId,
      parentPageId: meetingsRoot,
      title: "",
      emoji: "📝",
      order: -Date.now(),
      properties: { type: "meeting", date: today },
    });
    navigate(`/meetings/${created._id}`);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">회의록</h1>
        <button
          type="button"
          onClick={handleCreate}
          disabled={createPage.isPending || !workspaceId}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-brand text-white text-sm hover:bg-brand/90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {createPage.isPending ? "생성 중..." : "새 회의록"}
        </button>
      </header>

      {meetingsQuery.isLoading ? (
        <MeetingsListSkeleton />
      ) : meetings.length === 0 ? (
        <MeetingsListEmpty
          onCreate={handleCreate}
          isCreating={createPage.isPending}
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} className="space-y-4">
              <h2 className="text-sm font-medium text-muted-ink">
                {group.label}
              </h2>
              <MeetingsGrid meetings={group.items} previews={previews} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
```

> `order: -Date.now()` 트릭: 새로 만든 회의록을 정렬상 가장 위로(즉, 백엔드 `order` 오름차순에서 음수가 0보다 앞)에 배치. 백엔드 정책과 일치하면 좋고, 만약 양수만 허용한다면 Plan 3에서 reorder 로직 정리.

- [ ] **Step 4: 통합 테스트 작성**

[src/routes/MeetingsListPage.test.tsx](src/routes/MeetingsListPage.test.tsx):

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import MeetingsListPage from "./MeetingsListPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  seed();
  localStorage.clear();
});

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/meetings"]}>
        <Routes>
          <Route path="/meetings" element={<MeetingsListPage />} />
          <Route path="/meetings/:id" element={<div>상세</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MeetingsListPage", () => {
  it("renders 5 seeded meetings grouped by month", async () => {
    renderPage();
    await waitFor(() => {
      const titles = screen.getAllByRole("heading", { level: 3 });
      expect(titles.length).toBe(5);
    });
    expect(screen.getByText("2026년 4월")).toBeInTheDocument();
  });

  it("creating a new meeting navigates to detail", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("2026년 4월");
    await user.click(screen.getByRole("button", { name: /새 회의록/ }));
    await waitFor(() =>
      expect(screen.getByText("상세")).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 5: 통과 확인**

```bash
npx vitest run src/routes/MeetingsListPage.test.tsx
```

Expected: 2개 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/routes/MeetingsListPage.tsx src/routes/MeetingsListPage.test.tsx \
        src/components/meetings/MeetingsGrid.tsx \
        src/components/meetings/MeetingsListSkeleton.tsx \
        src/components/meetings/MeetingsListEmpty.tsx
git commit -m "feat(meetings): list page with month groups, previews, create flow"
```

---

## Task 15: `BlockEditor` 컴포넌트 + theme + lazy import 준비

**Files:**
- Create: [src/components/editor/BlockEditor.tsx](src/components/editor/BlockEditor.tsx)
- Modify: [src/components/editor/blockNoteTheme.ts](src/components/editor/blockNoteTheme.ts)
- Modify: [src/index.css](src/index.css) (BlockNote stylesheets import)

**Why:** BlockNote 통합. 우리 ThemeProvider의 dark/light 상태를 BlockNote의 theme prop으로 전달하고, Mantine variant의 자체 스타일이 우리 토큰과 자연스럽게 어울리도록 CSS를 import.

- [ ] **Step 1: BlockNote CSS 임포트 추가**

[src/index.css](src/index.css) 상단에:

```css
@import "@blocknote/core/fonts/inter.css";
@import "@blocknote/mantine/style.css";

@tailwind base;
@tailwind components;
@tailwind utilities;
```

> 이 두 import는 우리 `Plus Jakarta Sans` font-family를 덮어쓰지 않는다 — Inter는 BlockNote 내부 컨테이너에서만 적용되고, 글로벌 `body`는 우리의 `theme("fontFamily.sans")` 그대로 유지.

- [ ] **Step 2: theme 매핑 stub 구체화**

[src/components/editor/blockNoteTheme.ts](src/components/editor/blockNoteTheme.ts):

```ts
import type { Theme } from "@blocknote/mantine";

/**
 * BlockNote Mantine theme 매핑.
 * 우리 디자인 토큰과 정확히 일치하도록 라이트/다크 두 개를 정의한다.
 * 실제 컬러 값은 :root / .dark CSS 변수에서 읽지 못하므로(BlockNote는 직접 hex/HSL 문자열을 요구) 정적으로 미러링.
 * 토큰 변경 시 src/index.css와 함께 이 파일도 업데이트할 것.
 */

export const lightBlockNoteTheme: Theme = {
  colors: {
    editor: { text: "#0F172A", background: "#FFFFFF" },
    menu: { text: "#0F172A", background: "#FFFFFF" },
    tooltip: { text: "#FFFFFF", background: "#0F172A" },
    hovered: { text: "#0F172A", background: "#F1F5F9" },
    selected: { text: "#0F172A", background: "#CCFBF1" },
    disabled: { text: "#94A3B8", background: "#F5F5F7" },
    shadow: "#E2E8F0",
    border: "#E2E8F0",
    sideMenu: "#475569",
    highlights: {},
  },
  borderRadius: 8,
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};

export const darkBlockNoteTheme: Theme = {
  colors: {
    editor: { text: "#F1F5F9", background: "#171717" },
    menu: { text: "#F1F5F9", background: "#171717" },
    tooltip: { text: "#0F172A", background: "#F1F5F9" },
    hovered: { text: "#F1F5F9", background: "#262626" },
    selected: { text: "#F1F5F9", background: "#134E4A" },
    disabled: { text: "#64748B", background: "#0A0A0A" },
    shadow: "#000000",
    border: "#262626",
    sideMenu: "#94A3B8",
    highlights: {},
  },
  borderRadius: 8,
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};
```

- [ ] **Step 3: `BlockEditor` 구현**

[src/components/editor/BlockEditor.tsx](src/components/editor/BlockEditor.tsx):

```tsx
import { useEffect, useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useThemeStore } from "@/store/themeStore";
import {
  lightBlockNoteTheme,
  darkBlockNoteTheme,
} from "./blockNoteTheme";
import type { BlockNoteLikeBlock } from "@/lib/blockAdapter";

interface BlockEditorProps {
  initialContent: BlockNoteLikeBlock[];
  onChange: (blocks: BlockNoteLikeBlock[]) => void;
  onMount?: (flush: () => void) => void;
}

function resolveDark(mode: "system" | "light" | "dark"): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function BlockEditor({
  initialContent,
  onChange,
  onMount,
}: BlockEditorProps) {
  const mode = useThemeStore((s) => s.mode);
  const isDark = useMemo(() => resolveDark(mode), [mode]);
  const theme = isDark ? darkBlockNoteTheme : lightBlockNoteTheme;

  const editor = useCreateBlockNote({
    initialContent: initialContent.length > 0
      ? (initialContent as Parameters<typeof useCreateBlockNote>[0]["initialContent"])
      : undefined,
  });

  useEffect(() => {
    if (onMount) onMount(() => onChange(editor.document as unknown as BlockNoteLikeBlock[]));
  }, [editor, onChange, onMount]);

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      onChange={() => onChange(editor.document as unknown as BlockNoteLikeBlock[])}
    />
  );
}
```

> `default export`는 `React.lazy(() => import(...))`와 자연스럽게 동작하기 위함. `onMount`는 부모(MeetingDetailPage)가 unmount/navigation 직전에 `flush()`를 호출하기 위한 핸들. `editor.document`의 타입은 BlockNote 내부 `Block<DefaultBlockSchema, ...>[]`인데, 우리 `BlockNoteLikeBlock`은 그 구조와 호환되는 형태로 의도적으로 작성됨 — `as unknown as` 캐스팅으로 경계 통과 (어댑터의 라운드트립 테스트가 실제 호환성을 보호).

- [ ] **Step 4: 빌드 + 회귀 테스트 — 컴파일 가능 확인**

```bash
npm run build
```

Expected: 빌드 성공.

```bash
npx vitest run
```

Expected: 모든 기존 테스트 통과 (BlockEditor 자체는 다음 task에서 통합 테스트). BlockNote import는 jsdom 환경에서 동작하지 않을 수 있으므로 컴포넌트 단위 RTL 테스트는 작성하지 않는다 — 통합 검증은 Task 17에서 manual + Task 11의 useAutosaveBlocks 통합 테스트로 커버.

- [ ] **Step 5: 커밋**

```bash
git add src/components/editor/BlockEditor.tsx \
        src/components/editor/blockNoteTheme.ts \
        src/index.css
git commit -m "feat(editor): BlockEditor with light/dark theme + Mantine variant"
```

---

## Task 16: `SaveIndicator` + `MeetingHeader`

**Files:**
- Create: [src/components/editor/SaveIndicator.tsx](src/components/editor/SaveIndicator.tsx)
- Create: [src/components/editor/SaveIndicator.test.tsx](src/components/editor/SaveIndicator.test.tsx)
- Create: [src/components/meetings/MeetingHeader.tsx](src/components/meetings/MeetingHeader.tsx)

**Why:** `SaveIndicator`는 자동 저장 상태를 한 줄로 표시. `MeetingHeader`는 ← 뒤로 / 편집 가능한 제목 / SaveIndicator를 묶는 sticky 헤더.

- [ ] **Step 1: `SaveIndicator` 테스트 + 구현**

[src/components/editor/SaveIndicator.test.tsx](src/components/editor/SaveIndicator.test.tsx):

```tsx
import { render, screen } from "@testing-library/react";
import { SaveIndicator } from "./SaveIndicator";

describe("SaveIndicator", () => {
  it("renders nothing when status is idle", () => {
    const { container } = render(<SaveIndicator status="idle" />);
    expect(container.textContent).toBe("");
  });
  it("shows saving label", () => {
    render(<SaveIndicator status="saving" />);
    expect(screen.getByText("저장 중...")).toBeInTheDocument();
  });
  it("shows saved label", () => {
    render(<SaveIndicator status="saved" />);
    expect(screen.getByText("저장됨 ✓")).toBeInTheDocument();
  });
  it("shows error label and is announced as alert", () => {
    render(<SaveIndicator status="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("저장 실패");
  });
});
```

[src/components/editor/SaveIndicator.tsx](src/components/editor/SaveIndicator.tsx):

```tsx
import { cn } from "@/lib/cn";
import type { AutosaveStatus } from "@/hooks/useAutosaveBlocks";

interface SaveIndicatorProps {
  status: AutosaveStatus;
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === "idle") return <span className="text-xs text-transparent" aria-hidden />;
  if (status === "error") {
    return (
      <span role="alert" className="text-xs text-destructive">
        저장 실패
      </span>
    );
  }
  return (
    <span
      className={cn(
        "text-xs",
        status === "saving" ? "text-muted-ink" : "text-brand",
      )}
      aria-live="polite"
    >
      {status === "saving" ? "저장 중..." : "저장됨 ✓"}
    </span>
  );
}
```

```bash
npx vitest run src/components/editor/SaveIndicator.test.tsx
```

- [ ] **Step 2: `MeetingHeader` 구현**

[src/components/meetings/MeetingHeader.tsx](src/components/meetings/MeetingHeader.tsx):

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SaveIndicator } from "@/components/editor/SaveIndicator";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import type { AutosaveStatus } from "@/hooks/useAutosaveBlocks";

interface MeetingHeaderProps {
  title: string;
  date?: string;
  onTitleChange: (next: string) => void;
  saveStatus: AutosaveStatus;
}

export function MeetingHeader({
  title,
  date,
  onTitleChange,
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
        <SaveIndicator status={saveStatus} />
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

> 제목 편집은 onBlur 시 commit (디바운스 없이 단순). 향후 회의록 안에서 즉각 저장이 필요해지면 `useUpdatePage` + 작은 debounce를 여기에 추가. 현재는 user가 본문으로 포커스 이동하면 저장된다 — UX적으로 충분.

- [ ] **Step 3: 통과 확인 + 커밋**

```bash
npx vitest run src/components/editor/SaveIndicator.test.tsx
```

```bash
git add src/components/editor/SaveIndicator.tsx \
        src/components/editor/SaveIndicator.test.tsx \
        src/components/meetings/MeetingHeader.tsx
git commit -m "feat(editor): SaveIndicator + MeetingHeader (back, editable title)"
```

---

## Task 17: `MeetingDetailPage` 풀 구현

**Files:**
- Modify: [src/routes/MeetingDetailPage.tsx](src/routes/MeetingDetailPage.tsx)
- Create: [src/routes/MeetingDetailPage.test.tsx](src/routes/MeetingDetailPage.test.tsx)

**Why:** Plan 2의 통합 정점. 페이지 detail fetch → header에 제목/날짜 + indicator, 본문에 lazy BlockEditor + autosave 와이어링.

- [ ] **Step 1: `MeetingDetailPage` 구현**

[src/routes/MeetingDetailPage.tsx](src/routes/MeetingDetailPage.tsx):

```tsx
import { Suspense, lazy, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { usePageDetail } from "@/hooks/usePageDetail";
import { useUpdatePage } from "@/hooks/usePageMutations";
import { useAutosaveBlocks } from "@/hooks/useAutosaveBlocks";
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

  const flushRef = useRef<() => void>(() => {});

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
          onChange={(blocks) => autosave.save(blocks)}
          onMount={(flush) => {
            flushRef.current = flush;
          }}
        />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: 라우트 통합 테스트 (라우터 + MSW)**

[src/routes/MeetingDetailPage.test.tsx](src/routes/MeetingDetailPage.test.tsx):

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import MeetingDetailPage from "./MeetingDetailPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  seed();
});

// jsdom에서 BlockNote는 ProseMirror DOM을 마운트한다 — 일부 환경에서 실패할 수 있어
// 본 테스트는 헤더(제목/뒤로/SaveIndicator) 와이어링과 PATCH 흐름만 검증.
// BlockEditor 본체의 동작은 useAutosaveBlocks 통합 테스트(Task 11)에서 cover.
vi.mock("@/components/editor/BlockEditor", () => ({
  default: () => <div data-testid="block-editor-stub" />,
}));

function renderRoute(pageId: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/meetings/${pageId}`]}>
        <Routes>
          <Route path="/meetings/:id" element={<MeetingDetailPage />} />
          <Route path="/meetings" element={<div>리스트</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MeetingDetailPage", () => {
  it("renders the meeting title and date", async () => {
    const m = db.pages.find((p) => p.properties.type === "meeting")!;
    renderRoute(m._id);
    await waitFor(() =>
      expect(screen.getByDisplayValue(m.title)).toBeInTheDocument(),
    );
    expect(screen.getByTestId("block-editor-stub")).toBeInTheDocument();
  });

  it("editing title and blurring PATCHes the page", async () => {
    const m = db.pages.find((p) => p.properties.type === "meeting")!;
    const user = userEvent.setup();
    renderRoute(m._id);
    const input = await screen.findByDisplayValue(m.title);
    await user.clear(input);
    await user.type(input, "새 제목");
    await user.tab();
    await waitFor(() =>
      expect(db.pages.find((p) => p._id === m._id)!.title).toBe("새 제목"),
    );
  });

  it("back button navigates to /meetings", async () => {
    const m = db.pages.find((p) => p.properties.type === "meeting")!;
    const user = userEvent.setup();
    renderRoute(m._id);
    const back = await screen.findByRole("button", { name: /목록으로/ });
    await user.click(back);
    await waitFor(() =>
      expect(screen.getByText("리스트")).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 3: 통과 확인**

```bash
npx vitest run src/routes/MeetingDetailPage.test.tsx
```

Expected: 3개 PASS.

- [ ] **Step 4: 커밋**

```bash
git add src/routes/MeetingDetailPage.tsx src/routes/MeetingDetailPage.test.tsx
git commit -m "feat(meetings): detail page with lazy BlockEditor + autosave"
```

---

## Task 18: 엔드투엔드 검증 + 회귀 + manual smoke

**Files:** 변경 없음

- [ ] **Step 1: 전체 테스트 통과 확인**

```bash
npm test
```

Expected: 모든 테스트 PASS. 신규 추가 테스트:
- `src/mocks/handlers/blocks.test.ts` (3)
- `src/mocks/db/seed.test.ts` (3)
- `src/lib/debounce.test.ts` (4)
- `src/lib/computeBlockDelta.test.ts` (7)
- `src/lib/formatMeetingDate.test.ts` (3)
- `src/lib/extractBlockPreview.test.ts` (5)
- `src/lib/groupMeetingsByMonth.test.ts` (4)
- `src/hooks/usePages.test.tsx` (3)
- `src/hooks/usePageDetail.test.tsx` (2)
- `src/hooks/usePageMutations.test.tsx` (3)
- `src/hooks/useBlocks.test.tsx` (2)
- `src/hooks/useAutosaveBlocks.test.tsx` (4)
- `src/components/meetings/MeetingCard.test.tsx` (3)
- `src/components/editor/SaveIndicator.test.tsx` (4)
- `src/routes/MeetingsListPage.test.tsx` (2)
- `src/routes/MeetingDetailPage.test.tsx` (3)
- 기존 테스트 회귀 없음 (Plan 1: useWorkspace, blockAdapter, themeStore, cn, App boot integration)

- [ ] **Step 2: 빌드 통과 확인**

```bash
npm run build
```

Expected: 빌드 성공. `dist/` 생성. BlockNote가 분리된 chunk로 출력되는지 (lazy import) 확인:

```bash
ls -la dist/assets/ | grep -i block
```

Expected: `BlockEditor-XXXX.js` 같은 별도 청크 파일이 존재.

- [ ] **Step 3: Dev 서버 manual smoke**

```bash
npm run dev
```

브라우저(http://localhost:5173)에서 다음 시나리오 확인:

1. `/meetings`에 진입 → 5개 시드 회의록이 "2026년 4월" 그룹 아래 카드로 표시.
2. 카드를 클릭 → `/meetings/:id`로 이동, 제목 input + BlockNote 에디터가 열린다. 시드된 4개 블록(헤딩 + 본문 + bullet 2개)이 보인다.
3. 본문에 텍스트 입력 → 1초 후 헤더 우측에 "저장 중..." → "저장됨 ✓".
4. 페이지 새로고침 → 입력한 내용이 그대로 복원.
5. 제목 input 수정 → 다른 곳 클릭하면 즉시 PATCH (네트워크 탭 확인).
6. ← 뒤로 → `/meetings`로 복귀, 새 제목이 카드에 반영됨.
7. "+ 새 회의록" → 빈 에디터로 이동, 입력 → 1초 후 저장됨 표시.
8. 다크 모드 토글 (사이드바 ⚙ 옆 / 또는 system 변경) → 에디터 배경/텍스트가 다크 토큰으로 전환.
9. DevTools Network 탭에서 disable network → 입력 시 인디케이터가 "저장 중" 후 자동 재시도 2회 → 결국 "저장 실패" + Toast 노출.

> 9번 실패 시나리오는 manual 검증으로만 — useAutosaveBlocks 통합 테스트가 같은 분기를 자동화한다.

- [ ] **Step 4: 커밋 (manual 검증 완료 표시 — 코드 변경 없으면 생략)**

manual 검증 중 발견한 버그 수정만 별도 커밋. 깨끗했다면 이 step은 no-op.

---

## Plan 3 시작 시 첫 작업

1. `@dnd-kit/core`, `@dnd-kit/sortable` 설치.
2. `useProjects`, `useProjectMutations` 훅 (usePages 패턴 재사용 가능 — `parentPageId = projects_root`).
3. KanbanBoard / KanbanColumn / ProjectCard 컴포넌트.
4. ProjectModal + URL 동기화 (`/projects/:id`).
5. 드래그 → `PATCH /pages/:id` (status + order) optimistic + 롤백.

---

## Self-Review 체크리스트 (작성자용)

**Spec 4-2 (회의록 리스트):**
- [x] 페이지 제목 + `[+ 새 회의록]` 버튼 — Task 14 MeetingsListPage.
- [x] 월별 섹션 그룹 — `groupMeetingsByMonth` (Task 12) + Task 14 렌더링.
- [x] 카드 표시(날짜·제목·미리보기 2줄·핀) — `MeetingCard` (Task 13).
- [ ] 그리드/리스트 토글, 칩 필터(전체/이번주/지난달), 검색 입력 — **Plan 2 비포함, Plan 4 폴리싱**. Spec 4-2의 핵심(카드 + 월 그룹 + 신규 생성)은 cover.

**Spec 4-3 (회의록 상세):**
- [x] ← 뒤로 / 제목 / SaveIndicator — `MeetingHeader` (Task 16).
- [x] 메타: 날짜 — `MeetingHeader`. `🏷️ @멘션된 프로젝트 칩들`은 **Plan 4** (`@멘션` 도메인 전체).
- [x] BlockNote 에디터 (lazy) — `BlockEditor` (Task 15) + Suspense (Task 17).
- [x] 자동 저장 인디케이터 — `SaveIndicator` (Task 16).
- [ ] `⋯ 메뉴 / 공유 / 핀` — Plan 4 폴리싱.

**Spec 5-2 (API):**
- [x] `POST /pages`, `PATCH /pages/:id`, `DELETE /pages/:id` — usePageMutations (Task 7).
- [x] `GET /pages?parentPageId` — usePages (Task 5).
- [x] `GET /pages/:id/detail` — usePageDetail (Task 6).
- [x] `POST /blocks/batch`, `PATCH /blocks/:id`, `DELETE /blocks/:id` — useAutosaveBlocks (Task 11).
- [x] `GET /blocks/tree` — useBlocks (Task 8) + 미리보기 prefetch (Task 14).

**Spec 5-3 (어댑터):** 변경 없음 — Plan 1에서 이미 완비. 단 blockAdapter는 BlockNote 타입 매핑이 추가됨 (Task 3).

**Spec 5-4 (Mock seed):**
- [x] 회의록 5 + 프로젝트 8 + 두 루트 폴더 — Plan 1에서 정의, Plan 2에서 `empty: false`로 활성 (Task 1).
- [x] 일부 회의록의 `mentionedPageIds` 시드 — 기존 그대로.
- [x] 각 페이지마다 BlockNote 콘텐츠를 백엔드 Block 트리로 변환한 시드 — Task 4 (회의록만, 프로젝트는 Plan 3).

**Spec 5-5 (자동 저장 패턴):**
- [x] `유저 타이핑 → debounce 1000ms` — Task 11 + Task 9 debounce.
- [x] `useMutation retry: 2, retryDelay: 1000` — Task 11 mutation 옵션.
- [x] optimistic update — 사용자 keystroke가 BlockNote 내부 state를 즉시 갱신하므로 별도 캐시 갱신 필요 없음. 백엔드 reconcile 후 `["blocks", pageId]` invalidate.
- [x] 인디케이터 "저장됨 ✓" / "저장 중..." / "저장 실패" — Task 16 SaveIndicator.
- [x] 자동 재시도 2회 모두 실패 시 Toast — Task 11 onError에서 `toast.error(...)`.
- [ ] "수동 재시도 버튼" — MVP 약식: 사용자가 다시 입력하면 자동 재시도. 명시적 재시도 버튼은 Plan 4 폴리싱.

**Spec 7-1 (에러 카테고리):**
- [x] 자동 저장 실패 — 이 plan에서 cover.
- [x] 모달 진입 시 페이지 없음 — `MeetingDetailPage`에 isError 분기.
- [ ] 네트워크 끊김 노란 배너, ErrorBoundary, 부트스트랩 실패 — Plan 1/4 영역.

**Spec 7-2 (TanStack Query 기본값):** Plan 1에서 이미 main.tsx에 설정. autosave mutation은 호출 시점에 `retry: 2, retryDelay: 1000`로 override (Task 11).

**Spec 7-3 (로딩 패턴):**
- [x] 리스트 shimmer — `MeetingsListSkeleton` (Task 14).
- [x] 페이지 상세 — 헤더 즉시 + Suspense fallback for BlockEditor (Task 17).
- [x] 자동 저장 인디케이터 — Task 16.

**Spec 7-4 / 7-5 (테스트 전략):**
- [x] 유닛: blockAdapter 라운드트립 (Plan 1) + Plan 2 신규(debounce, computeBlockDelta, formatMeetingDate, extractBlockPreview, groupMeetingsByMonth).
- [x] 통합: usePages, usePageMutations, useBlocks, usePageDetail, useAutosaveBlocks (디바운스 + 재시도 + flush) + MeetingsListPage 라우트 + MeetingDetailPage 라우트.
- [ ] BlockEditor 컴포넌트 단위 RTL 테스트는 작성하지 않음 (jsdom + ProseMirror 호환성 이슈) — manual smoke로 cover, integration은 useAutosaveBlocks가 백엔드 호출 정확성 보호.

**Spec 7-7 (성능):**
- [x] BlockNote 동적 import — `MeetingDetailPage`의 `lazy(() => import("@/components/editor/BlockEditor"))` (Task 17).
- [x] 자동 저장 debounce 1000ms — useAutosaveBlocks 기본값.

**Placeholder/타입 일관성 점검:**
- [x] 모든 코드 블록은 실제 작성 가능한 완전한 형태.
- [x] `useAutosaveBlocks`는 Task 11에서 정의된 `AutosaveStatus`/`save`/`flush`/`status`를 Task 16, 17에서 동일 시그니처로 사용.
- [x] `BlockNoteLikeBlock`/`BlockInput`은 Task 3 정의가 Task 11(autosave) 및 Task 17(detail page)까지 일관.
- [x] `MeetingsGrid`의 `previews: Record<string, string>` shape은 Task 14의 `MeetingsListPage`에서 동일하게 생성.
- [x] `useCreatePage`/`useUpdatePage`/`useDeletePage`는 Task 7 정의 → Task 14, 17에서 동일 호출 시그니처(`mutateAsync`/`mutate`).
- [x] TBD/생략 없음.
