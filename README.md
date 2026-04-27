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
