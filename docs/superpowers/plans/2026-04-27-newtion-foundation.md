# Newtion Foundation Implementation Plan (Plan 1 / 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vite + React + TypeScript SPA가 부팅되어, MSW mock 백엔드와 통신해 워크스페이스/루트 폴더를 자동 생성하고, 다크모드 토글이 가능한 AppShell(사이드바 + 빈 라우트)을 보여주는 상태까지 만든다.

**Architecture:** 모든 비즈니스 로직은 `src/api` 어댑터 레이어 뒤에 두어 백엔드 인터페이스 변경에 격리된다. 서버 데이터는 TanStack Query, UI 토글은 Zustand, 라우트 상태는 React Router로 분담한다. 개발 환경에서는 MSW가 모든 HTTP 요청을 가로채고, 같은 mock이 통합 테스트(Vitest)에도 사용된다. BlockNote ↔ Backend Block 변환은 라운드트립 테스트로 보호되는 순수 함수 어댑터로 분리한다.

**색상 토큰 규칙(CSS 변수 기반):** 모든 색상 토큰은 `src/index.css`의 `:root`/`.dark` 블록에 HSL 채널(예: `174 84% 32%`)로 정의되고, `tailwind.config.ts`는 `hsl(var(--token) / <alpha-value>)` 형태로 매핑한다. 결과적으로 컴포넌트는 `bg-brand`/`text-ink`/`border-line` 한 번만 작성하고, 다크모드는 `<html class="dark">` 토글 시 변수가 자동 교체되며 처리된다. `dark:bg-brand-dark` 같은 페어링은 사용하지 않는다 (shadcn 스타일과 동일). 새 토큰 추가 시 `:root`(라이트)와 `.dark`(다크가 라이트와 다를 경우)에 모두 정의하고, Tailwind config에 `hsl(var(--name) / <alpha-value>)` 매핑을 추가한다.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, shadcn/ui, Zustand, TanStack Query v5, React Router v6, Axios, MSW v2, Vitest + React Testing Library, Sonner, Lucide.

**Plan 1 산출물:** `npm run dev`가 빈 라우트와 사이드바를 표시하고, 첫 부팅 시 `POST /workspaces`(MSW)로 워크스페이스가 자동 생성되어 localStorage에 저장됨. 다크모드 토글이 작동. `npm test`가 블록 어댑터 라운드트립 + 부트스트랩 통합 테스트를 통과.

**Plan 1 비포함(다음 plan):** 회의록/프로젝트/검색/홈 화면의 실제 데이터 표시 및 BlockNote 통합 (Plan 2~4).

---

## File Structure

이 plan에서 생성하는 파일:

```
newtion/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts
├─ vitest.config.ts
├─ tailwind.config.ts
├─ postcss.config.js
├─ components.json                       (shadcn/ui)
├─ .env.example
├─ .env.development
├─ .gitignore
├─ public/
│  └─ mockServiceWorker.js                (msw init이 생성)
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   ├─ index.css                           (Tailwind + 디자인 토큰 + 폰트)
   ├─ vite-env.d.ts
   ├─ test/
   │  ├─ setup.ts                         (vitest setup)
   │  └─ msw.ts                           (테스트용 MSW 서버)
   ├─ types/
   │  ├─ index.ts
   │  ├─ page.ts
   │  ├─ block.ts
   │  └─ file.ts
   ├─ lib/
   │  ├─ cn.ts
   │  └─ blockAdapter.ts
   ├─ api/
   │  ├─ client.ts
   │  ├─ workspaces.ts
   │  ├─ pages.ts
   │  ├─ blocks.ts
   │  └─ files.ts
   ├─ store/
   │  ├─ themeStore.ts
   │  ├─ sidebarStore.ts
   │  ├─ commandPaletteStore.ts
   │  └─ modalStore.ts
   ├─ mocks/
   │  ├─ browser.ts
   │  ├─ db/
   │  │  ├─ store.ts
   │  │  └─ seed.ts
   │  └─ handlers/
   │     ├─ index.ts
   │     ├─ workspaces.ts
   │     ├─ pages.ts
   │     ├─ blocks.ts
   │     └─ files.ts
   ├─ hooks/
   │  └─ useWorkspace.ts
   ├─ components/
   │  ├─ layout/
   │  │  ├─ AppShell.tsx
   │  │  ├─ Sidebar.tsx
   │  │  └─ TopBar.tsx
   │  ├─ theme/
   │  │  └─ ThemeProvider.tsx
   │  └─ ui/                              (shadcn 컴포넌트)
   └─ routes/
      ├─ HomePage.tsx
      ├─ MeetingsListPage.tsx
      ├─ MeetingDetailPage.tsx
      ├─ ProjectsKanbanPage.tsx
      ├─ ProjectDetailPage.tsx
      ├─ SearchPage.tsx
      ├─ SettingsPage.tsx
      └─ NotFoundPage.tsx
```

각 파일은 단일 책임을 가진다. 어댑터 파일들은 5-7개 함수만 노출하고, 컴포넌트는 100라인 이하 유지를 목표로 한다.

---

## Task 1: 프로젝트 스캐폴드 + 의존성 설치

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `.gitignore`, `.env.example`, `.env.development`

- [ ] **Step 1: 프로젝트 루트에서 Vite + React + TS 템플릿 생성**

```bash
cd /Users/baeg-yujin/Desktop/project/newtion
npm create vite@latest . -- --template react-ts
```

프롬프트가 디렉토리가 비어 있지 않다고 물으면 `Ignore files and continue` 선택. `package.json`이 docs/디자인시스템 옆에 생긴다.

- [ ] **Step 2: 런타임/툴 의존성 설치**

```bash
npm install react-router-dom@^6 \
  @tanstack/react-query@^5 \
  axios@^1 \
  zustand@^4 \
  lucide-react@^0.460 \
  sonner@^1 \
  clsx tailwind-merge \
  class-variance-authority
npm install -D tailwindcss@^3 postcss autoprefixer \
  msw@^2 \
  vitest@^1 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  @types/node
```

> 참고: BlockNote와 `@dnd-kit`은 Plan 2/3에서 추가한다. Foundation은 셸만 만든다.

- [ ] **Step 3: `tsconfig.json` 작성 (path alias `@/*` 추가)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "outDir": "./dist-tsc/app",
    "tsBuildInfoFile": "./dist-tsc/app/tsconfig.tsbuildinfo",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

> Vite/Vitest configs go in `tsconfig.node.json` only — they run in Node context.

- [ ] **Step 4: `tsconfig.node.json` 작성 (Vite/Vitest 설정용)**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "outDir": "./dist-tsc/node",
    "tsBuildInfoFile": "./dist-tsc/node/tsconfig.tsbuildinfo"
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: `vite.config.ts` 작성 (path alias)**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: { port: 5173 },
});
```

- [ ] **Step 6: `.env.example` + `.env.development` 작성**

`.env.example`:
```
VITE_API_BASE_URL=http://localhost:3035
VITE_USE_MOCK=true
```

`.env.development`:
```
VITE_API_BASE_URL=http://localhost:3035
VITE_USE_MOCK=true
```

- [ ] **Step 7: `.gitignore` 작성**

```
node_modules
dist
dist-ssr
dist-tsc
.env
.env.local
*.local
.DS_Store
.vscode/*
!.vscode/extensions.json
coverage
*.tsbuildinfo
```

- [ ] **Step 8: `src/App.tsx`를 임시 placeholder로 단순화**

```tsx
export default function App() {
  return <div>Newtion bootstrapping...</div>;
}
```

`src/main.tsx`는 Vite 템플릿 기본을 그대로 두되, `import "./index.css"`만 유지(아직 빈 파일이면 다음 task에서 채움).

- [ ] **Step 9: 빌드/실행 검증**

```bash
npm run dev
```

Expected: `Local: http://localhost:5173/`가 출력되고, 브라우저에서 "Newtion bootstrapping..." 표시. Ctrl+C로 종료.

```bash
npm run build
```

Expected: `dist/` 생성, 에러 없음.

- [ ] **Step 10: 커밋**

```bash
git init 2>/dev/null || true
git add -A
git commit -m "chore: scaffold Vite + React + TS project with deps"
```

---

## Task 2: Tailwind + 디자인 토큰 + 다크모드 CSS

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`, `src/index.css`

- [ ] **Step 1: Tailwind/PostCSS 초기화**

```bash
npx tailwindcss init -p
```

생성된 `tailwind.config.js`를 삭제하고 `tailwind.config.ts`로 다시 작성한다 (다음 단계).

```bash
rm tailwind.config.js
```

- [ ] **Step 2: `tailwind.config.ts` 작성 (CSS 변수 기반 토큰 매핑)**

각 색상 토큰은 단일 키로, `hsl(var(--token) / <alpha-value>)` 문자열을 값으로 가진다. `<alpha-value>` 플레이스홀더 덕분에 `bg-brand/10` 같은 opacity 유틸리티가 자동으로 작동한다. `safelist`는 필요하지 않다 — `:root`/`.dark` 블록을 `@layer base` 바깥(top-level)에 두면 Tailwind의 content purge에 영향을 받지 않고 그대로 살아남는다 (Step 3 참조, shadcn 공식 템플릿 구조와 동일).

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "hsl(var(--brand) / <alpha-value>)",
        cta: "hsl(var(--cta) / <alpha-value>)",
        page: "hsl(var(--page) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        "muted-ink": "hsl(var(--muted-ink) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        status: {
          plannedFg: "hsl(var(--status-planned-fg) / <alpha-value>)",
          plannedBg: "hsl(var(--status-planned-bg) / <alpha-value>)",
          progressFg: "hsl(var(--status-progress-fg) / <alpha-value>)",
          progressBg: "hsl(var(--status-progress-bg) / <alpha-value>)",
          doneFg: "hsl(var(--status-done-fg) / <alpha-value>)",
          doneBg: "hsl(var(--status-done-bg) / <alpha-value>)",
        },
        tag: {
          pink: "hsl(var(--accent-pink) / <alpha-value>)",
          violet: "hsl(var(--accent-violet) / <alpha-value>)",
          sky: "hsl(var(--accent-sky) / <alpha-value>)",
          rose: "hsl(var(--accent-rose) / <alpha-value>)",
        },
      },
      borderRadius: { card: "20px" },
      boxShadow: {
        elevation: "0 1px 3px rgba(0,0,0,0.05)",
        "elevation-hover": "0 4px 12px rgba(0,0,0,0.08)",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      transitionDuration: { card: "200ms" },
    },
  },
  plugins: [],
};

export default config;
```

> 참고: 기존 `muted` 토큰은 `muted-ink`로 이름을 바꿨다. shadcn(Task 4)이 주입하는 `--muted`는 *background* 토큰이라 충돌하기 때문이다. 컴포넌트는 `text-muted` 대신 `text-muted-ink`를 사용한다.

- [ ] **Step 3: `src/index.css` 작성 (Tailwind + CSS 변수 토큰 + 베이스 레이어)**

`:root`(라이트)와 `.dark`(다크) 블록에 HSL 채널을 정의한다. `hsl(...)` 래퍼는 사용하지 않고 `H S% L%` 포맷으로만 둔다 (Tailwind config에서 `hsl(var(--token) / <alpha-value>)`로 감싸므로). 다크에서는 라이트와 *값이 다른* 토큰만 재선언한다 (status/accent는 다크에서도 동일). `:root`/`.dark` 블록은 `@layer base` **바깥**(top-level)에 둔다 — 이 위치에서는 Tailwind의 content purge가 건드리지 않으므로 `safelist` 같은 우회 장치가 필요 없다 (shadcn 공식 템플릿 구조와 동일). 폰트/포커스/모션 같은 베이스 스타일만 `@layer base`로 감싼다.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand: 174 84% 32%;          /* #0D9488 */
  --cta: 25 95% 53%;             /* #F97316 */
  --page: 240 14% 96%;           /* #F5F5F7 */
  --card: 0 0% 100%;             /* #FFFFFF */
  --ink: 222 47% 11%;            /* #0F172A */
  --muted-ink: 215 19% 35%;      /* #475569 — renamed from "muted" to avoid shadcn collision */
  --line: 213 27% 91%;           /* #E2E8F0 */
  --status-planned-fg: 215 19% 47%;
  --status-planned-bg: 210 40% 96%;
  --status-progress-fg: 38 92% 50%;
  --status-progress-bg: 48 96% 89%;
  --status-done-fg: 160 84% 39%;
  --status-done-bg: 149 80% 90%;
  --accent-pink: 330 81% 60%;
  --accent-violet: 258 90% 66%;
  --accent-sky: 199 89% 48%;
  --accent-rose: 350 89% 60%;
}

.dark {
  --brand: 173 80% 40%;          /* #14B8A6 */
  --cta: 25 96% 61%;             /* #FB923C */
  --page: 0 0% 4%;               /* #0A0A0A */
  --card: 0 0% 9%;               /* #171717 */
  --ink: 210 40% 96%;            /* #F1F5F9 */
  --muted-ink: 215 20% 65%;      /* #94A3B8 */
  --line: 0 0% 15%;              /* #262626 */
  /* status + accent tokens unchanged in dark */
}

@layer base {
  html {
    font-family: theme("fontFamily.sans");
    color-scheme: light;
  }
  html.dark {
    color-scheme: dark;
  }
  body {
    @apply bg-page text-ink antialiased;
  }
  *:focus-visible {
    @apply outline-none ring-2 ring-brand ring-offset-2 ring-offset-page;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

> 참고: Google Fonts는 `@import` 대신 `index.html`의 `<link rel="stylesheet">`로 로드한다 (다음 단계). `<link>`가 LCP에 더 유리하다 — `@import`는 CSS 파싱이 끝나야 폰트 요청을 시작하지만 `<link>`는 HTML 파싱 중에 병렬로 시작된다.

- [ ] **Step 3.5: `index.html`에 Google Fonts `<link>` 추가**

`<head>`의 `<meta viewport>` 다음에 세 줄을 추가한다. `preconnect` 두 개로 DNS+TLS를 미리 따고, `display=swap`으로 폰트가 늦게 와도 텍스트가 즉시 보이게 한다.

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" />
```

LCP 관점에서 `<link>`가 `@import`보다 권장된다: `@import`는 CSS 다운로드+파싱이 끝나야 폰트 요청이 시작되지만 `<link>`는 HTML 파싱 중에 즉시 병렬 fetch된다.

- [ ] **Step 4: `App.tsx`에서 토큰 적용 확인용 마크업으로 임시 교체**

다크모드 페어링(`dark:X-dark`)이 사라졌다 — CSS 변수가 자동으로 라이트/다크를 전환한다. `text-muted` → `text-muted-ink` 이름 변경에도 유의.

```tsx
// Temporary token sanity-check page. Replaced by AppShell + router in Task 14.
export default function App() {
  return (
    <div className="min-h-screen bg-page text-ink p-8">
      <h1 className="text-2xl font-bold">Newtion</h1>
      <p className="text-muted-ink">Tailwind tokens online.</p>
      <div className="mt-4 rounded-card bg-card shadow-elevation p-6">
        <span className="text-brand font-semibold">Brand teal</span> /{" "}
        <span className="text-cta font-semibold">CTA orange</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 검증**

```bash
npm run dev
```

Expected: 오프화이트 배경, Plus Jakarta Sans 폰트, 카드 그림자 표시. 브라우저 devtools에서 `<html class="dark">`로 추가하면 다크 배경으로 전환.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: configure Tailwind with design tokens and dark mode"
```

---

## Task 3: Vitest + React Testing Library 셋업

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`, `src/lib/cn.ts`, `src/lib/cn.test.ts`
- Modify: `tsconfig.node.json` (add `vitest.config.ts` to `include`)

- [ ] **Step 1: `vitest.config.ts` 작성**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
```

- [ ] **Step 1b: `tsconfig.node.json`의 `include`에 `vitest.config.ts` 추가**

`vitest.config.ts` 파일이 이제 실제로 존재하므로, `tsconfig.node.json`의 `include` 배열에 추가하여 타입체크 대상이 되도록 한다 (Task 1 시점에는 forward reference가 되어 제외했었다). `tsconfig.json` (앱 프로젝트)에는 추가하지 않는다 — Vite/Vitest 설정은 Node 컨텍스트에서 실행되므로 `tsconfig.node.json`에만 속한다.

`tsconfig.node.json`:
```json
"include": ["vite.config.ts", "vitest.config.ts"]
```

확인:
```bash
npm run build
```
Expected: build 성공 (vitest.config.ts가 타입체크에 포함됨).

- [ ] **Step 2: `src/test/setup.ts` 작성**

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: `package.json`에 test 스크립트 추가**

`package.json`의 `"scripts"` 객체에 다음 키를 추가/병합:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: 실패 테스트 작성 — `src/lib/cn.test.ts`**

```ts
import { cn } from "./cn";

describe("cn", () => {
  it("merges tailwind classes and resolves conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-ink", false && "hidden", "font-bold"))
      .toBe("text-ink font-bold");
  });
});
```

> globals are configured (`globals: true` + `types: ["vitest/globals"]`), so test files don't need to import `describe`/`it`/`expect`.

- [ ] **Step 5: 테스트 실패 확인**

```bash
npm test -- cn
```

Expected: FAIL — `Cannot find module './cn'`.

- [ ] **Step 6: `src/lib/cn.ts` 구현**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
npm test -- cn
```

Expected: PASS, 1 test.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "test: configure Vitest + RTL with cn() smoke test"
```

---

## Task 4: shadcn/ui 초기화 + 핵심 컴포넌트 추가

> **shadcn ≥ 4.5.0 동작 차이 (실제 검증됨):** `init`은 Vite 친화 기본값 대신 Next 템플릿으로 진행하려 한다. `add`는 `src/index.css` / `tailwind.config.ts`를 **자동 머지하지 않는다**. 따라서 다음 절차를 따르라:
>
> 1. **Step 1을 건너뛰고** `components.json`을 직접 작성한다 (Step 1 코드 블록 참조).
> 2. **Step 3** (`add`)부터 진행한다.
> 3. `tailwindcss-animate`를 devDep으로 별도 설치하고 `tailwind.config.ts`에 ESM import + plugins에 등록한다 (`dialog`/`tooltip`/`dropdown-menu`의 `animate-in`/`fade-in-0`/`zoom-in-95`/`slide-in-from-*` 유틸리티에 필요).
> 4. **Step 4의 토큰 머지는 전부 수동**으로 작성한다.
> 5. **`accent`/`card` 네임스페이스 충돌 주의**: shadcn의 `card.tsx`는 `bg-card text-card-foreground`를, `Toaster`는 `--accent` 등을 쓴다. 우리 토큰 `card`(string)는 객체로 승격되며, 우리 4 accent는 `tag.*`로 분리된다 (Step 2.5 참조).
> 6. **`boxShadow.card`는 `colors.card`(객체)와 클래스 이름 충돌**한다. `boxShadow.elevation` 명칭을 사용한다 (Task 2의 토큰 정의 참조).

**Files:**
- Create: `components.json` (shadcn init 생성), `src/components/ui/*` (button, card, dialog, input, skeleton, sonner, scroll-area, separator, tooltip, dropdown-menu)

- [ ] **Step 1: shadcn 초기화**

```bash
npx shadcn@latest init
```

프롬프트 답변:
- TypeScript: `yes`
- Style: `default`
- Base color: `slate`
- CSS file: `src/index.css`
- CSS variables: `yes`
- Tailwind config: `tailwind.config.ts`
- Aliases: `@/components`, `@/lib/utils` → 묻는 경우 `@/lib/cn`로 두지 말고 기본 `@/lib/utils`로 둔다 (다음 단계에서 cn export 정합 처리).
- React Server Components: `no`
- Write components.json: `yes`

- [ ] **Step 2: `src/lib/utils.ts`를 cn re-export로 정리**

shadcn이 `src/lib/utils.ts`를 만들었으면 내용을 다음으로 교체:

```ts
export { cn } from "./cn";
```

이렇게 두면 shadcn 컴포넌트(`@/lib/utils`에서 cn import)와 우리 코드(`@/lib/cn`) 둘 다 동일 구현을 본다.

- [ ] **Step 3: 베이스 컴포넌트 설치**

```bash
npx shadcn@latest add button card dialog input skeleton sonner scroll-area separator tooltip dropdown-menu
```

`src/components/ui/`에 컴포넌트들이 생성된다.

- [ ] **Step 4: shadcn이 `index.css`에 추가한 CSS 변수 블록을 우리 토큰과 병합**

⚠️ **주의:** Task 2에서 이미 `:root`/`.dark` 블록을 만들고 우리 프로젝트 토큰(`--brand`, `--cta`, `--page`, `--card`, `--ink`, `--muted-ink`, `--line`, status/accent)을 정의했다. shadcn init은 같은 셀렉터에 슬레이트 기반 HSL 변수(`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius` 등)를 주입한다. shadcn init이 **우리 토큰 라인을 지우지 않도록 주의** — init 후 diff를 확인하고, 우리 토큰 라인과 shadcn 변수가 둘 다 `:root`/`.dark` 블록 안에 공존하도록 수동 병합한다.

병합 결과 예시(`:root`):
```css
:root {
  /* 우리 프로젝트 토큰 (Task 2에서 정의) */
  --brand: 174 84% 32%;
  --cta: 25 95% 53%;
  --page: 240 14% 96%;
  --card: 0 0% 100%;
  --ink: 222 47% 11%;
  --muted-ink: 215 19% 35%;
  --line: 213 27% 91%;
  /* ... status/accent ... */

  /* shadcn 슬레이트 기반 변수 (이번 단계에서 추가) */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 174 84% 32%;          /* shadcn primary를 우리 brand teal과 동일 값으로 매핑 */
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;          /* shadcn의 --muted는 background 토큰; 우리 --muted-ink와 다름 */
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 174 84% 32%;             /* shadcn ring을 brand로 매핑 */
  --radius: 0.5rem;
}
```

`.dark` 블록도 동일하게: 우리 다크 토큰 라인(Task 2)을 보존하고 shadcn 다크 변수를 그 옆에 추가하되, `--primary` / `--ring`은 `173 80% 40%` (브랜드 다크) 값으로 설정한다.

> 운영 원칙: **shadcn 컴포넌트는 `--primary`를 읽고, 우리 컴포넌트는 `--brand`를 읽는다.** 두 변수의 *값*을 같게 유지하면 시각적 일관성이 보장되고, 향후 둘 중 하나만 바꿔야 할 때(예: shadcn primary는 그대로 두고 brand만 새 색으로) 분리 가능성도 남는다. `--muted`는 shadcn의 background 토큰이고 우리 `--muted-ink`는 텍스트 토큰이므로 이름이 비슷해 보여도 별개임을 기억한다.

- [ ] **Step 5: Sonner Toaster를 App에 마운트할 자리 확인 (실제 마운트는 Task 12에서)**

이 단계에서는 import만 검증.

```bash
npm run build
```

Expected: 타입/빌드 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: install shadcn/ui base components + align brand color"
```

---

## Task 5: TypeScript 타입 정의

**Files:**
- Create: `src/types/page.ts`, `src/types/block.ts`, `src/types/file.ts`, `src/types/index.ts`

- [ ] **Step 1: `src/types/page.ts`**

```ts
export type PageRole = "meetings_root" | "projects_root";
export type PageType = "meeting" | "project";
export type ProjectStatus = "planned" | "in_progress" | "done";

export interface PageProperties {
  type?: PageType;
  role?: PageRole;
  // 회의록
  date?: string;
  // 프로젝트
  status?: ProjectStatus;
  progress?: number;
  dueDate?: string;
  tags?: string[];
  // 공통
  isPinned?: boolean;
  mentionedPageIds?: string[];
}

export interface Page {
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
}

export interface PageDetail {
  page: Page;
  blocks: import("./block").Block[];
  blockTree: import("./block").BlockTreeNode[];
}

export interface RootFolders {
  meetings: string;
  projects: string;
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  ownerUserId?: string;
  createdAt: string;
  updatedAt: string;
  removedAt: string | null;
}

export interface CreateWorkspaceResponse {
  workspace: Workspace;
  rootFolders: RootFolders;
}
```

- [ ] **Step 2: `src/types/block.ts`**

```ts
export type BlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list_item"
  | "numbered_list_item"
  | "to_do"
  | "quote"
  | "code"
  | "toggle"
  | "image"
  | "file"
  | "divider";

export interface Block {
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
}

export interface BlockTreeNode extends Block {
  children: BlockTreeNode[];
}
```

- [ ] **Step 3: `src/types/file.ts`**

```ts
export interface FileRecord {
  _id: string;
  name: string;
  type: "attachment" | "image";
  folder_id?: string | null;
  folder_type?: string | null;
  key: string;
  checksum?: string | null;
  user_id?: string | null;
  mimetype: string;
  bucket: string;
  size: number;
  created_at: string;
  updated_at: string;
  removed_at: string | null;
}

export interface UploadUrlResponse {
  fileId: string;
  uploadUrl: string;
  key: string;
}
```

- [ ] **Step 4: `src/types/index.ts`**

```ts
export * from "./block";
export * from "./file";
export * from "./page";
```

- [ ] **Step 5: 타입체크 검증**

```bash
npm run build
```

Expected: 통과 (App.tsx는 아직 타입을 사용하지 않음).

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: define core domain types (Page, Block, File, Workspace)"
```

---

## Task 6: Block Adapter (TDD, 라운드트립 보장)

**Files:**
- Create: `src/lib/blockAdapter.ts`, `src/lib/blockAdapter.test.ts`

목적: BlockNote가 사용하는 형식 ↔ 백엔드 `Block` 평탄 리스트(`parentBlockId` + `order`) 변환을 캡슐화. BlockNote 라이브러리는 Plan 2에서 도입하지만, 어댑터 자체는 **순수 함수 + 자체 정의 입력 형식**이므로 미리 만든다. Plan 2에서 BlockNote의 `Block[]` 모양에 맞추기 위해 입력 타입을 `BlockNoteLikeBlock`으로 분리하고 의존성 없이 작성한다.

- [ ] **Step 1: 실패 테스트 작성 — `src/lib/blockAdapter.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  blockNoteToBackend,
  backendToBlockNote,
  type BlockNoteLikeBlock,
} from "./blockAdapter";

const sample: BlockNoteLikeBlock[] = [
  {
    id: "b1",
    type: "heading_1",
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
        type: "bulleted_list_item",
        props: {},
        content: [{ type: "text", text: "child", styles: {} }],
        children: [],
      },
    ],
  },
];

describe("blockAdapter", () => {
  it("flattens children with parentBlockId and order", () => {
    const out = blockNoteToBackend(sample, "page-1");
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({
      _id: "b1", pageId: "page-1", parentBlockId: null, order: 0,
    });
    expect(out[1]).toMatchObject({
      _id: "b2", parentBlockId: null, order: 1,
    });
    expect(out[2]).toMatchObject({
      _id: "b2c1", parentBlockId: "b2", order: 0,
    });
  });

  it("roundtrips: BlockNote → Backend → BlockNote equals original", () => {
    const backend = blockNoteToBackend(sample, "page-1");
    const roundtrip = backendToBlockNote(backend);
    expect(roundtrip).toEqual(sample);
  });

  it("returns empty array for empty input", () => {
    expect(blockNoteToBackend([], "page-1")).toEqual([]);
    expect(backendToBlockNote([])).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test -- blockAdapter
```

Expected: FAIL — `Cannot find module './blockAdapter'`.

- [ ] **Step 3: `src/lib/blockAdapter.ts` 구현**

```ts
import type { Block, BlockType } from "@/types/block";

export interface BlockNoteInlineContent {
  type: "text" | "link";
  text?: string;
  href?: string;
  styles?: Record<string, unknown>;
  content?: BlockNoteInlineContent[];
}

export interface BlockNoteLikeBlock {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  content: BlockNoteInlineContent[];
  children: BlockNoteLikeBlock[];
}

export type BlockInput = Pick<
  Block,
  "_id" | "pageId" | "parentBlockId" | "type" | "content" | "order"
>;

export function blockNoteToBackend(
  blocks: BlockNoteLikeBlock[],
  pageId: string,
  parentBlockId: string | null = null,
): BlockInput[] {
  const out: BlockInput[] = [];
  blocks.forEach((b, index) => {
    out.push({
      _id: b.id,
      pageId,
      parentBlockId,
      type: b.type,
      content: { props: b.props, inline: b.content },
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
      return {
        id: b._id,
        type: b.type,
        props: c.props ?? {},
        content: c.inline ?? [],
        children: build(b._id),
      };
    });
  };

  return build(null);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test -- blockAdapter
```

Expected: PASS, 3 tests.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(adapter): block adapter with BlockNote ↔ backend roundtrip test"
```

---

## Task 7: API 클라이언트 (Axios)

**Files:**
- Create: `src/api/client.ts`

- [ ] **Step 1: `src/api/client.ts` 작성**

```ts
import axios, { AxiosError } from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3035";

export const api = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

export interface ApiErrorShape {
  message: string;
  status?: number;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
```

- [ ] **Step 2: 빌드 검증**

```bash
npm run build
```

Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat(api): axios client with baseURL and error helper"
```

---

## Task 8: API 어댑터 — Workspaces + Pages

**Files:**
- Create: `src/api/workspaces.ts`, `src/api/pages.ts`

- [ ] **Step 1: `src/api/workspaces.ts` 작성**

```ts
import { api } from "./client";
import type {
  Workspace,
  CreateWorkspaceResponse,
} from "@/types/page";

export async function getWorkspaces(): Promise<Workspace[]> {
  const { data } = await api.get<Workspace[]>("/workspaces");
  return data;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  icon?: string;
  ownerUserId?: string;
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<CreateWorkspaceResponse> {
  const { data } = await api.post<CreateWorkspaceResponse>(
    "/workspaces",
    input,
  );
  return data;
}

export interface SidebarTreeNode {
  _id: string;
  title: string;
  emoji?: string;
  icon?: string;
  children: SidebarTreeNode[];
}

export interface SidebarResponse {
  workspace: Workspace;
  tree: SidebarTreeNode[];
  flatCount: number;
}

export async function getSidebar(
  workspaceId: string,
  options: { includeArchived?: boolean } = {},
): Promise<SidebarResponse> {
  const { data } = await api.get<SidebarResponse>(
    `/workspaces/${workspaceId}/sidebar`,
    { params: options.includeArchived ? { includeArchived: true } : undefined },
  );
  return data;
}
```

- [ ] **Step 2: `src/api/pages.ts` 작성**

```ts
import { api } from "./client";
import type { Page, PageDetail, PageProperties } from "@/types/page";

export interface ListPagesParams {
  workspaceId: string;
  parentPageId?: string | null;
  mentionedPageId?: string;
  includeArchived?: boolean;
}

export async function getPages(params: ListPagesParams): Promise<Page[]> {
  const { data } = await api.get<Page[]>("/pages", {
    params: {
      workspaceId: params.workspaceId,
      parentPageId: params.parentPageId === null ? "null" : params.parentPageId,
      mentionedPageId: params.mentionedPageId,
      includeArchived: params.includeArchived ? true : undefined,
    },
  });
  return data;
}

export async function searchPages(
  workspaceId: string,
  query: string,
): Promise<Page[]> {
  const { data } = await api.get<Page[]>("/pages/search", {
    params: { workspaceId, query },
  });
  return data;
}

export async function getPageDetail(pageId: string): Promise<PageDetail> {
  const { data } = await api.get<PageDetail>(`/pages/${pageId}/detail`);
  return data;
}

export interface CreatePageInput {
  workspaceId: string;
  parentPageId: string | null;
  title?: string;
  emoji?: string;
  icon?: string;
  order?: number;
  properties?: PageProperties;
  creatorUserId?: string;
}

export async function createPage(input: CreatePageInput): Promise<Page> {
  const { data } = await api.post<Page>("/pages", input);
  return data;
}

export interface UpdatePageInput {
  title?: string;
  emoji?: string;
  icon?: string;
  parentPageId?: string | null;
  order?: number;
  isArchived?: boolean;
  properties?: PageProperties;
  lastEditedBy?: string;
}

export async function updatePage(
  pageId: string,
  input: UpdatePageInput,
): Promise<Page> {
  const { data } = await api.patch<Page>(`/pages/${pageId}`, input);
  return data;
}

export interface ReorderPagesItem {
  pageId: string;
  order: number;
  parentPageId?: string | null;
}

export async function reorderPages(items: ReorderPagesItem[]): Promise<void> {
  await api.patch("/pages/reorder", { items });
}

export async function deletePage(pageId: string): Promise<void> {
  await api.delete(`/pages/${pageId}`);
}
```

- [ ] **Step 3: 빌드 검증**

```bash
npm run build
```

Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat(api): workspaces + pages adapters"
```

---

## Task 9: API 어댑터 — Blocks + Files

**Files:**
- Create: `src/api/blocks.ts`, `src/api/files.ts`

- [ ] **Step 1: `src/api/blocks.ts` 작성**

```ts
import { api } from "./client";
import type { Block, BlockType, BlockTreeNode } from "@/types/block";

export interface ListBlocksParams {
  pageId?: string;
  parentBlockId?: string | null;
}

export async function getBlocks(params: ListBlocksParams): Promise<Block[]> {
  const { data } = await api.get<Block[]>("/blocks", {
    params: {
      pageId: params.pageId,
      parentBlockId: params.parentBlockId === null ? "null" : params.parentBlockId,
    },
  });
  return data;
}

export interface BlockTreeResponse {
  blocks: Block[];
  tree: BlockTreeNode[];
}

export async function getBlockTree(pageId: string): Promise<BlockTreeResponse> {
  const { data } = await api.get<BlockTreeResponse>("/blocks/tree", {
    params: { pageId },
  });
  return data;
}

export interface CreateBlockInput {
  pageId: string;
  parentBlockId?: string | null;
  type: BlockType;
  content: Record<string, unknown>;
  order: number;
  createdBy?: string;
  updatedBy?: string;
}

export async function createBlock(input: CreateBlockInput): Promise<Block> {
  const { data } = await api.post<Block>("/blocks", input);
  return data;
}

export async function createBlocksBatch(
  items: CreateBlockInput[],
): Promise<Block[]> {
  const { data } = await api.post<Block[]>("/blocks/batch", { items });
  return data;
}

export interface UpdateBlockInput {
  type?: BlockType;
  content?: Record<string, unknown>;
  order?: number;
  parentBlockId?: string | null;
  updatedBy?: string;
}

export async function updateBlock(
  blockId: string,
  input: UpdateBlockInput,
): Promise<Block> {
  const { data } = await api.patch<Block>(`/blocks/${blockId}`, input);
  return data;
}

export interface ReorderBlocksItem {
  blockId: string;
  order: number;
  parentBlockId?: string | null;
}

export async function reorderBlocks(items: ReorderBlocksItem[]): Promise<void> {
  await api.patch("/blocks/reorder", { items });
}

export async function deleteBlock(blockId: string): Promise<void> {
  await api.delete(`/blocks/${blockId}`);
}
```

- [ ] **Step 2: `src/api/files.ts` 작성**

```ts
import { api } from "./client";
import type { FileRecord, UploadUrlResponse } from "@/types/file";

export interface CreateUploadUrlInput {
  name: string;
  type: "attachment" | "image";
  mimetype: string;
  size: number;
  folder_id?: string | null;
  folder_type?: string | null;
  user_id?: string | null;
  checksum?: string | null;
}

export async function createUploadUrl(
  input: CreateUploadUrlInput,
): Promise<UploadUrlResponse> {
  const { data } = await api.post<UploadUrlResponse>(
    "/files/upload-url",
    input,
  );
  return data;
}

export async function completeUpload(
  fileId: string,
  body: { size: number; checksum?: string },
): Promise<FileRecord> {
  const { data } = await api.post<FileRecord>(
    `/files/${fileId}/complete`,
    body,
  );
  return data;
}

export async function getDownloadUrl(fileId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(
    `/files/${fileId}/download-url`,
  );
  return data.url;
}
```

- [ ] **Step 3: 빌드 검증**

```bash
npm run build
```

Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat(api): blocks + files adapters"
```

---

## Task 10: Zustand 스토어 (theme / sidebar / commandPalette / modal)

**Files:**
- Create: `src/store/themeStore.ts`, `src/store/themeStore.test.ts`, `src/store/sidebarStore.ts`, `src/store/commandPaletteStore.ts`, `src/store/modalStore.ts`

- [ ] **Step 1: 실패 테스트 작성 — `src/store/themeStore.test.ts`**

```ts
import { describe, expect, it, beforeEach } from "vitest";
import { useThemeStore } from "./themeStore";

describe("themeStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ mode: "system" });
  });

  it("cycles system → light → dark → system", () => {
    const { cycle } = useThemeStore.getState();
    expect(useThemeStore.getState().mode).toBe("system");
    cycle();
    expect(useThemeStore.getState().mode).toBe("light");
    cycle();
    expect(useThemeStore.getState().mode).toBe("dark");
    cycle();
    expect(useThemeStore.getState().mode).toBe("system");
  });

  it("persists mode to localStorage", () => {
    useThemeStore.getState().setMode("dark");
    expect(localStorage.getItem("newtion-theme")).toContain("dark");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test -- themeStore
```

Expected: FAIL — `Cannot find module './themeStore'`.

- [ ] **Step 3: `src/store/themeStore.ts` 구현**

```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;
}

const order: ThemeMode[] = ["system", "light", "dark"];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "system",
      setMode: (mode) => set({ mode }),
      cycle: () => {
        const next = order[(order.indexOf(get().mode) + 1) % order.length];
        set({ mode: next });
      },
    }),
    {
      name: "newtion-theme",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test -- themeStore
```

Expected: PASS, 2 tests.

- [ ] **Step 5: `src/store/sidebarStore.ts` 작성**

```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (v) => set({ collapsed: v }),
    }),
    {
      name: "newtion-sidebar",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
```

- [ ] **Step 6: `src/store/commandPaletteStore.ts` 작성**

```ts
import { create } from "zustand";

interface CommandPaletteState {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
```

- [ ] **Step 7: `src/store/modalStore.ts` 작성**

```ts
import { create } from "zustand";

interface ModalState {
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
  toggleFullscreen: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  fullscreen: false,
  setFullscreen: (v) => set({ fullscreen: v }),
  toggleFullscreen: () => set((s) => ({ fullscreen: !s.fullscreen })),
}));
```

- [ ] **Step 8: 빌드 + 테스트 검증**

```bash
npm test
npm run build
```

Expected: 모든 테스트 PASS, 빌드 통과.

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat(store): theme/sidebar/commandPalette/modal Zustand stores"
```

- [ ] **Step 10: Sonner를 themeStore에 연결 (Task 4 TODO 해소)**

Task 4에서 sonner.tsx가 `next-themes`의 useTheme을 사용한 채 남겨두었다 (themeStore가 없었기 때문). 이제 `useThemeStore`가 존재하므로 다음 변경:

`src/components/ui/sonner.tsx`:
```tsx
import { useThemeStore } from "@/store/themeStore";
import { Toaster as Sonner, type ToasterProps } from "sonner";
// (TODO 주석 + next-themes import 제거)

const Toaster = (props: ToasterProps) => {
  const mode = useThemeStore((s) => s.mode);
  return (
    <Sonner
      theme={mode as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{...}}  // 기존 유지
      {...props}
    />
  );
};
```

```bash
npm uninstall next-themes
npm test
npm run build
git add -A
git commit -m "chore(ui): wire sonner toaster to themeStore, drop next-themes"
```

---

## Task 11: MSW — In-memory store + Seed

**Files:**
- Create: `src/mocks/db/store.ts`, `src/mocks/db/seed.ts`

목적: handlers가 공유할 in-memory DB. 워크스페이스 1개 + 두 루트 폴더 + 회의록 5개 + 프로젝트 8개 + 일부 멘션 시드. Plan 1에서는 부트스트랩만 동작하면 되지만, Plan 2~3 작업이 바로 이어지므로 데이터를 미리 시드한다.

- [ ] **Step 1: `src/mocks/db/store.ts` 작성**

```ts
import type { Workspace, Page } from "@/types/page";
import type { Block } from "@/types/block";
import type { FileRecord } from "@/types/file";

export interface MockDb {
  workspaces: Workspace[];
  pages: Page[];
  blocks: Block[];
  files: FileRecord[];
}

export const db: MockDb = {
  workspaces: [],
  pages: [],
  blocks: [],
  files: [],
};

let counter = 0;
export function newId(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function resetDb(): void {
  db.workspaces = [];
  db.pages = [];
  db.blocks = [];
  db.files = [];
  counter = 0;
}
```

- [ ] **Step 2: `src/mocks/db/seed.ts` 작성**

```ts
import { db, newId, nowIso, resetDb } from "./store";
import type { Page } from "@/types/page";

interface SeedOptions {
  /** 부트스트랩이 워크스페이스를 자동 생성하도록 비워둘지 */
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

  // 프로젝트 8개 (planned 3, in_progress 3, done 2)
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

  // 회의록 5개 (4월), 일부에 mentionedPageIds 시드
  for (let i = 0; i < 5; i += 1) {
    const id = newId("pg_meeting");
    const mentioned = i < 2 ? [projectIds[3 + i]] : [];
    db.pages.push({
      _id: id,
      workspaceId: wsId,
      parentPageId: meetingsRoot,
      title: `2026-04-${String(20 + i).padStart(2, "0")} 위클리`,
      emoji: "📝",
      order: i,
      isArchived: false,
      isPublished: false,
      properties: {
        type: "meeting",
        date: `2026-04-${String(20 + i).padStart(2, "0")}`,
        mentionedPageIds: mentioned,
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    });
  }
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

- [ ] **Step 3: 빌드 검증**

```bash
npm run build
```

Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat(mocks): in-memory db store + seed (workspace, root folders, sample pages)"
```

---

## Task 12: MSW — Handlers + Worker

**Files:**
- Create: `src/mocks/handlers/workspaces.ts`, `src/mocks/handlers/pages.ts`, `src/mocks/handlers/blocks.ts`, `src/mocks/handlers/files.ts`, `src/mocks/handlers/index.ts`, `src/mocks/browser.ts`, `src/test/msw.ts`

- [ ] **Step 1: `src/mocks/handlers/workspaces.ts` 작성**

```ts
import { http, HttpResponse } from "msw";
import { db, newId, nowIso } from "../db/store";
import type { Workspace, Page, RootFolders } from "@/types/page";

export const workspacesHandlers = [
  http.get("*/workspaces", () => {
    return HttpResponse.json(db.workspaces.filter((w) => w.removedAt === null));
  }),

  http.post("*/workspaces", async ({ request }) => {
    const body = (await request.json()) as Partial<Workspace>;
    const wsId = newId("ws");
    const workspace: Workspace = {
      _id: wsId,
      name: body.name ?? "Untitled",
      description: body.description,
      icon: body.icon,
      ownerUserId: body.ownerUserId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    };
    db.workspaces.push(workspace);

    const meetings = newId("pg_meetings_root");
    const projects = newId("pg_projects_root");
    const makeRoot = (
      id: string,
      title: string,
      emoji: string,
      role: "meetings_root" | "projects_root",
    ): Page => ({
      _id: id,
      workspaceId: wsId,
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
    });
    db.pages.push(makeRoot(meetings, "회의록", "📝", "meetings_root"));
    db.pages.push(makeRoot(projects, "프로젝트", "📋", "projects_root"));

    const rootFolders: RootFolders = { meetings, projects };
    return HttpResponse.json({ workspace, rootFolders });
  }),

  http.get("*/workspaces/:workspaceId/sidebar", ({ params }) => {
    const ws = db.workspaces.find((w) => w._id === params.workspaceId);
    if (!ws) return HttpResponse.json({ message: "not found" }, { status: 404 });
    const pages = db.pages.filter(
      (p) => p.workspaceId === ws._id && p.removedAt === null && !p.isArchived,
    );
    const byParent = new Map<string | null, typeof pages>();
    pages.forEach((p) => {
      const arr = byParent.get(p.parentPageId) ?? [];
      arr.push(p);
      byParent.set(p.parentPageId, arr);
    });
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((p) => ({
          _id: p._id,
          title: p.title,
          emoji: p.emoji,
          icon: p.icon,
          children: build(p._id),
        }));
    return HttpResponse.json({
      workspace: ws,
      tree: build(null),
      flatCount: pages.length,
    });
  }),
];
```

- [ ] **Step 2: `src/mocks/handlers/pages.ts` 작성**

```ts
import { http, HttpResponse } from "msw";
import { db, newId, nowIso } from "../db/store";
import type { Page } from "@/types/page";

function activePages(): Page[] {
  return db.pages.filter((p) => p.removedAt === null);
}

export const pagesHandlers = [
  http.get("*/pages/search", ({ request }) => {
    const url = new URL(request.url);
    const wsId = url.searchParams.get("workspaceId");
    const q = (url.searchParams.get("query") ?? "").toLowerCase();
    const result = activePages().filter(
      (p) =>
        p.workspaceId === wsId &&
        !p.isArchived &&
        p.title.toLowerCase().includes(q),
    );
    return HttpResponse.json(result);
  }),

  http.get("*/pages", ({ request }) => {
    const url = new URL(request.url);
    const wsId = url.searchParams.get("workspaceId");
    const parent = url.searchParams.get("parentPageId");
    const mentioned = url.searchParams.get("mentionedPageId");
    const includeArchived = url.searchParams.get("includeArchived") === "true";

    let result = activePages().filter((p) => p.workspaceId === wsId);
    if (!includeArchived) result = result.filter((p) => !p.isArchived);
    if (parent !== null) {
      const want = parent === "null" ? null : parent;
      result = result.filter((p) => p.parentPageId === want);
    }
    if (mentioned) {
      result = result.filter((p) =>
        (p.properties.mentionedPageIds ?? []).includes(mentioned),
      );
    }
    result.sort((a, b) => a.order - b.order);
    return HttpResponse.json(result);
  }),

  http.get("*/pages/:pageId/detail", ({ params }) => {
    const page = activePages().find((p) => p._id === params.pageId);
    if (!page) return HttpResponse.json({ message: "not found" }, { status: 404 });
    const blocks = db.blocks.filter(
      (b) => b.pageId === page._id && b.removedAt === null,
    );
    const byParent = new Map<string | null, typeof blocks>();
    blocks.forEach((b) => {
      const arr = byParent.get(b.parentBlockId) ?? [];
      arr.push(b);
      byParent.set(b.parentBlockId, arr);
    });
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((b) => ({ ...b, children: build(b._id) }));
    return HttpResponse.json({
      page,
      blocks,
      blockTree: build(null),
    });
  }),

  http.post("*/pages", async ({ request }) => {
    const body = (await request.json()) as Partial<Page>;
    const page: Page = {
      _id: newId("pg"),
      workspaceId: body.workspaceId!,
      parentPageId: body.parentPageId ?? null,
      title: body.title ?? "Untitled",
      emoji: body.emoji,
      icon: body.icon,
      coverUrl: body.coverUrl,
      order: body.order ?? 0,
      isArchived: false,
      isPublished: body.isPublished ?? false,
      properties: body.properties ?? {},
      creatorUserId: body.creatorUserId,
      lastEditedBy: body.lastEditedBy,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      removedAt: null,
    };
    db.pages.push(page);
    return HttpResponse.json(page);
  }),

  http.patch("*/pages/reorder", async ({ request }) => {
    const { items } = (await request.json()) as {
      items: Array<{ pageId: string; order: number; parentPageId?: string | null }>;
    };
    items.forEach((item) => {
      const p = db.pages.find((x) => x._id === item.pageId);
      if (!p) return;
      p.order = item.order;
      if (item.parentPageId !== undefined) p.parentPageId = item.parentPageId;
      p.updatedAt = nowIso();
    });
    return HttpResponse.json({ ok: true });
  }),

  http.patch("*/pages/:pageId", async ({ params, request }) => {
    const body = (await request.json()) as Partial<Page>;
    const p = db.pages.find((x) => x._id === params.pageId);
    if (!p) return HttpResponse.json({ message: "not found" }, { status: 404 });
    Object.assign(p, body, { updatedAt: nowIso() });
    return HttpResponse.json(p);
  }),

  http.delete("*/pages/:pageId", ({ params }) => {
    const p = db.pages.find((x) => x._id === params.pageId);
    if (!p) return HttpResponse.json({ message: "not found" }, { status: 404 });
    p.removedAt = nowIso();
    db.pages
      .filter((x) => x.parentPageId === p._id)
      .forEach((child) => (child.removedAt = nowIso()));
    return HttpResponse.json({ ok: true });
  }),
];
```

- [ ] **Step 3: `src/mocks/handlers/blocks.ts` 작성**

```ts
import { http, HttpResponse } from "msw";
import { db, newId, nowIso } from "../db/store";
import type { Block } from "@/types/block";

function activeBlocks(): Block[] {
  return db.blocks.filter((b) => b.removedAt === null);
}

export const blocksHandlers = [
  http.get("*/blocks/tree", ({ request }) => {
    const url = new URL(request.url);
    const pageId = url.searchParams.get("pageId");
    const blocks = activeBlocks().filter((b) => b.pageId === pageId);
    const byParent = new Map<string | null, Block[]>();
    blocks.forEach((b) => {
      const arr = byParent.get(b.parentBlockId) ?? [];
      arr.push(b);
      byParent.set(b.parentBlockId, arr);
    });
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((b) => ({ ...b, children: build(b._id) }));
    return HttpResponse.json({ blocks, tree: build(null) });
  }),

  http.get("*/blocks", ({ request }) => {
    const url = new URL(request.url);
    const pageId = url.searchParams.get("pageId");
    const parent = url.searchParams.get("parentBlockId");
    let result = activeBlocks();
    if (pageId) result = result.filter((b) => b.pageId === pageId);
    if (parent !== null) {
      const want = parent === "null" ? null : parent;
      result = result.filter((b) => b.parentBlockId === want);
    }
    result.sort((a, b) => a.order - b.order);
    return HttpResponse.json(result);
  }),

  http.post("*/blocks/batch", async ({ request }) => {
    const { items } = (await request.json()) as { items: Partial<Block>[] };
    const created: Block[] = items.map((item, i) => ({
      _id: newId("bl"),
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
      _id: newId("bl"),
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

  http.patch("*/blocks/reorder", async ({ request }) => {
    const { items } = (await request.json()) as {
      items: Array<{ blockId: string; order: number; parentBlockId?: string | null }>;
    };
    items.forEach((item) => {
      const b = db.blocks.find((x) => x._id === item.blockId);
      if (!b) return;
      b.order = item.order;
      if (item.parentBlockId !== undefined) b.parentBlockId = item.parentBlockId;
      b.updatedAt = nowIso();
    });
    return HttpResponse.json({ ok: true });
  }),

  http.patch("*/blocks/:blockId", async ({ params, request }) => {
    const body = (await request.json()) as Partial<Block>;
    const b = db.blocks.find((x) => x._id === params.blockId);
    if (!b) return HttpResponse.json({ message: "not found" }, { status: 404 });
    Object.assign(b, body, { updatedAt: nowIso() });
    return HttpResponse.json(b);
  }),

  http.delete("*/blocks/:blockId", ({ params }) => {
    const b = db.blocks.find((x) => x._id === params.blockId);
    if (!b) return HttpResponse.json({ message: "not found" }, { status: 404 });
    b.removedAt = nowIso();
    return HttpResponse.json({ ok: true });
  }),
];
```

- [ ] **Step 4: `src/mocks/handlers/files.ts` 작성**

```ts
import { http, HttpResponse } from "msw";
import { db, newId, nowIso } from "../db/store";
import type { FileRecord } from "@/types/file";

export const filesHandlers = [
  http.post("*/files/upload-url", async ({ request }) => {
    const body = (await request.json()) as Partial<FileRecord>;
    const fileId = newId("file");
    const key = `newtion/mock/${fileId}/${body.name ?? "file"}`;
    const file: FileRecord = {
      _id: fileId,
      name: body.name ?? "file",
      type: (body.type as "attachment" | "image") ?? "attachment",
      key,
      mimetype: body.mimetype ?? "application/octet-stream",
      bucket: "newtion-file",
      size: body.size ?? 0,
      created_at: nowIso(),
      updated_at: nowIso(),
      removed_at: null,
    };
    db.files.push(file);
    return HttpResponse.json({
      fileId,
      uploadUrl: `https://mock-s3.local/${key}`,
      key,
    });
  }),

  http.post("*/files/:fileId/complete", async ({ params, request }) => {
    const body = (await request.json()) as { size: number; checksum?: string };
    const f = db.files.find((x) => x._id === params.fileId);
    if (!f) return HttpResponse.json({ message: "not found" }, { status: 404 });
    f.size = body.size;
    f.checksum = body.checksum ?? null;
    f.updated_at = nowIso();
    return HttpResponse.json(f);
  }),

  http.get("*/files/:fileId/download-url", ({ params }) => {
    const f = db.files.find((x) => x._id === params.fileId);
    if (!f) return HttpResponse.json({ message: "not found" }, { status: 404 });
    return HttpResponse.json({ url: `https://mock-s3.local/${f.key}` });
  }),
];
```

- [ ] **Step 5: `src/mocks/handlers/index.ts` 작성**

```ts
import { workspacesHandlers } from "./workspaces";
import { pagesHandlers } from "./pages";
import { blocksHandlers } from "./blocks";
import { filesHandlers } from "./files";

export const handlers = [
  ...workspacesHandlers,
  ...pagesHandlers,
  ...blocksHandlers,
  ...filesHandlers,
];
```

- [ ] **Step 6: `src/mocks/browser.ts` 작성**

```ts
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { seed } from "./db/seed";

export const worker = setupWorker(...handlers);

export async function startMockServiceWorker(): Promise<void> {
  // 첫 부팅(빈 상태)을 자연스럽게 보려면 옵션으로 empty true 전달.
  // 회의록/프로젝트/검색 작업 시작 시 false로 전환.
  seed({ empty: true });
  await worker.start({ onUnhandledRequest: "bypass" });
}
```

- [ ] **Step 7: 테스트용 MSW 서버 — `src/test/msw.ts` 작성**

```ts
import { setupServer } from "msw/node";
import { handlers } from "@/mocks/handlers";

export const server = setupServer(...handlers);
```

- [ ] **Step 8: MSW worker 스크립트 생성**

```bash
npx msw init public/ --save
```

`public/mockServiceWorker.js`가 생성된다.

- [ ] **Step 9: 빌드 검증**

```bash
npm run build
```

Expected: 통과.

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "feat(mocks): MSW v2 handlers (workspaces/pages/blocks/files) + browser worker"
```

---

## Task 13: TanStack Query + 부트스트랩 훅 (TDD 통합 테스트)

**Files:**
- Create: `src/hooks/useWorkspace.ts`, `src/hooks/useWorkspace.test.tsx`

목적: 앱 진입 시 `GET /workspaces`를 호출하고, 빈 결과면 `POST /workspaces`로 생성, `workspace + rootFolders`를 캐시 + localStorage에 저장. 통합 테스트는 MSW를 빈 상태로 시작해 자동 생성 흐름을 검증한다.

- [ ] **Step 1: 실패 테스트 작성 — `src/hooks/useWorkspace.test.tsx`**

```tsx
import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import { useWorkspace } from "./useWorkspace";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  resetDb();
  localStorage.clear();
});

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useWorkspace", () => {
  it("creates a workspace when none exists and exposes rootFolders", async () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.ready).toBe(true), { timeout: 5000 });
    expect(result.current.workspace).toBeDefined();
    expect(result.current.rootFolders?.meetings).toBeDefined();
    expect(result.current.rootFolders?.projects).toBeDefined();
    const stored = localStorage.getItem("newtion-workspace");
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).rootFolders.meetings).toBe(
      result.current.rootFolders!.meetings,
    );
  });

  it("derives rootFolders from sidebar tree on subsequent loads", async () => {
    // 첫 부팅으로 워크스페이스 + 루트 폴더 생성
    const first = renderHook(() => useWorkspace(), { wrapper: wrapper() });
    await waitFor(() => expect(first.result.current.ready).toBe(true));
    localStorage.clear(); // 캐시는 비웠지만 서버에는 워크스페이스가 남아 있음

    const { result } = renderHook(() => useWorkspace(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.workspace?.name).toBe("Newtion");
    expect(result.current.rootFolders?.meetings).toBeDefined();
    expect(result.current.rootFolders?.projects).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test -- useWorkspace
```

Expected: FAIL — 모듈 없음.

- [ ] **Step 3: `src/hooks/useWorkspace.ts` 구현**

```ts
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createWorkspace,
  getSidebar,
  getWorkspaces,
  type SidebarResponse,
} from "@/api/workspaces";
import type { RootFolders, Workspace } from "@/types/page";

const STORAGE_KEY = "newtion-workspace";

interface StoredWorkspace {
  workspaceId: string;
  rootFolders: RootFolders;
}

function readStorage(): StoredWorkspace | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredWorkspace) : null;
  } catch {
    return null;
  }
}

function writeStorage(value: StoredWorkspace): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

interface ResolvedWorkspace {
  workspace: Workspace;
  rootFolders: RootFolders;
  sidebar?: SidebarResponse;
}

async function resolveWorkspace(): Promise<ResolvedWorkspace> {
  const list = await getWorkspaces();
  if (list.length === 0) {
    const created = await createWorkspace({ name: "Newtion", icon: "N" });
    writeStorage({
      workspaceId: created.workspace._id,
      rootFolders: created.rootFolders,
    });
    return { workspace: created.workspace, rootFolders: created.rootFolders };
  }

  const ws = list[0];
  const sidebar = await getSidebar(ws._id);
  const meetings = sidebar.tree.find(
    (n) => n.title === "회의록" || n.emoji === "📝",
  )?._id;
  const projects = sidebar.tree.find(
    (n) => n.title === "프로젝트" || n.emoji === "📋",
  )?._id;
  if (!meetings || !projects) {
    throw new Error("Workspace is missing required root folders");
  }
  const rootFolders: RootFolders = { meetings, projects };
  writeStorage({ workspaceId: ws._id, rootFolders });
  return { workspace: ws, rootFolders, sidebar };
}

export function useWorkspace() {
  const cached = useMemo(readStorage, []);
  const query = useQuery({
    queryKey: ["bootstrap-workspace"],
    queryFn: resolveWorkspace,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data) {
      writeStorage({
        workspaceId: query.data.workspace._id,
        rootFolders: query.data.rootFolders,
      });
    }
  }, [query.data]);

  return {
    ready: query.isSuccess,
    isLoading: query.isLoading,
    error: query.error,
    workspace: query.data?.workspace,
    rootFolders: query.data?.rootFolders ?? cached?.rootFolders,
    workspaceId: query.data?.workspace._id ?? cached?.workspaceId,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test -- useWorkspace
```

Expected: PASS, 2 tests. (만약 fetch polyfill 이슈가 발생하면 jsdom 22+ 기본 fetch가 있어야 하는데, MSW v2 + Node 18+ 조합에서는 추가 셋업 없이 동작한다. Node 버전이 낮다면 `npm install -D undici` 후 setup에서 polyfill.)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(hooks): useWorkspace bootstrap with MSW integration test"
```

---

## Task 14: AppShell + ThemeProvider + 라우터

**Files:**
- Create: `src/components/theme/ThemeProvider.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/TopBar.tsx`, `src/components/layout/AppShell.tsx`, `src/routes/HomePage.tsx`, `src/routes/MeetingsListPage.tsx`, `src/routes/MeetingDetailPage.tsx`, `src/routes/ProjectsKanbanPage.tsx`, `src/routes/ProjectDetailPage.tsx`, `src/routes/SearchPage.tsx`, `src/routes/SettingsPage.tsx`, `src/routes/NotFoundPage.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: `src/components/theme/ThemeProvider.tsx` 작성**

```tsx
import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDark =
        mode === "dark" ||
        (mode === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", isDark);
    };
    apply();
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [mode]);

  return <>{children}</>;
}
```

- [ ] **Step 2: `src/components/layout/Sidebar.tsx` 작성**

```tsx
import { NavLink } from "react-router-dom";
import { Home, FileText, KanbanSquare, Settings, Search } from "lucide-react";
import { useSidebarStore } from "@/store/sidebarStore";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
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

      <nav className="flex-1 px-2 py-3 space-y-1">
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

> 참고: 컬러 토큰은 CSS 변수 기반이므로 `border-line` 한 번만 작성하면 라이트/다크 모두 자동 처리된다. `dark:border-line-dark` 같은 페어링은 사용하지 않는다.

- [ ] **Step 3: `src/components/layout/TopBar.tsx` 작성**

```tsx
import { Moon, Sun, Monitor } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import { useWorkspace } from "@/hooks/useWorkspace";

const ICONS = { system: Monitor, light: Sun, dark: Moon };

export function TopBar() {
  const mode = useThemeStore((s) => s.mode);
  const cycle = useThemeStore((s) => s.cycle);
  const { workspace } = useWorkspace();
  const Icon = ICONS[mode];

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-line bg-card">
      <div className="text-sm font-medium text-ink">
        {workspace?.name ?? "Newtion"}
      </div>
      <button
        type="button"
        onClick={cycle}
        aria-label={`테마: ${mode}`}
        className="p-2 rounded-md hover:bg-page"
      >
        <Icon className="w-4 h-4" />
      </button>
    </header>
  );
}
```

- [ ] **Step 4: `src/components/layout/AppShell.tsx` 작성**

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-page text-ink">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 라우트 placeholder 컴포넌트 7개 생성**

각 파일은 페이지 제목만 표시하는 한 줄 컴포넌트로 만든다. 후속 plan에서 채운다.

`src/routes/HomePage.tsx`:
```tsx
export default function HomePage() {
  return <h1 className="text-2xl font-bold">홈</h1>;
}
```

`src/routes/MeetingsListPage.tsx`:
```tsx
export default function MeetingsListPage() {
  return <h1 className="text-2xl font-bold">회의록</h1>;
}
```

`src/routes/MeetingDetailPage.tsx`:
```tsx
import { useParams } from "react-router-dom";
export default function MeetingDetailPage() {
  const { id } = useParams();
  return <h1 className="text-2xl font-bold">회의록 {id}</h1>;
}
```

`src/routes/ProjectsKanbanPage.tsx`:
```tsx
import { Outlet } from "react-router-dom";
export default function ProjectsKanbanPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">프로젝트</h1>
      <Outlet />
    </>
  );
}
```

`src/routes/ProjectDetailPage.tsx`:
```tsx
import { useParams } from "react-router-dom";
export default function ProjectDetailPage() {
  const { id } = useParams();
  return <p className="mt-4 text-muted-ink">프로젝트 모달 placeholder: {id}</p>;
}
```

`src/routes/SearchPage.tsx`:
```tsx
import { useSearchParams } from "react-router-dom";
export default function SearchPage() {
  const [params] = useSearchParams();
  return (
    <h1 className="text-2xl font-bold">
      검색: {params.get("q") ?? ""}
    </h1>
  );
}
```

`src/routes/SettingsPage.tsx`:
```tsx
export default function SettingsPage() {
  return <h1 className="text-2xl font-bold">설정</h1>;
}
```

`src/routes/NotFoundPage.tsx`:
```tsx
import { Link } from "react-router-dom";
export default function NotFoundPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">404</h1>
      <Link to="/" className="text-brand underline">홈으로</Link>
    </div>
  );
}
```

- [ ] **Step 6: `src/App.tsx`를 라우터로 교체**

```tsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import HomePage from "@/routes/HomePage";
import MeetingsListPage from "@/routes/MeetingsListPage";
import MeetingDetailPage from "@/routes/MeetingDetailPage";
import ProjectsKanbanPage from "@/routes/ProjectsKanbanPage";
import ProjectDetailPage from "@/routes/ProjectDetailPage";
import SearchPage from "@/routes/SearchPage";
import SettingsPage from "@/routes/SettingsPage";
import NotFoundPage from "@/routes/NotFoundPage";
import { Toaster } from "sonner";

export default function App() {
  return (
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
  );
}
```

- [ ] **Step 7: `src/main.tsx`에 QueryClient + MSW 부트스트랩 통합**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        const message = error instanceof Error ? error.message : "오류";
        toast.error(message);
      },
    },
  },
});

async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCK === "true") {
    const { startMockServiceWorker } = await import("./mocks/browser");
    await startMockServiceWorker();
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
```

- [ ] **Step 8: 빌드 + dev 검증**

```bash
npm run build
```

Expected: 통과.

```bash
npm run dev
```

Expected:
- 콘솔에 MSW 메시지("Mock Service Worker enabled.").
- 브라우저: 좌측 사이드바(홈/회의록/프로젝트/설정), 상단 워크스페이스명 "Newtion", 다크모드 토글 작동.
- 네트워크 탭: `GET /workspaces` → 빈 배열 → `POST /workspaces` → `{ workspace, rootFolders }` 응답.
- 사이드바 링크 클릭 시 라우트 전환, placeholder 표시.

Ctrl+C로 종료.

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat(shell): AppShell + Sidebar + TopBar + router with placeholder routes"
```

---

## Task 15: 부트스트랩 엔드투엔드 통합 검증

**Files:**
- Create: `src/App.test.tsx`

목적: App 전체를 렌더 → MSW 가로채기 → 워크스페이스 자동 생성 → 사이드바 + TopBar 표시까지의 흐름이 한 테스트로 보호되도록 한다. 후속 plan에서 회귀가 발생하면 즉시 잡힌다.

- [ ] **Step 1: 실패 테스트 작성 — `src/App.test.tsx`**

```tsx
import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/msw";
import { resetDb } from "@/mocks/db/store";
import App from "./App";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  resetDb();
  localStorage.clear();
});

function renderApp() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App boot", () => {
  it("renders sidebar nav and home placeholder", async () => {
    renderApp();
    expect(await screen.findByText("회의록")).toBeInTheDocument();
    expect(screen.getByText("프로젝트")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "홈" })).toBeInTheDocument();
  });

  it("auto-creates workspace via MSW and shows its name in TopBar", async () => {
    renderApp();
    expect(await screen.findByText("Newtion")).toBeInTheDocument();
    const stored = localStorage.getItem("newtion-workspace");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.rootFolders.meetings).toMatch(/^pg_meetings_root_/);
    expect(parsed.rootFolders.projects).toMatch(/^pg_projects_root_/);
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
npm test
```

Expected: 모든 테스트 PASS (cn / blockAdapter / themeStore / useWorkspace / App boot).

만약 BrowserRouter가 jsdom 환경에서 history 충돌을 일으키면, App.tsx의 `<BrowserRouter>`를 테스트에서 별도 wrap하지 않고 그대로 둬도 된다 (jsdom이 history API를 제공한다). 테스트 격리를 위해 `beforeEach` 마다 `window.history.replaceState({}, "", "/")` 추가가 필요하면 반영.

- [ ] **Step 3: 다크모드 토글 수동 검증**

```bash
npm run dev
```

브라우저에서:
1. 우측 상단 테마 아이콘 클릭 3번 → system → light → dark → system 사이클 확인
2. dark일 때 페이지 배경 `#0A0A0A`, 카드 `#171717` 확인
3. 새로고침 후에도 모드 유지 (localStorage `newtion-theme`)

Ctrl+C 종료.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "test: end-to-end boot integration test (sidebar + workspace auto-create)"
```

---

## Task 16: README + .env 정리 (Foundation 마무리)

**Files:**
- Create: `README.md`

> 참고: 일반적으로는 README를 새로 만들지 않지만, 프로젝트 루트에 아무 진입점 문서가 없는 빈 상태에서 시작했고, 다음 plan을 작업할 사람이 곧바로 들어와 어떤 명령으로 어떤 동작을 검증할 수 있는지 알 수 있어야 하므로 짧은 README를 둔다.

- [ ] **Step 1: `README.md` 작성**

```markdown
# Newtion (Frontend)

Vite + React + TypeScript SPA. 백엔드는 [`NOTION_API.md`](./NOTION_API.md) 사양을 따르며, 개발 중에는 MSW가 모든 HTTP 요청을 로컬에서 응답합니다.

## 빠른 시작

```bash
npm install
cp .env.example .env.development
npm run dev          # http://localhost:5173
npm test             # 유닛 + 통합 테스트
npm run build
```

## 환경 변수

| 키 | 기본값 | 설명 |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3035` | 백엔드 base URL |
| `VITE_USE_MOCK` | `true` | `true`이면 MSW worker 시작, `false`이면 실제 백엔드로 요청 |

## 디렉토리

- `src/api` — 백엔드 어댑터 (Axios). 백엔드 인터페이스 변경 시 여기만 수정.
- `src/mocks` — MSW v2 핸들러 + in-memory store + seed.
- `src/hooks` — TanStack Query 훅 (`useWorkspace` 등).
- `src/store` — Zustand 클라이언트 UI 상태 (theme, sidebar, ⌘K, modal).
- `src/components/layout` — AppShell / Sidebar / TopBar.
- `src/routes` — React Router 페이지.
- `src/types` — Page / Block / File 타입.
- `src/lib/blockAdapter.ts` — BlockNote ↔ Backend Block 변환 (라운드트립 테스트로 보호).

## 관련 문서

- `docs/superpowers/specs/2026-04-27-newtion-frontend-design.md` — 프론트엔드 설계 spec
- `docs/superpowers/plans/2026-04-27-newtion-foundation.md` — Plan 1 (본 문서가 산출한 결과)
- `BACKEND_REQUESTS.md` — 백엔드 변경 요청 사양
- `design-system/newtion/MASTER.md` — 디자인 시스템 토큰
```

- [ ] **Step 2: 최종 검증**

```bash
npm test
npm run build
```

Expected: 모두 통과.

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "docs: README with quick start, env vars, and directory map"
```

---

## Plan 1 완료 시 상태

- ✅ `npm run dev` → 사이드바 + 빈 라우트 표시, MSW가 `/workspaces` 자동 생성
- ✅ `npm test` → 5개 테스트 파일 (cn / blockAdapter / themeStore / useWorkspace / App) 통과
- ✅ `npm run build` → 타입 + 번들 통과
- ✅ 다크모드 토글, localStorage 영속화 동작
- ✅ `src/api` 어댑터 레이어 완비 — Plan 2/3/4가 곧바로 hooks 작성 가능
- ✅ `src/mocks` seed가 회의록 5 / 프로젝트 8 / 멘션 시드를 가지고 있어, Plan 2부터 `seed({ empty: false })`로 전환만 하면 데이터 표시 가능

## Plan 2 시작 시 첫 작업

1. `seed({ empty: false })`로 변경(또는 환경 변수 분기) — 시드 데이터가 보이도록.
2. BlockNote.js 설치 (`@blocknote/core @blocknote/react @blocknote/mantine`).
3. `usePages`, `usePageMutations`, `useBlocks`, `useBlockMutations` 훅 작성.
4. 회의록 리스트 / 상세 / 자동 저장 구현.

---

## Self-Review 체크리스트 (작성자용)

- [x] **Spec 4-1~4-5 (실제 화면)**: Plan 1은 placeholder만. Plan 2~4에서 다룸 — 의도된 분할.
- [x] **Spec 5-1 데이터 모델**: `src/types/`에 정의 (Task 5).
- [x] **Spec 5-2 API 엔드포인트**: 어댑터 레이어 완비 (Tasks 7-9).
- [x] **Spec 5-3 어댑터 레이어**: ✓ (Tasks 7-9).
- [x] **Spec 5-4 Mock seed**: ✓ (Task 11).
- [x] **Spec 5-5 자동 저장**: 인프라(QueryClient defaults)는 마련. mutation은 Plan 2.
- [x] **Spec 6-1 디렉토리 구조**: 일치.
- [x] **Spec 6-2 상태 분담**: TanStack Query / Zustand / Router 모두 셋업.
- [x] **Spec 6-3 부트스트랩**: ✓ (Task 13).
- [x] **Spec 7-2 QueryClient 기본값**: ✓ (Task 14 main.tsx).
- [x] **Spec 7-4 테스트 전략**: 핵심 케이스(블록 어댑터 라운드트립, 부트스트랩) Plan 1에서 도입.
- [x] **Spec 7-5 핵심 테스트 케이스 #1, #3**: ✓. #2(멘션 추출)는 Plan 4. #4(칸반 드래그)는 Plan 3.
- [x] 모든 코드 블록은 실제 작성 가능한 완전한 형태로 제공.
- [x] 타입/함수 시그니처가 task 간에 일관성 (예: `RootFolders`, `Workspace`, `useWorkspace` 반환 타입).
- [x] Placeholder/TBD/생략 없음.
