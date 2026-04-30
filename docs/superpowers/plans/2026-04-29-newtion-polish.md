# Newtion: 폴리싱 (에러 / 오프라인 / 부트스트랩 / 스켈레톤 / a11y) Implementation Plan (Plan 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan 1-5 까지 완성된 기능 위에 spec §7 의 *에러 / 로딩 / 테스트 / 성능* 가이드라인을 끝까지 적용한다. 운영 사용 가능한 MVP 의 마지막 단계 — React 런타임 에러 폴백, 네트워크 끊김 배너, 부트스트랩 실패 풀스크린 에러, 칸반/홈 스켈레톤, 자동 a11y 검증, 키보드 네비 통합 테스트, `prefers-reduced-motion` 호환.

**Architecture:**
- **단일 ErrorBoundary 클래스 + 다중 마운트 지점**: 한 `ErrorBoundary` 컴포넌트를 두 위치에 두 번 마운트. (1) `App.tsx` 가장 바깥 — 전체 앱 크래시 폴백, (2) `AppShell` 의 `<Outlet />` 감싸기 — 라우트 전환으로 회복 가능한 라우트별 폴백. 같은 컴포넌트지만 다른 props (메시지/회복 액션) 으로 차별.
- **에러 ID 생성**: `nanoid` 도입 없이 `crypto.randomUUID()` (브라우저 내장, jsdom 도 지원) 의 앞 8자. 디버그 보고용.
- **오프라인 감지**: `navigator.onLine` + `online`/`offline` 이벤트 리스너 → `useOnlineStatus` 훅. 노출되는 정보는 boolean 만; 재연결 시 TanStack Query 의 `queryClient.resumePausedMutations()` + `invalidateQueries({ refetchType: "active" })` 호출.
- **부트스트랩 풀스크린**: 현재 `useWorkspace` 는 컴포넌트 트리 안에서 실행되어 첫 렌더가 빈 상태로 노출됨. `App.tsx` 의 `<AppShell>` 마운트 직후 별도 *부트스트랩 게이트* 컴포넌트 (`<AppBootstrap>`) 가 `useWorkspace().isLoading` 시 풀스크린 스켈레톤, error 시 풀스크린 에러 + 재시도, ready 시 children 렌더.
- **스켈레톤 보강**: 칸반/홈/리스트의 빈 첫 렌더에 카드 모양 shimmer. 이미 Plan 2 에서 `MeetingsListSkeleton` 패턴이 있으니 그 형태 그대로 따름.
- **a11y 자동 검증**: `vitest-axe` 추가. 주요 페이지(홈, 회의록 리스트, 칸반, 검색 페이지) 에 대해 axe 위반 0 검증. WCAG 위반 발견 시 task 안에서 즉시 수정.
- **키보드 네비 통합 테스트**: 모달 포커스 트랩(Radix Dialog 기본), 칸반 카드 키보드 이동 (`@dnd-kit` 기본), ⌘K 흐름은 Plan 4 통합 테스트가 이미 검증. Plan 6 은 *NotFound 회복* + *ErrorBoundary 회복* 시나리오를 추가.
- **`prefers-reduced-motion`**: Tailwind `motion-reduce:` 변형으로 hover scale / 카드 transition 무력화. 적용 위치는 BentoCard, ProjectCard, MeetingCard.
- **Out of scope**: 컬러 컨트래스트 정밀 측정 (axe 가 자동 검증), 본문 검색, E2E (Playwright).

**Tech Stack (신규):**
- `vitest-axe` — a11y 자동 검증. dev 의존성 추가.
- 그 외 신규 라이브러리 없음.

---

## File Structure

**Modify:**
- `src/App.tsx` — 가장 바깥에 `<ErrorBoundary>` + `<AppBootstrap>` 게이트 추가.
- `src/components/layout/AppShell.tsx` — `<Outlet />` 을 `<ErrorBoundary>` 로 감쌈. `<OfflineBanner>` 마운트.
- `src/main.tsx` — QueryClient 의 `mutations.onError` 가 ErrorBoundary 와 충돌 안 하도록 정리 (변경 최소).
- `src/routes/ProjectsKanbanPage.tsx` — 로딩 시 `<KanbanBoardSkeleton>`.
- `src/routes/HomePage.tsx` — 로딩 시 `<HomeSkeleton>`.
- `src/components/projects/ProjectCard.tsx` / `src/components/meetings/MeetingCard.tsx` / `src/components/home/BentoCard.tsx` — `motion-reduce:` 변형 추가.
- `package.json` — `vitest-axe` 추가.

**Create (components/feedback/):**
- `src/components/feedback/ErrorBoundary.tsx` (+ `.test.tsx`) — React class boundary.
- `src/components/feedback/ErrorFallback.tsx` (+ `.test.tsx`) — 폴백 UI (메시지, 에러 ID, 재시도/새로고침).
- `src/components/feedback/OfflineBanner.tsx` (+ `.test.tsx`) — 상단 노란 배너.
- `src/components/feedback/AppBootstrap.tsx` (+ `.test.tsx`) — 워크스페이스 부트스트랩 게이트 (loading/error/ready).
- `src/components/feedback/AppBootstrapSkeleton.tsx` — 풀스크린 스켈레톤.
- `src/components/feedback/AppBootstrapError.tsx` — 풀스크린 에러 + 재시도.

**Create (components/skeletons/):**
- `src/components/skeletons/KanbanBoardSkeleton.tsx` — 3컬럼 placeholder.
- `src/components/skeletons/HomeSkeleton.tsx` — Bento 그리드 placeholder.

**Create (hooks):**
- `src/hooks/useOnlineStatus.ts` (+ `.test.tsx`) — `navigator.onLine` + 이벤트 동기화.

**Create (lib):**
- `src/lib/errorId.ts` (+ `.test.ts`) — 짧은 ID 생성 헬퍼.

**Create (test):**
- `src/test/axe.ts` — vitest-axe 셋업 (toHaveNoViolations 매처).
- `src/routes/HomePage.a11y.test.tsx` — 홈 axe 검증.
- `src/routes/ProjectsKanbanPage.a11y.test.tsx` — 칸반 axe 검증.
- `src/routes/MeetingsListPage.a11y.test.tsx` — 회의록 리스트 axe 검증.

---

## Task 1: `errorId` 헬퍼 (TDD)

**Files:**
- Create: `src/lib/errorId.ts`
- Test: `src/lib/errorId.test.ts`

**Why first:** ErrorFallback / ErrorBoundary 가 사용. 단순 함수라 5분.

- [ ] **Step 1: 테스트**

```ts
// src/lib/errorId.test.ts
import { describe, it, expect } from "vitest";
import { errorId } from "./errorId";

describe("errorId", () => {
  it("8자 hex 문자열을 반환한다", () => {
    const id = errorId();
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });

  it("연속 호출 시 다른 ID를 반환한다", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) ids.add(errorId());
    expect(ids.size).toBe(100);
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/lib/errorId.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
// src/lib/errorId.ts
export function errorId(): string {
  // crypto.randomUUID 는 jsdom 25+ 와 모든 모던 브라우저에서 지원.
  // 형식: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" — 앞 8자만 추출.
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2, 10).padEnd(8, "0");
  return uuid.replace(/-/g, "").slice(0, 8);
}
```

- [ ] **Step 4: 실행 → PASS + 커밋**

Run: `npx vitest run src/lib/errorId.test.ts`
Expected: PASS — 2/2.

```bash
git add src/lib/errorId.ts src/lib/errorId.test.ts
git commit -m "feat(lib): errorId — 8-char debug identifier"
```

---

## Task 2: `ErrorFallback` UI 컴포넌트 (TDD)

**Files:**
- Create: `src/components/feedback/ErrorFallback.tsx`
- Test: `src/components/feedback/ErrorFallback.test.tsx`

- [ ] **Step 1: 테스트**

```tsx
// src/components/feedback/ErrorFallback.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorFallback } from "./ErrorFallback";

describe("ErrorFallback", () => {
  it("주어진 메시지와 에러 ID 를 표시한다", () => {
    render(
      <ErrorFallback
        title="문제가 발생했어요"
        message="알 수 없는 오류"
        errorId="abc12345"
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText("문제가 발생했어요")).toBeInTheDocument();
    expect(screen.getByText("알 수 없는 오류")).toBeInTheDocument();
    expect(screen.getByText(/abc12345/)).toBeInTheDocument();
  });

  it("재시도 버튼 클릭 → onRetry 호출", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorFallback
        title="문제가 발생했어요"
        message="알 수 없는 오류"
        errorId="abc12345"
        onRetry={onRetry}
      />,
    );
    await user.click(screen.getByRole("button", { name: /재시도/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("onRetry 가 없으면 새로고침 버튼만 노출한다", () => {
    render(
      <ErrorFallback
        title="앱을 시작할 수 없어요"
        message="네트워크 연결을 확인해주세요"
        errorId="zz999999"
      />,
    );
    expect(screen.queryByRole("button", { name: /재시도/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /새로고침/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/components/feedback/ErrorFallback.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/feedback/ErrorFallback.tsx
import { AlertTriangle, RotateCw, RefreshCw } from "lucide-react";

interface Props {
  title: string;
  message: string;
  errorId: string;
  onRetry?: () => void;
  fullscreen?: boolean;
}

export function ErrorFallback({
  title,
  message,
  errorId,
  onRetry,
  fullscreen = false,
}: Props) {
  return (
    <div
      role="alert"
      className={
        fullscreen
          ? "min-h-screen flex items-center justify-center bg-page p-6"
          : "rounded-card border border-line bg-card p-6 max-w-md mx-auto"
      }
    >
      <div className="text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-cta mx-auto" aria-hidden />
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="text-sm text-muted-ink">{message}</p>
        <p className="text-[10px] text-muted-ink font-mono">
          오류 ID: {errorId}
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-brand text-white hover:opacity-90"
            >
              <RotateCw className="w-3.5 h-3.5" />
              재시도
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-line text-ink hover:bg-page"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 실행 → PASS + 커밋**

Run: `npx vitest run src/components/feedback/ErrorFallback.test.tsx`
Expected: PASS — 3/3.

```bash
git add src/components/feedback/ErrorFallback.tsx src/components/feedback/ErrorFallback.test.tsx
git commit -m "feat(feedback): ErrorFallback — error UI with retry/reload"
```

---

## Task 3: `ErrorBoundary` 컴포넌트 (TDD)

**Files:**
- Create: `src/components/feedback/ErrorBoundary.tsx`
- Test: `src/components/feedback/ErrorBoundary.test.tsx`

**Why:** React 의 componentDidCatch 패턴. resetKey prop 으로 라우트 전환 시 자동 리셋.

- [ ] **Step 1: 테스트**

```tsx
// src/components/feedback/ErrorBoundary.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("boom");
  return <div>safe</div>;
}

describe("ErrorBoundary", () => {
  // jsdom 의 console.error 가 React error boundary 메시지를 시끄럽게 출력하므로 silence.
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("자식이 에러를 안 던지면 자식을 그대로 렌더한다", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe")).toBeInTheDocument();
  });

  it("자식이 에러를 던지면 fallback 을 렌더한다 (기본 메시지)", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/문제가 발생/)).toBeInTheDocument();
  });

  it("재시도 버튼 클릭 → 자식을 다시 렌더하고 에러가 해결되면 정상 표시", async () => {
    const user = userEvent.setup();
    let throws = true;
    function Probe() {
      if (throws) throw new Error("boom");
      return <div>recovered</div>;
    }
    render(
      <ErrorBoundary>
        <Probe />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    throws = false;
    await user.click(screen.getByRole("button", { name: /재시도/i }));
    expect(screen.getByText("recovered")).toBeInTheDocument();
  });

  it("resetKey 가 바뀌면 boundary 가 자동으로 리셋된다", () => {
    let throws = true;
    function Probe() {
      if (throws) throw new Error("boom");
      return <div>recovered</div>;
    }
    const { rerender } = render(
      <ErrorBoundary resetKey="A">
        <Probe />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    throws = false;
    rerender(
      <ErrorBoundary resetKey="B">
        <Probe />
      </ErrorBoundary>,
    );
    expect(screen.getByText("recovered")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/components/feedback/ErrorBoundary.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/feedback/ErrorBoundary.tsx
import React from "react";
import { errorId as makeId } from "@/lib/errorId";
import { ErrorFallback } from "./ErrorFallback";

interface Props {
  /** 변경 시 boundary 자동 리셋 (라우트 전환 등). */
  resetKey?: string | number;
  /** Fallback 의 풀스크린 여부 */
  fullscreen?: boolean;
  /** 사용자에게 보여줄 제목/메시지 — 미제공 시 기본값. */
  title?: string;
  message?: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, errorId: "" };

  static getDerivedStateFromError(error: Error): State {
    return { error, errorId: makeId() };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, errorId: "" });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 운영 환경에서는 외부 로거로 보낼 수 있는 hook point.
    if (typeof console !== "undefined") {
      console.error("[ErrorBoundary]", error, info);
    }
  }

  handleRetry = () => {
    this.setState({ error: null, errorId: "" });
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          title={this.props.title ?? "문제가 발생했어요"}
          message={this.props.message ?? this.state.error.message}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          fullscreen={this.props.fullscreen}
        />
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 4: 실행 → PASS + 커밋**

Run: `npx vitest run src/components/feedback/ErrorBoundary.test.tsx`
Expected: PASS — 4/4.

```bash
git add src/components/feedback/ErrorBoundary.tsx src/components/feedback/ErrorBoundary.test.tsx
git commit -m "feat(feedback): ErrorBoundary — class boundary with resetKey"
```

---

## Task 4: AppShell + App 에 ErrorBoundary 마운트

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: App.tsx 수정**

```tsx
// src/App.tsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import HomePage from "@/routes/HomePage";
import MeetingsListPage from "@/routes/MeetingsListPage";
import MeetingDetailPage from "@/routes/MeetingDetailPage";
import ProjectsKanbanPage from "@/routes/ProjectsKanbanPage";
import ProjectDetailPage from "@/routes/ProjectDetailPage";
import SearchPage from "@/routes/SearchPage";
import SettingsPage from "@/routes/SettingsPage";
import NotFoundPage from "@/routes/NotFoundPage";

export default function App() {
  return (
    <ErrorBoundary
      fullscreen
      title="Newtion 을 시작할 수 없어요"
      message="앱이 예상치 못한 오류를 만났어요. 새로고침 또는 재시도를 눌러주세요."
    >
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="meetings" element={<MeetingsListPage />} />
              <Route path="meetings/:id" element={<MeetingDetailPage />} />
              <Route path="projects" element={<ProjectsKanbanPage />}>
                <Route path=":id" element={<ProjectDetailPage />} />
              </Route>
              <Route path="search" element={<SearchPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 2: AppShell.tsx 수정**

```tsx
// src/components/layout/AppShell.tsx
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/search/CommandPalette";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { useGlobalKeybindings } from "@/hooks/useGlobalKeybindings";

export function AppShell() {
  useGlobalKeybindings();
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-page text-ink">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          <ErrorBoundary
            resetKey={location.pathname}
            title="이 페이지를 표시할 수 없어요"
            message="이 페이지를 렌더링하다가 문제가 생겼어요. 다른 페이지로 이동하거나 재시도하세요."
          >
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
```

- [ ] **Step 3: 풀스위트 검증 + 커밋**

Run: `npx vitest run`
Expected: PASS — 두 ErrorBoundary 가 정상 자식들을 그대로 통과시켜야 함.

```bash
git add src/App.tsx src/components/layout/AppShell.tsx
git commit -m "feat(layout): mount ErrorBoundary at App + per-route"
```

---

## Task 5: `useOnlineStatus` 훅 (TDD)

**Files:**
- Create: `src/hooks/useOnlineStatus.ts`
- Test: `src/hooks/useOnlineStatus.test.tsx`

- [ ] **Step 1: 테스트**

```tsx
// src/hooks/useOnlineStatus.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "./useOnlineStatus";

describe("useOnlineStatus", () => {
  let originalOnLine: boolean;
  beforeEach(() => {
    originalOnLine = navigator.onLine;
  });
  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: originalOnLine,
    });
  });

  function setOnLine(value: boolean) {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value,
    });
  }

  it("초기 navigator.onLine 을 그대로 반환한다 (true)", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it("offline 이벤트 발생 시 false 로 전환", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());
    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);
  });

  it("online 이벤트 발생 시 true 로 전환", () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("언마운트 시 리스너 해제", () => {
    setOnLine(true);
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();
    const calls = removeSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain("online");
    expect(calls).toContain("offline");
  });
});
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/hooks/useOnlineStatus.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
// src/hooks/useOnlineStatus.ts
import { useEffect, useState } from "react";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
```

- [ ] **Step 4: 실행 → PASS + 커밋**

Run: `npx vitest run src/hooks/useOnlineStatus.test.tsx`
Expected: PASS — 4/4.

```bash
git add src/hooks/useOnlineStatus.ts src/hooks/useOnlineStatus.test.tsx
git commit -m "feat(hooks): useOnlineStatus — navigator.onLine + events"
```

---

## Task 6: `OfflineBanner` 컴포넌트 + AppShell 통합 (TDD)

**Files:**
- Create: `src/components/feedback/OfflineBanner.tsx`
- Test: `src/components/feedback/OfflineBanner.test.tsx`
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: 테스트**

```tsx
// src/components/feedback/OfflineBanner.test.tsx
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
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
```

- [ ] **Step 2: 실행 → FAIL**

Run: `npx vitest run src/components/feedback/OfflineBanner.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/feedback/OfflineBanner.tsx
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const qc = useQueryClient();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      qc.invalidateQueries({ refetchType: "active" });
    }
  }, [online, qc]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-status-progressBg text-status-progressFg text-sm py-2 px-4 flex items-center gap-2 border-b border-line"
    >
      <WifiOff className="w-4 h-4" />
      <span>오프라인 — 변경 사항이 저장되지 않을 수 있어요. 연결되면 자동으로 새로고침됩니다.</span>
    </div>
  );
}
```

- [ ] **Step 4: AppShell 에 마운트**

`src/components/layout/AppShell.tsx` 의 `<TopBar />` 위에 `<OfflineBanner />` 추가:

```tsx
import { OfflineBanner } from "@/components/feedback/OfflineBanner";

// JSX 변경: TopBar 위에 OfflineBanner
<div className="flex-1 flex flex-col">
  <OfflineBanner />
  <TopBar />
  <main className="flex-1 p-6 overflow-auto">
    <ErrorBoundary
      resetKey={location.pathname}
      title="이 페이지를 표시할 수 없어요"
      message="이 페이지를 렌더링하다가 문제가 생겼어요. 다른 페이지로 이동하거나 재시도하세요."
    >
      <Outlet />
    </ErrorBoundary>
  </main>
</div>
```

- [ ] **Step 5: 실행 → PASS + 커밋**

Run: `npx vitest run src/components/feedback/OfflineBanner.test.tsx src/components/layout/AppShell.test.tsx 2>/dev/null; npx vitest run`
Expected: PASS.

```bash
git add src/components/feedback/OfflineBanner.tsx src/components/feedback/OfflineBanner.test.tsx \
        src/components/layout/AppShell.tsx
git commit -m "feat(feedback): OfflineBanner + auto-refetch on reconnect"
```

---

## Task 7: 부트스트랩 게이트 — `AppBootstrapSkeleton` + `AppBootstrapError` + `AppBootstrap`

**Files:**
- Create: `src/components/feedback/AppBootstrapSkeleton.tsx`
- Create: `src/components/feedback/AppBootstrapError.tsx`
- Create: `src/components/feedback/AppBootstrap.tsx`
- Test: `src/components/feedback/AppBootstrap.test.tsx`
- Modify: `src/App.tsx`

**Why:** 현재 `useWorkspace` 가 ready 가 되기 전에도 자식들이 마운트되어 빈 상태가 노출됨. 게이트 컴포넌트가 ready 까지 풀스크린 스켈레톤 / 에러 / 재시도를 담당.

- [ ] **Step 1: AppBootstrapSkeleton (단순 표시 컴포넌트)**

```tsx
// src/components/feedback/AppBootstrapSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function AppBootstrapSkeleton() {
  return (
    <div className="min-h-screen flex bg-page">
      <aside className="w-60 border-r border-line p-4 space-y-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </aside>
      <main className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-3 gap-5">
          <Skeleton className="h-40 col-span-2" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40 col-span-2" />
          <Skeleton className="h-40" />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: AppBootstrapError**

```tsx
// src/components/feedback/AppBootstrapError.tsx
import { ErrorFallback } from "./ErrorFallback";
import { errorId as makeId } from "@/lib/errorId";

interface Props {
  error: unknown;
  onRetry: () => void;
}

export function AppBootstrapError({ error, onRetry }: Props) {
  const message =
    error instanceof Error ? error.message : "워크스페이스를 불러올 수 없어요";
  return (
    <ErrorFallback
      fullscreen
      title="Newtion 을 시작할 수 없어요"
      message={message}
      errorId={makeId()}
      onRetry={onRetry}
    />
  );
}
```

- [ ] **Step 3: AppBootstrap 게이트 + 테스트**

```tsx
// src/components/feedback/AppBootstrap.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import React from "react";
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
```

```tsx
// src/components/feedback/AppBootstrap.tsx
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/useWorkspace";
import { AppBootstrapSkeleton } from "./AppBootstrapSkeleton";
import { AppBootstrapError } from "./AppBootstrapError";

interface Props {
  children: React.ReactNode;
}

export function AppBootstrap({ children }: Props) {
  const ws = useWorkspace();
  const qc = useQueryClient();

  if (ws.isLoading) return <AppBootstrapSkeleton />;
  if (ws.error) {
    return (
      <AppBootstrapError
        error={ws.error}
        onRetry={() =>
          qc.invalidateQueries({ queryKey: ["bootstrap-workspace"] })
        }
      />
    );
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: App.tsx 에 AppBootstrap 끼워넣기**

```tsx
// src/App.tsx — ThemeProvider 안, BrowserRouter 바깥 또는 안 어디든 OK.
// AppShell 안에서 useWorkspace 가 호출되므로 게이트는 BrowserRouter 안쪽 + AppShell 바깥에 둔다.
import { AppBootstrap } from "@/components/feedback/AppBootstrap";

// JSX:
<ErrorBoundary fullscreen ...>
  <ThemeProvider>
    <BrowserRouter>
      <AppBootstrap>
        <Routes>
          <Route element={<AppShell />}>
            ...
          </Route>
        </Routes>
      </AppBootstrap>
    </BrowserRouter>
    <Toaster richColors position="top-right" />
  </ThemeProvider>
</ErrorBoundary>
```

- [ ] **Step 5: 실행 → PASS + 커밋**

Run: `npx vitest run src/components/feedback/AppBootstrap.test.tsx`
Expected: PASS — 2/2.

Run: `npx vitest run` (풀)
Expected: PASS.

```bash
git add src/components/feedback/AppBootstrap.tsx src/components/feedback/AppBootstrap.test.tsx \
        src/components/feedback/AppBootstrapSkeleton.tsx src/components/feedback/AppBootstrapError.tsx \
        src/App.tsx
git commit -m "feat(feedback): AppBootstrap gate — fullscreen skeleton/error/retry"
```

---

## Task 8: `KanbanBoardSkeleton` + ProjectsKanbanPage 통합

**Files:**
- Create: `src/components/skeletons/KanbanBoardSkeleton.tsx`
- Modify: `src/routes/ProjectsKanbanPage.tsx`

- [ ] **Step 1: 구현**

```tsx
// src/components/skeletons/KanbanBoardSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function KanbanBoardSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-5">
      {[0, 1, 2].map((col) => (
        <div key={col} className="space-y-3">
          <Skeleton className="h-6 w-24" />
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-20 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: ProjectsKanbanPage 가 로딩 시 스켈레톤 표시**

`src/routes/ProjectsKanbanPage.tsx` 의 로딩 분기 (`isLoading` 검사) 를 다음으로 교체. 정확한 줄은 `usePages` 호출 결과를 사용하는 부분:

```tsx
import { KanbanBoardSkeleton } from "@/components/skeletons/KanbanBoardSkeleton";

// JSX 안:
{projectsQuery.isLoading ? (
  <KanbanBoardSkeleton />
) : (
  <KanbanBoard ... />
)}
```

(만약 기존 코드가 다른 이름의 query 변수를 쓰면 그에 맞춤. `npx tsc -b --noEmit` 로 검증.)

- [ ] **Step 3: 빌드 + 커밋**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: PASS.

```bash
git add src/components/skeletons/KanbanBoardSkeleton.tsx src/routes/ProjectsKanbanPage.tsx
git commit -m "feat(skeletons): KanbanBoardSkeleton — 3-column shimmer"
```

---

## Task 9: `HomeSkeleton` + HomePage 통합

**Files:**
- Create: `src/components/skeletons/HomeSkeleton.tsx`
- Modify: `src/routes/HomePage.tsx`

- [ ] **Step 1: 구현**

```tsx
// src/components/skeletons/HomeSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function HomeSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-3 gap-5 auto-rows-min">
        <Skeleton className="h-40 col-span-2 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 col-span-2 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: HomePage 가 부트스트랩 후 첫 데이터 fetch 동안 스켈레톤 표시**

홈은 5개 카드 각자 자기 데이터를 fetch — 카드 단위로 이미 isLoading 분기가 있다. HomeSkeleton 은 첫 마운트 직후 (모든 카드가 동시에 isLoading) 한 박자 표시하는 용도. 간단한 패턴:

`src/routes/HomePage.tsx` 변경:

```tsx
import { useRecentPages } from "@/hooks/useRecentPages";
import { HomeSkeleton } from "@/components/skeletons/HomeSkeleton";
// ... 기존 import

export default function HomePage() {
  // 한 훅의 isLoading 으로 전체 첫 마운트 페이즈를 대표.
  // useRecentPages 가 모든 카드 중 가장 광범위한 query 라 첫 동기화가 가장 늦다.
  const recent = useRecentPages(1);
  if (recent.isLoading) return <HomeSkeleton />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      ...
    </div>
  );
}
```

- [ ] **Step 3: 빌드 + 커밋**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: PASS — 단, Plan 5 Task 16 의 `HomePage.test.tsx` 가 카드 헤더를 즉시 기대하는데 이제 첫 렌더는 스켈레톤. 테스트의 `await waitFor` 가 이미 있어 PASS 해야 함.

```bash
git add src/components/skeletons/HomeSkeleton.tsx src/routes/HomePage.tsx
git commit -m "feat(skeletons): HomeSkeleton — bento placeholder during first fetch"
```

---

## Task 10: `prefers-reduced-motion` 적용

**Files:**
- Modify: `src/components/projects/ProjectCard.tsx`
- Modify: `src/components/meetings/MeetingCard.tsx`
- Modify: `src/components/home/BentoCard.tsx`

**Why:** spec §2-5 — `prefers-reduced-motion` 존중. Tailwind 의 `motion-reduce:` 변형을 hover scale / transition 을 무력화하는 데 사용.

- [ ] **Step 1: ProjectCard 변경**

`src/components/projects/ProjectCard.tsx` 의 className:
```diff
- "transition-all duration-card hover:scale-[1.01]",
+ "transition-all duration-card hover:scale-[1.01]",
+ "motion-reduce:transition-none motion-reduce:hover:scale-100",
```

- [ ] **Step 2: MeetingCard 변경**

`src/components/meetings/MeetingCard.tsx` 의 className:
```diff
- "transition-all duration-card hover:scale-[1.02]",
+ "transition-all duration-card hover:scale-[1.02]",
+ "motion-reduce:transition-none motion-reduce:hover:scale-100",
```

- [ ] **Step 3: BentoCard 변경**

`src/components/home/BentoCard.tsx` 의 className:
```diff
- "shadow-elevation transition-shadow hover:shadow-elevation-hover",
+ "shadow-elevation transition-shadow hover:shadow-elevation-hover",
+ "motion-reduce:transition-none",
```

- [ ] **Step 4: 빌드 + 커밋**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: PASS.

```bash
git add src/components/projects/ProjectCard.tsx src/components/meetings/MeetingCard.tsx \
        src/components/home/BentoCard.tsx
git commit -m "feat(a11y): respect prefers-reduced-motion on hover transitions"
```

---

## Task 11: `vitest-axe` 셋업 + 첫 a11y 테스트 (HomePage)

**Files:**
- Modify: `package.json`
- Create: `src/test/axe.ts`
- Create: `src/routes/HomePage.a11y.test.tsx`

- [ ] **Step 1: 의존성 추가**

```bash
npm install --save-dev vitest-axe
```

이후 `package.json` 의 `devDependencies` 에 `vitest-axe` 가 들어가는지 확인.

- [ ] **Step 2: 매처 셋업**

```ts
// src/test/axe.ts
import { expect } from "vitest";
import * as matchers from "vitest-axe/matchers";
import "vitest-axe/extend-expect";

expect.extend(matchers);
```

`src/test/setup.ts` 의 끝에 추가:

```ts
// src/test/setup.ts 끝 줄에:
import "./axe";
```

- [ ] **Step 3: HomePage a11y 테스트**

```tsx
// src/routes/HomePage.a11y.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
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
```

- [ ] **Step 4: 실행**

Run: `npx vitest run src/routes/HomePage.a11y.test.tsx`
Expected: PASS.

위반이 발견되면 task 안에서 즉시 수정 — 흔한 위반: `<button>` 에 aria-label 없음, 같은 ID 중복, 컬러 컨트래스트. 수정 후 재실행.

- [ ] **Step 5: 커밋**

```bash
git add package.json package-lock.json src/test/axe.ts src/test/setup.ts src/routes/HomePage.a11y.test.tsx
git commit -m "test(a11y): vitest-axe setup + HomePage axe test"
```

---

## Task 12: 칸반 + 회의록 리스트 a11y 테스트

**Files:**
- Create: `src/routes/ProjectsKanbanPage.a11y.test.tsx`
- Create: `src/routes/MeetingsListPage.a11y.test.tsx`

**Why:** Plan 4-5 에서 가장 많이 변경된 두 페이지. 위반 발견 시 즉시 수정.

- [ ] **Step 1: ProjectsKanbanPage a11y**

```tsx
// src/routes/ProjectsKanbanPage.a11y.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import ProjectsKanbanPage from "./ProjectsKanbanPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ProjectsKanbanPage a11y", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("axe 위반이 없다", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/projects"]}>
          <Routes>
            <Route path="/projects/*" element={<ProjectsKanbanPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(container.querySelector("h1, h2")).toBeTruthy();
    });
    const result = await axe(container);
    expect(result).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: MeetingsListPage a11y**

```tsx
// src/routes/MeetingsListPage.a11y.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import MeetingsListPage from "./MeetingsListPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("MeetingsListPage a11y", () => {
  beforeEach(() => {
    resetDb();
    seed();
  });

  it("axe 위반이 없다", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <MeetingsListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(container.querySelector("h1, h2")).toBeTruthy();
    });
    const result = await axe(container);
    expect(result).toHaveNoViolations();
  });
});
```

- [ ] **Step 3: 실행 → 위반 수정**

Run: `npx vitest run src/routes/ProjectsKanbanPage.a11y.test.tsx src/routes/MeetingsListPage.a11y.test.tsx`
Expected: PASS — 위반 발견 시 다음 패턴으로 수정 후 재실행:
- 라벨 없는 버튼 → `aria-label` 추가
- `<img>` alt 누락 → `alt=""` (장식) 또는 의미 alt 추가
- 컬러 컨트래스트 미달 → `text-muted-ink` 보다 진한 토큰 사용

- [ ] **Step 4: 커밋**

```bash
git add src/routes/ProjectsKanbanPage.a11y.test.tsx src/routes/MeetingsListPage.a11y.test.tsx \
        $(git diff --name-only)
git commit -m "test(a11y): kanban + meetings list axe coverage + fixes"
```

(만약 `git diff --name-only` 에 수정된 src 파일이 더 있으면 함께 commit. 없으면 a11y 테스트 두 개만.)

---

## Task 13: 키보드 회복 통합 테스트 (NotFound + ErrorBoundary 회복)

**Files:**
- Create: `src/test/recovery.integration.test.tsx`

**Why:** 사용자가 잘못된 URL 진입 / 라우트 에러 후 다른 라우트로 회복하는 흐름이 깨지지 않는지 한 번에 검증. Plan 4 의 Mention/Search 통합 테스트, Plan 5 의 Home/Sidebar 검증과 함께 spec §7-1 의 "모달 진입 시 페이지 없음 / React 런타임 에러" 케이스를 마무리.

- [ ] **Step 1: 테스트**

```tsx
// src/test/recovery.integration.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import React from "react";
import { server } from "./msw";
import { resetDb } from "@/mocks/db/store";
import { seed } from "@/mocks/db/seed";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import NotFoundPage from "@/routes/NotFoundPage";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function Boom() {
  throw new Error("boom");
}

describe("recovery flows", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetDb();
    seed();
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("NotFound 라우트는 'Not Found' 표기와 홈 링크를 가진다", async () => {
    render(
      <MemoryRouter initialEntries={["/zzz-no-such-path"]}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/찾을 수 없|not found/i)).toBeInTheDocument();
  });

  it("ErrorBoundary 가 라우트 전환(resetKey 변경) 시 자동 리셋", async () => {
    let path = "/boom";
    function Probe() {
      return path === "/boom" ? <Boom /> : <div>safe</div>;
    }
    function Harness({ at }: { at: string }) {
      return (
        <ErrorBoundary resetKey={at}>
          <Probe />
        </ErrorBoundary>
      );
    }
    const { rerender } = render(<Harness at="/boom" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    path = "/safe";
    rerender(<Harness at="/safe" />);
    expect(screen.getByText("safe")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실행 → PASS + 커밋**

Run: `npx vitest run src/test/recovery.integration.test.tsx`
Expected: PASS — 2/2.

```bash
git add src/test/recovery.integration.test.tsx
git commit -m "test(integration): not-found + error-boundary recovery flows"
```

---

## Wrap-up

**완료 기준:**
- 모든 task PASS
- `npx vitest run` 풀스위트 PASS (Plan 3 끝의 알려진 flake `MeetingDetailPage.test.tsx` 는 풀스위트 ~30% 실패 — 회귀가 아님; Plan 4-5 의 새 테스트와 무관)
- `npm run build` PASS
- 수동 sanity:
  - 네트워크 끊고 (브라우저 devtools Offline 모드) → 상단 노란 OfflineBanner. 다시 연결 → 배너 사라지고 자동 refetch.
  - `useWorkspace` 가 실패하도록 모킹 (또는 백엔드 다운) → 풀스크린 에러 + "재시도" 버튼.
  - 잘못된 URL `/zzz` → NotFound 페이지.
  - 시스템 설정에서 "동작 줄이기" → 카드 hover 시 scale 안 함.
- a11y axe 검증: HomePage / 칸반 / 회의록 리스트 위반 0
- 번들: BlockNote dynamic import 가 작동 (`npm run build` 의 chunk 출력에서 BlockEditor 가 별도 chunk 로 분리)

**Plan 6 완료 후:**
- spec §10 의 모든 큰 단계 (1~11) 가 완료된다.
- 운영 사용 가능한 MVP 가 끝남.
- 향후 작업 후보 (out of scope, 별 plan): 인증, 본문 검색, 동시 편집, E2E.

---

## 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-04-29 | 초안 작성 (Plan 6 — 폴리싱: 에러/오프라인/부트스트랩/스켈레톤/a11y, 13 tasks) |
