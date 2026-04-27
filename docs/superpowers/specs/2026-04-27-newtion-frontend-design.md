# Newtion — Frontend Design Spec

- **작성일**: 2026-04-27
- **작성자**: 홍우진 (프론트엔드)
- **상태**: 초안 (구현 시작 전 합의용)
- **관련 문서**:
  - [`/NOTION_API.md`](../../../NOTION_API.md) — 백엔드 API 명세
  - [`/BACKEND_REQUESTS.md`](../../../BACKEND_REQUESTS.md) — 백엔드 변경 요청 사양
  - [`/design-system/newtion/MASTER.md`](../../../design-system/newtion/MASTER.md) — ui-ux-pro-max 생성 디자인 시스템

---

## 1. Overview

### 1-1. 제품 정의

**Newtion**은 노션의 회의록·프로젝트 아카이빙 기능을 부분 카피하면서 스타트업 팀 운영에 맞게 개선한 내부 협업 도구입니다.

### 1-2. 사용 맥락

- 현재 사용자: 2명, 팀 확장 가능성 있음
- 프론트엔드: React (Vite SPA)
- 백엔드: 별도 팀원이 구현 (`/NOTION_API.md` 기준), 프론트엔드는 MSW mock으로 선행 개발
- 1차 출시 범위: 운영 사용 가능한 표준 MVP

### 1-3. 핵심 기능

1. **대시보드 홈** — Bento 카드 그리드로 진행중 프로젝트, 최근 회의록, 즐겨찾기, 최근 변경 한눈에
2. **회의록** — 노션식 블록 에디터(BlockNote)로 작성, 본문에서 `@멘션`으로 다른 페이지(주로 프로젝트) 링크. 멘션은 양방향 가능하지만 주요 흐름은 회의록 → 프로젝트
3. **프로젝트 칸반** — 예정/진행중/완료 3컬럼, 드래그로 상태 변경, 카드 클릭 시 큰 모달(풀스크린 토글)
4. **블록 임베드** — 이미지/코드/파일/토글/체크박스/제목/리스트 등
5. **글로벌 검색** — `⌘K`로 어디서든, 제목 검색 (MVP 기준)
6. **사이드바 즐겨찾기 + 최근 항목**
7. **다크 모드**

### 1-4. MVP 범위 외 (Out of Scope)

| # | 항목 | 비고 |
|---|---|---|
| 1 | 인증 / 로그인 | 링크 = 편집 권한. 추후 합의 |
| 2 | 사용자 / 팀 멤버 모델 | `createdBy` 등 필드는 비워두거나 `"anonymous"` |
| 3 | 본문 검색 | 제목 검색만 (`GET /pages/search`) |
| 4 | 동시 편집 충돌 처리 | Last-Write-Wins (2명이라 충분) |
| 5 | 댓글 / 알림 / 활동 피드 | 추후 |
| 6 | 멀티 워크스페이스 | 1개 고정 |
| 7 | E2E 테스트 (Playwright) | 추후 |

---

## 2. 디자인 시스템

### 2-1. 톤 & 방향

- **스타일**: Bento Grid + 컬러풀 모던 + Micro-interactions
- **타깃 인상**: 스타트업스러운 활기 + 카드 기반 정돈된 정보 밀도

### 2-2. 컬러 팔레트

| 역할 | Light | Dark |
|---|---|---|
| Primary (브랜드) | `Teal #0D9488` | `Teal #14B8A6` |
| CTA / 강조 | `Orange #F97316` | `Orange #FB923C` |
| 페이지 배경 | `#F5F5F7` (오프화이트) | `#0A0A0A` |
| 카드 배경 | `#FFFFFF` | `#171717` |
| 본문 텍스트 | `#0F172A` (slate-900) | `#F1F5F9` |
| 보조 텍스트 | `#475569` (slate-600) | `#94A3B8` |
| 보더 | `#E2E8F0` (slate-200) | `#262626` |

**칸반 상태 컬러**:
- 🟦 예정: `Slate #64748B` + 배경 `#F1F5F9`
- 🟧 진행중: `Amber #F59E0B` + 배경 `#FEF3C7`
- 🟩 완료: `Emerald #10B981` + 배경 `#D1FAE5`

**보조 액센트** (멘션 태그 / 즐겨찾기 핀 등): Pink `#EC4899`, Violet `#8B5CF6`, Sky `#0EA5E9`, Rose `#F43F5E`

### 2-3. 타이포그래피

- **폰트**: Plus Jakarta Sans (heading + body, 단일 폰트)
- **본문**: 16px / line-height 1.6
- **헤딩 스케일**: 32 → 24 → 20 → 18 → 16 → 14 (단계별 굵기 600/700)
- **모노**: JetBrains Mono (코드 블록)

### 2-4. 모듈 변수 (Tailwind config 토큰)

```
--card-radius:    20px    (rounded-[20px])
--grid-gap:       20px    (gap-5)
--card-bg:        white / #171717
--page-bg:        #F5F5F7 / #0A0A0A
--shadow-card:    0 1px 3px rgba(0,0,0,0.05)
--shadow-hover:   0 4px 12px rgba(0,0,0,0.08)
--hover-scale:    1.02
--transition:     150-300ms ease
```

### 2-5. 인터랙션 원칙

- 카드 호버: `scale(1.02)` + 그림자 확장 + 200ms
- 모든 클릭 가능 요소에 `cursor-pointer`
- 포커스 링: `focus-visible:ring-2 ring-teal-500`
- `prefers-reduced-motion` 존중
- 다크모드 토글: 시스템 → 라이트 → 다크 사이클

### 2-6. 안티패턴 (피할 것)

- ❌ 이모지를 아이콘으로 사용 → ✅ Lucide SVG
- ❌ 호버 시 레이아웃 시프트 유발하는 `scale` → ✅ 그림자/색만 변경
- ❌ 라이트 모드에서 너무 옅은 글래스 (`bg-white/10`) → ✅ `bg-white/80` 이상
- ❌ 과도한 애니메이션 → ✅ 의미 있는 곳에만

---

## 3. 정보 구조 + 라우팅

### 3-1. URL 구조

```
/                          대시보드 홈 (Bento)
/meetings                  회의록 리스트
/meetings/:id              회의록 상세 (풀페이지)
/projects                  프로젝트 칸반 보드
/projects/:id              프로젝트 상세 (모달 + URL 동기화)
/search?q=...              글로벌 검색 결과
/settings                  설정 (다크모드, 워크스페이스 이름)
```

**모달 + URL 동기화 패턴** (프로젝트 카드):
- 카드 클릭 → URL `push(/projects/:id)` + 모달 오픈
- Esc / 뒤로가기 / ✕ → URL 복원 + 모달 닫힘
- 새로고침 / 직접 링크 → 모달 즉시 열린 상태로 복원
- 풀스크린 토글 → URL 유지, UI 상태(Zustand)만 변경

회의록 상세는 풀페이지 (긴 콘텐츠에 적합), 프로젝트만 모달 패턴.

### 3-2. 좌측 사이드바

```
┌────────────────────────────┐
│ 🟦 Newtion          ⌘K     │
├────────────────────────────┤
│ 🏠 홈                      │
│ 📝 회의록                  │
│ 📋 프로젝트                │
├────────────────────────────┤
│ ⭐ 즐겨찾기                │
│   • (최대 10개)            │
├────────────────────────────┤
│ 📂 최근 항목 ▾             │
│   • (최근 5개)             │
├────────────────────────────┤
│         (여백)             │
├────────────────────────────┤
│ ⚙ 설정              🌗     │  ← 하단 고정
└────────────────────────────┘
```

- 접기 가능 (좁은 화면 / 사용자 토글). 접히면 아이콘만.
- `⌘K` (Mac) / `Ctrl+K` (Windows)로 글로벌 검색 모달.

### 3-3. 화면 목록

| # | 화면 | URL | 핵심 컴포넌트 |
|---|---|---|---|
| 1 | 대시보드 홈 | `/` | Bento 카드 그리드 5종 |
| 2 | 회의록 리스트 | `/meetings` | 카드 그리드 + 월별 섹션 + 그리드/리스트 토글 |
| 3 | 회의록 상세 | `/meetings/:id` | BlockNote 에디터 (풀페이지) + 메타 헤더 |
| 4 | 프로젝트 칸반 | `/projects` | 3컬럼 칸반 + 드래그 |
| 5 | 프로젝트 상세 | `/projects/:id` | 모달(기본) / 풀스크린 토글 + BlockNote |
| 6 | 글로벌 검색 | `/search?q=...` | 통합 검색 결과 |
| 7 | 설정 | `/settings` | 다크모드 / 워크스페이스 이름 |
| - | 404 | `*` | NotFound |

### 3-4. 글로벌 검색 (`⌘K`)

- 모달 형태, 어디서든 호출 가능
- 검색 대상: **회의록 / 프로젝트 제목** (본문 검색은 MVP 제외)
- 결과를 타입별 그룹 (회의록 / 프로젝트)
- 키보드 ↑↓ + Enter로 이동
- debounce 200ms

---

## 4. 핵심 화면 레이아웃

### 4-1. 대시보드 홈 (`/`) — Bento 그리드

5개 카드 (1×1, 2×1, 1×2 혼합):

1. **진행중 프로젝트** (2×1) — 진행중 상태 프로젝트 리스트, 진행률 바, "모두 보기" 링크
2. **빠른 액션** (1×1) — `+ 회의록`, `+ 프로젝트`, `⌘K 검색` 버튼
3. **최근 회의록** (1×1) — 최신 5개, 날짜 + 제목, "모두 보기"
4. **최근 변경된 페이지** (2×1) — 회의록/프로젝트 통합, "3시간 전" 같은 상대 시간
5. **즐겨찾기** (1×1) — 핀 고정 항목 최대 5개

각 카드: `rounded-[20px]`, `bg-white` (다크: `bg-neutral-900`), 호버 `scale-[1.02]` + 그림자 확장. 카드별 액센트 컬러를 좌측 보더 또는 헤딩에 살짝 사용.

### 4-2. 회의록 리스트 (`/meetings`)

- 상단: 페이지 제목 + `[+ 새 회의록]` 버튼
- 필터/검색: `[전체] [이번주] [지난달]` 칩 + 검색 입력 + 그리드(▦) / 리스트(☰) 토글
- 본문: **월별 섹션 헤딩**으로 그룹, 카드 그리드
- 카드 표시: 날짜(요일) / 제목 / 본문 미리보기 2줄 / `★ 핀 (옵션)`

`[+ 새 회의록]` 클릭 → 즉시 새 페이지 생성 (`POST /pages`) → `/meetings/:id`로 이동 → 빈 BlockNote 에디터 열림.

### 4-3. 회의록 상세 (`/meetings/:id`) — 풀페이지

- 헤더: `← 뒤로` / 제목 / `⋯ 메뉴 / ★ 핀 / 공유 (URL 복사)`
- 메타: `📅 날짜 / 🏷️ @멘션된 프로젝트 칩들`
- 본문: BlockNote 에디터 (슬래시 커맨드, 이미지/코드/파일/토글/체크박스 등)
- 자동 저장 인디케이터: 헤더 우측 "저장됨 ✓" / "저장 중..."

### 4-4. 프로젝트 칸반 (`/projects`)

- 상단: 페이지 제목 + `[+ 새 프로젝트]` 버튼
- 3개 컬럼: 🟦 예정 / 🟧 진행중 / 🟩 완료
- 컬럼 헤더: 상태 컬러 도트 + 카운트
- 카드 미리보기: 제목 / 본문 첫 2줄 / (진행중인 경우) 진행률 바 / 첨부 개수 배지
- 컬럼 하단: `+ 카드 추가`
- **드래그**: `@dnd-kit/sortable`로 카드 ↔ 컬럼 이동, 같은 컬럼 내 정렬 변경

### 4-5. 프로젝트 상세 모달 (`/projects/:id`)

- 기본 크기: `max-w-4xl max-h-[85vh]` 가운데 정렬, 뒤 칸반 흐릿하게
- 헤더: `⛶ 풀스크린 / ✕ 닫기`
- 메타바: 상태 드롭다운 / 진행률 / 마감일 / 태그
- 본문: BlockNote 에디터
- 하단: `📎 관련 회의록 (멘션된)` — `GET /pages?mentionedPageId=:id` 결과
- ⛶ 토글 → 화면 100% 풀스크린 (URL 유지). 다시 누르면 모달 사이즈로 복귀.

---

## 5. 데이터 모델 + API 인터페이스

### 5-1. 데이터 모델 (백엔드 모델 그대로)

```typescript
type Page = {
  _id: string;
  workspaceId: string;
  parentPageId: string | null;
  title: string;
  emoji?: string;
  icon?: string;
  coverUrl?: string;
  order: number;
  isArchived: boolean;
  isPublished: boolean;
  properties: PageProperties;
  creatorUserId?: string;
  lastEditedBy?: string;
  createdAt: string;
  updatedAt: string;
  removedAt: string | null;
};

type PageProperties = {
  // 분류
  type?: "meeting" | "project";
  role?: "meetings_root" | "projects_root";

  // 회의록
  date?: string;            // ISO 8601

  // 프로젝트
  status?: "planned" | "in_progress" | "done";
  progress?: number;        // 0-100
  dueDate?: string;
  tags?: string[];

  // 공통
  isPinned?: boolean;
  mentionedPageIds?: string[];
};

type Block = {
  _id: string;
  pageId: string;
  parentBlockId: string | null;
  type: BlockType;
  content: Record<string, unknown>;
  order: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  removedAt: string | null;
};

type BlockType =
  | "paragraph" | "heading_1" | "heading_2" | "heading_3"
  | "bulleted_list_item" | "numbered_list_item" | "to_do"
  | "quote" | "code" | "toggle"
  | "image" | "file" | "divider";

type FileRecord = {
  _id: string;
  name: string;
  type: "attachment" | "image";
  key: string;
  mimetype: string;
  bucket: string;
  size: number;
  // ...
};
```

### 5-2. API 엔드포인트 (mock 구현 + 백엔드 사양)

| Method | Path | 용도 |
|---|---|---|
| `GET` | `/workspaces` | 워크스페이스 리스트 (앱은 `[0]` 사용) |
| `POST` | `/workspaces` | 생성 — **응답에 `rootFolders: { meetings, projects }` 포함** ⭐ |
| `GET` | `/workspaces/:id/sidebar` | 사이드바 트리 |
| `GET` | `/pages?workspaceId&parentPageId=:rootId` | 회의록/프로젝트 리스트 |
| `GET` | `/pages?workspaceId&mentionedPageId=:pageId` | 역인덱스 (멘션한 페이지) ⭐ |
| `GET` | `/pages/search?workspaceId&query` | 제목 검색 |
| `POST` | `/pages` | 새 페이지 |
| `GET` | `/pages/:id/detail` | 페이지 + 블록 트리 |
| `PATCH` | `/pages/:id` | 메타/properties 변경 |
| `PATCH` | `/pages/reorder` | 칸반 정렬 |
| `DELETE` | `/pages/:id` | 삭제 |
| `POST` | `/blocks` | 블록 추가 |
| `POST` | `/blocks/batch` | 다수 추가 |
| `PATCH` | `/blocks/:id` | 수정 |
| `PATCH` | `/blocks/reorder` | 정렬 |
| `DELETE` | `/blocks/:id` | 삭제 |
| `POST` | `/files/upload-url` | presigned 업로드 |
| `POST` | `/files/:id/complete` | 업로드 완료 |
| `GET` | `/files/:id/download-url` | 다운로드 URL |

⭐ = 백엔드에 추후 변경 요청 ([`BACKEND_REQUESTS.md`](../../../BACKEND_REQUESTS.md) 참조). 현재 mock으로 구현.

### 5-3. 어댑터 레이어

```
src/api/
├─ client.ts             ← Axios + baseURL
├─ workspaces.ts         ← getWorkspaces, createWorkspace (rootFolders 처리)
├─ pages.ts              ← getPages, getPagesByMention, getPageDetail, ...
├─ blocks.ts
├─ files.ts
└─ blockAdapter.ts       ← BlockNote ↔ Backend Block 변환
```

백엔드 인터페이스가 우리 mock과 다를 경우 위 디렉토리만 수정. UI/Hook 레이어는 변경 없음.

### 5-4. Mock (MSW) 시드

- 워크스페이스 1개 ("Newtion")
- 두 루트 폴더 (`role: "meetings_root"`, `role: "projects_root"`)
- 회의록 5개 (4월, 다양한 날짜)
- 프로젝트 8개 (예정 3, 진행중 3, 완료 2)
- 일부 회의록은 프로젝트 멘션 (`mentionedPageIds` 시드)
- 각 페이지마다 BlockNote 콘텐츠를 백엔드 Block 트리로 변환한 시드 (어댑터 양방향 검증)

### 5-5. 자동 저장 패턴

```
유저 타이핑
  ↓ debounce(1000ms)
useMutation (PATCH /blocks/:id) — retry: 2
  ↓
optimistic update (즉시 캐시 갱신)
  ↓
서버 응답 → 인디케이터 "저장됨 ✓"
  ↓ (자동 재시도 2회 모두 실패 시)
롤백 + 인디케이터 "저장 실패" + Toast (수동 재시도 버튼)
```

> **참고**: TanStack Query 기본값은 `mutations.retry: 0`이지만, 자동 저장 mutation에만 예외적으로 `retry: 2, retryDelay: 1000`을 적용합니다 (7-2 참조).

### 5-6. 칸반 드래그 → 상태/순서 변경

```
드래그 종료
  ↓ 즉시 UI 업데이트 (status, order 변경)
PATCH /pages/:id {
  properties: { ...기존 properties, status: "in_progress" },
  order: <새 순서>
}
  ↓ 실패 시
롤백 + Toast "이동 실패"
```

---

## 6. 컴포넌트 / 디렉토리 / 상태 관리

### 6-1. 디렉토리 구조

```
newtion/
├─ NOTION_API.md
├─ BACKEND_REQUESTS.md
├─ design-system/newtion/MASTER.md
├─ docs/superpowers/specs/
│  └─ 2026-04-27-newtion-frontend-design.md   ← 본 문서
├─ public/
│  └─ mockServiceWorker.js
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ index.css
│  │
│  ├─ api/                           ← 어댑터 레이어
│  │  ├─ client.ts
│  │  ├─ workspaces.ts
│  │  ├─ pages.ts
│  │  ├─ blocks.ts
│  │  ├─ files.ts
│  │  └─ blockAdapter.ts
│  │
│  ├─ mocks/
│  │  ├─ browser.ts
│  │  ├─ handlers/{workspaces,pages,blocks,files}.ts
│  │  └─ db/{store.ts,seed.ts}
│  │
│  ├─ store/                          ← Zustand
│  │  ├─ themeStore.ts
│  │  ├─ sidebarStore.ts
│  │  ├─ commandPaletteStore.ts
│  │  └─ modalStore.ts
│  │
│  ├─ hooks/                          ← TanStack Query
│  │  ├─ useWorkspace.ts              (부트스트랩)
│  │  ├─ usePages.ts
│  │  ├─ usePageMutations.ts
│  │  ├─ useBlocks.ts
│  │  ├─ useBlockMutations.ts
│  │  └─ useSearch.ts
│  │
│  ├─ routes/                         ← React Router 페이지
│  │  ├─ HomePage.tsx
│  │  ├─ MeetingsListPage.tsx
│  │  ├─ MeetingDetailPage.tsx
│  │  ├─ ProjectsKanbanPage.tsx
│  │  ├─ SearchPage.tsx
│  │  ├─ SettingsPage.tsx
│  │  └─ NotFoundPage.tsx
│  │
│  ├─ components/
│  │  ├─ layout/{AppShell,Sidebar,TopBar}.tsx
│  │  ├─ home/{ProjectsInProgressCard, QuickActionsCard, RecentMeetingsCard, RecentChangesCard, FavoritesCard}.tsx
│  │  ├─ meetings/{MeetingCard, MeetingsGrid, MeetingHeader}.tsx
│  │  ├─ projects/{KanbanBoard, KanbanColumn, ProjectCard, ProjectModal, ProjectMetaBar, RelatedMeetings}.tsx
│  │  ├─ editor/{BlockEditor, MentionMenu, slashMenuItems}.ts(x)
│  │  ├─ search/{CommandPalette, SearchResultItem}.tsx
│  │  └─ ui/                          ← shadcn/ui 컴포넌트
│  │
│  ├─ lib/
│  │  ├─ cn.ts
│  │  ├─ extractMentions.ts
│  │  ├─ relativeTime.ts
│  │  └─ constants.ts
│  │
│  └─ types/{page, block, index}.ts
│
├─ index.html
├─ tailwind.config.ts                 ← 디자인 시스템 토큰
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
└─ .env                                ← VITE_API_BASE_URL, VITE_USE_MOCK
```

### 6-2. 상태 분담

| 상태 종류 | 도구 | 예시 |
|---|---|---|
| 서버 데이터 (캐시, 백그라운드 리페치, optimistic) | **TanStack Query** | pages, blocks, mentioned-by, search |
| 순수 클라이언트 UI 토글 | **Zustand** | theme, sidebar 접힘, 모달 풀스크린, ⌘K 모달 |
| 페이지 간 공유되는 / URL로 표현되는 | **React Router URL** | 현재 라우트, 모달 오픈 ID, 검색어 |

### 6-3. 부트스트랩 흐름

```
1. App 마운트
2. (개발) MSW worker.start()
3. useWorkspace() 훅
   ├─ GET /workspaces
   ├─ if 빈 배열 → POST /workspaces { name: "Newtion" }
   │  └─ 응답: { workspace, rootFolders: { meetings, projects } }
   ├─ workspace.id, rootFolders를 TanStack Query 캐시 + localStorage에 저장
   └─ ready = true
4. AppShell 렌더링 (사이드바 + 라우팅)
5. 라우트별 데이터 fetch 시작
```

부트스트랩 전: 풀스크린 스켈레톤 (`<AppBootstrapSkeleton />`).

### 6-4. URL ↔ 모달 동기화 (프로젝트 카드)

```typescript
// /projects 라우트 안에서
const { id } = useParams<{ id?: string }>();
const isModalOpen = !!id;

// 카드 클릭
navigate(`/projects/${cardId}`);

// 모달 닫기 (Esc, ✕, 뒤로가기)
navigate("/projects");

// 풀스크린 토글 (URL 유지)
const isFullscreen = useModalStore((s) => s.isFullscreen);
```

---

## 7. 에러 / 로딩 / 테스트 / 성능

### 7-1. 에러 카테고리별 처리

| 에러 | UX 처리 |
|---|---|
| 네트워크 끊김 | 상단 노란 배너 + TanStack Query 자동 재시도 |
| 자동 저장 실패 | 인디케이터 "재시도 중..." → 자동 재시도 2회 실패 시 인디케이터 "저장 실패" + Toast (수동 재시도 버튼) |
| 칸반 드래그 실패 | 낙관적 롤백 + Toast "이동 실패" |
| 모달 진입 시 페이지 없음 | 모달 안 "찾을 수 없음" + 칸반 복귀 버튼 |
| 부트스트랩 실패 | 풀스크린 에러 + 재시도 버튼 |
| React 런타임 에러 | `<ErrorBoundary>` → 폴백 + 새로고침 + 에러 ID |

### 7-2. TanStack Query 기본 설정

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,                    // 기본은 사용자 명시 액션이라 재시도 안 함
      onError: (error) => toast.error(getErrorMessage(error)),
    },
  },
});

// 예외: 자동 저장 mutation은 호출 시점에 옵션을 덮어씀
useMutation({
  mutationFn: (vars) => patchBlock(vars),
  retry: 2,
  retryDelay: 1000,
  // ...
});
```

### 7-3. 로딩 패턴

| 상황 | 패턴 |
|---|---|
| 부트스트랩 | 풀스크린 스켈레톤 |
| 리스트/칸반 | 카드 모양 shimmer 스켈레톤 |
| 페이지 상세 | 헤더 즉시 + 본문만 로딩 |
| 자동 저장 중 | 헤더 우측 "저장 중..." → "저장됨 ✓" |
| 칸반 드래그 | 낙관적 — 로딩 표시 안 함 |
| 검색 | debounce 200ms + spinner |
| 파일 업로드 | 블록 위 progress bar |

### 7-4. 테스트 전략

| 레벨 | 도구 | 무엇을 | 우선순위 |
|---|---|---|---|
| 유닛 | Vitest | `extractMentions`, `blockAdapter` 라운드트립, `relativeTime` | HIGH |
| 컴포넌트 | Vitest + RTL | KanbanBoard 드래그, ProjectModal, MentionMenu | MEDIUM |
| 통합 | Vitest + MSW | 부트스트랩, 페이지 생성→블록→자동 저장, 칸반 드래그 PATCH | HIGH |
| E2E | (보류) | — | LOW |

### 7-5. 핵심 테스트 케이스

```typescript
// 1. 블록 어댑터 라운드트립
test("blockAdapter: BlockNote → Backend → BlockNote == 원본", () => {
  const original = sampleBlockNoteContent;
  const backend = blockNoteToBackend(original, "page-1");
  const roundtrip = backendToBlockNote(backend);
  expect(roundtrip).toEqual(original);
});

// 2. 멘션 추출
test("extractMentions: 본문에서 ID들을 정확히 추출 (중복 제거)", () => {
  const blocks = blocksWithMentions(["pg_a", "pg_b", "pg_a"]);
  expect(extractMentions(blocks)).toEqual(["pg_a", "pg_b"]);
});

// 3. 부트스트랩
test("워크스페이스 없으면 자동 생성하고 두 루트 폴더 ID를 저장", async () => {
  // MSW로 빈 GET → POST { rootFolders: ... } 시퀀스
});

// 4. 칸반 드래그 (낙관적 업데이트 + 실패 롤백)
test("'진행중' 컬럼으로 드래그하면 PATCH /pages/:id 가 status='in_progress' 로 호출되고, 실패 시 카드가 원위치로 롤백된다", async () => {
  const onPatch = vi.fn();
  server.use(
    http.patch("/pages/:id", async ({ request }) => {
      onPatch(await request.json());
      return HttpResponse.json({ ok: true });
    }),
  );
  // 1) 카드를 '예정' → '진행중' 컬럼으로 드래그
  // 2) 즉시 '진행중' 컬럼에 카드 표시 (낙관적)
  // 3) PATCH /pages/:id 호출이 properties.status="in_progress" 로 발생했는지 확인
  expect(onPatch).toHaveBeenCalledWith(
    expect.objectContaining({
      properties: expect.objectContaining({ status: "in_progress" }),
    }),
  );
});
```

### 7-6. 접근성 자동 검증

- `vitest-axe`로 주요 페이지 a11y 자동 체크
- 키보드 네비 수동 체크리스트:
  - Tab 순서 = 시각적 순서
  - 모달 포커스 트랩 + Esc 닫기
  - ⌘K 어디서든 작동
  - 칸반 카드 키보드 이동 (`@dnd-kit` 기본 지원)

### 7-7. 성능 가이드라인

| 항목 | 기준 |
|---|---|
| 초기 번들 | gzip < 300KB (BlockNote 동적 import) |
| LCP | < 2.0s |
| 칸반 드래그 응답 | < 16ms (낙관적, RAF 내) |
| 자동 저장 debounce | 1000ms |
| 검색 debounce | 200ms |
| 호버 트랜지션 | 150-200ms |

```typescript
// BlockNote 에디터는 동적 import
const BlockEditor = lazy(() => import("@/components/editor/BlockEditor"));
```

---

## 8. 기술 스택 (확정)

```
Vite + React 18 + TypeScript
├─ UI:         shadcn/ui + Tailwind CSS
├─ Editor:     BlockNote.js
├─ Drag:       @dnd-kit/sortable
├─ State:      Zustand
├─ Routing:    React Router v6
├─ Server:     TanStack Query + Axios
├─ Mock:       MSW (개발 환경만)
├─ Icons:      Lucide
├─ Forms:      React Hook Form + Zod
├─ Toast:      Sonner (shadcn 통합)
└─ Test:       Vitest + React Testing Library + MSW + vitest-axe
```

---

## 9. 백엔드 통합 사양 (요약)

상세는 [`BACKEND_REQUESTS.md`](../../../BACKEND_REQUESTS.md). 핵심:

1. **역인덱스** ⭐ — `GET /pages?workspaceId&mentionedPageId=:id`
2. **부트스트랩** ⭐ — `POST /workspaces` 응답에 `rootFolders: { meetings, projects }`
3. **`properties` 규약** — `type`, `role`, `status`, `progress`, `dueDate`, `tags`, `isPinned`, `mentionedPageIds`, `date`
4. **워크스페이스 1개** 운영 (`GET /workspaces[0]`)

프론트는 위 인터페이스를 mock에서 먼저 구현. 백엔드가 동일하게 맞춰지면 mock 끔.

---

## 10. 개발 단계 (구현 순서 가이드)

> 상세 task breakdown은 다음 단계인 implementation plan에서 작성합니다. 본 spec은 무엇을 만들지를 정의하고, 어떻게 / 어떤 순서로는 plan에 위임합니다.

큰 단계만 표시:

1. 프로젝트 셋업 (Vite + Tailwind + shadcn + tsconfig)
2. 디자인 시스템 토큰 (Tailwind config) + 다크모드
3. AppShell 레이아웃 (사이드바 + TopBar) + 빈 라우트
4. MSW + 시드 + API 어댑터 + 부트스트랩 훅
5. 블록 어댑터 + BlockNote 통합
6. 회의록 (리스트 + 상세 + 자동 저장)
7. 프로젝트 칸반 + 카드 모달 + 드래그
8. `@멘션` + 역인덱스 (관련 회의록)
9. ⌘K 글로벌 검색
10. 즐겨찾기 / 최근 항목 / 홈 Bento
11. 폴리싱 (스켈레톤 / 에러 / a11y / 성능)

---

## 11. 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-04-27 | 초안 작성 |
