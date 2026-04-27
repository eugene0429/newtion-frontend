# Newtion — Frontend → Backend Integration Requests

이 문서는 프론트엔드 팀이 [`NOTION_API.md`](./NOTION_API.md)를 검토한 뒤 백엔드 팀에 전달하는 **MVP 통합 요청 사양**입니다.

프론트엔드는 이 문서의 내용을 기준으로 **MSW(Mock Service Worker) 기반 mock**을 먼저 구현하여 개발을 진행합니다. 백엔드가 동일한 인터페이스로 맞춰지면 mock을 끄고 그대로 연동됩니다.

---

## 0. 개요

| 항목 | 결정 |
|---|---|
| MVP 인증 | **불필요** (링크 = 편집 권한). 추후 합의 |
| MVP 사용자/팀 모델 | **불필요** (`createdBy` 등은 비워두거나 `"anonymous"`). 추후 합의 |
| MVP 동시 편집 충돌 | **Last-Write-Wins** (단순 PATCH). 2명 사용이라 충분 |
| MVP 본문 검색 | **제외** — 제목 검색만 (`GET /pages/search`) |
| 워크스페이스 | **1개로 운영** — 앱 시작 시 `GET /workspaces[0]` 사용 |

---

## 1. ⭐ 변경 요청: 역인덱스 검색

### Use case

프로젝트 상세 모달 하단에 **"이 프로젝트를 멘션한 회의록 목록"**을 자동으로 표시합니다.

프론트엔드는 페이지를 저장할 때 본문에서 `@멘션`을 추출하여 `properties.mentionedPageIds: string[]`에 저장합니다.

```json
// 예: 회의록 페이지의 properties
{
  "type": "meeting",
  "date": "2026-04-26",
  "mentionedPageIds": ["652f...prj_a", "652f...prj_b"]
}
```

### 요청 인터페이스

기존 `GET /pages` 엔드포인트에 `mentionedPageId` 쿼리 파라미터 추가:

```
GET /pages?workspaceId=...&mentionedPageId=652f...prj_a
→ properties.mentionedPageIds 배열에 해당 ID가 포함된 페이지 목록
```

### 권장 인덱스 (MongoDB)

```js
db.pages.createIndex({ "properties.mentionedPageIds": 1 });
```

### 우선순위

**MVP 필요** — 회의록 ↔ 프로젝트 약한 연결 기능의 핵심.

---

## 2. ⭐ 변경 요청: 부트스트랩 (워크스페이스 + 두 루트 폴더)

### Use case

앱 진입 시 워크스페이스가 1개 존재하고, 그 안에 다음 두 **루트 폴더 페이지**가 항상 존재해야 합니다.

- 📝 **회의록 폴더** — 모든 회의록의 부모 페이지
- 📋 **프로젝트 폴더** — 모든 프로젝트의 부모 페이지

프론트엔드는 이 두 폴더의 ID를 알아야 회의록 리스트 / 프로젝트 칸반을 조회할 수 있습니다.

```
GET /pages?workspaceId=...&parentPageId=<MEETINGS_FOLDER_ID>
→ 회의록 목록
```

### 요청 인터페이스

`POST /workspaces` 시점에 두 루트 폴더를 자동으로 함께 생성하고, 응답에 두 폴더 ID를 포함:

```json
// POST /workspaces 응답
{
  "workspace": { /* ...Workspace */ },
  "rootFolders": {
    "meetings": "652f...meetings",
    "projects": "652f...projects"
  }
}
```

### 폴더 페이지 식별

루트 폴더 페이지는 다음 `properties.role` 값으로 식별합니다:

```json
// 회의록 폴더
{
  "title": "회의록",
  "emoji": "📝",
  "parentPageId": null,
  "properties": { "role": "meetings_root" }
}

// 프로젝트 폴더
{
  "title": "프로젝트",
  "emoji": "📋",
  "parentPageId": null,
  "properties": { "role": "projects_root" }
}
```

### 워크스페이스 1개 운영 정책

- 프론트엔드는 앱 시작 시 `GET /workspaces`를 호출하여 첫 번째 워크스페이스 사용
- 결과가 비어 있으면 `POST /workspaces`로 자동 생성 (위 응답 형식대로 두 루트 폴더도 함께 생성됨)
- 멀티 워크스페이스는 추후 합의

### 우선순위

**MVP 필요** — 이 인터페이스가 없으면 앱이 빈 상태로 시작합니다.

---

## 3. 페이지 `properties` 사용 규약

프론트엔드는 `Page.properties`에 다음 키들을 사용합니다. 백엔드는 자유 JSON으로 받아 저장만 하면 됩니다.

### 분류

| 키 | 값 | 사용 위치 |
|---|---|---|
| `type` | `"meeting"` \| `"project"` | 모든 회의록/프로젝트 페이지 |
| `role` | `"meetings_root"` \| `"projects_root"` | 루트 폴더 페이지만 |

### 회의록 (`type: "meeting"`)

| 키 | 값 | 비고 |
|---|---|---|
| `date` | ISO 8601 문자열 | 회의 일자 |

### 프로젝트 (`type: "project"`)

| 키 | 값 | 비고 |
|---|---|---|
| `status` | `"planned"` \| `"in_progress"` \| `"done"` | 칸반 컬럼 분류 |
| `progress` | `number` (0~100) | `in_progress`일 때만 |
| `dueDate` | ISO 8601 문자열 | 마감 |
| `tags` | `string[]` | 자유 태그 |

### 공통

| 키 | 값 | 비고 |
|---|---|---|
| `isPinned` | `boolean` | 즐겨찾기 (MVP는 단일 사용자 기준) |
| `mentionedPageIds` | `string[]` | 본문에서 추출한 멘션 페이지 ID들 |

---

## 4. 사용 예시 (프론트 호출 흐름)

### 4-1. 앱 부트스트랩

```
1. GET /workspaces
   → []  (비어 있음)
2. POST /workspaces { name: "Newtion", icon: "N" }
   → { workspace, rootFolders: { meetings, projects } }
3. localStorage에 workspace.id, rootFolders 저장
```

이후 진입 시:

```
1. GET /workspaces
   → [{ _id: "...", name: "Newtion", ... }]
2. GET /workspaces/:id/sidebar
   → 사이드바 트리
```

### 4-2. 회의록 리스트

```
GET /pages?workspaceId=...&parentPageId=<MEETINGS_FOLDER_ID>
→ Page[] (모든 회의록)
```

### 4-3. 프로젝트 칸반

```
GET /pages?workspaceId=...&parentPageId=<PROJECTS_FOLDER_ID>
→ Page[] (모든 프로젝트, 클라이언트가 properties.status 로 그룹화)
```

### 4-4. 새 회의록 작성

```
1. POST /pages {
     workspaceId,
     parentPageId: <MEETINGS_FOLDER_ID>,
     title: "Untitled",
     emoji: "📝",
     properties: { type: "meeting", date: "2026-04-27" }
   }
   → Page

2. POST /blocks { pageId, type: "paragraph", content: { text: "" }, order: 0 }
3. (사용자 편집) PATCH /blocks/:id { content: {...} }
```

### 4-5. 칸반 드래그 (상태/정렬 변경)

```
PATCH /pages/:id {
  properties: { ...기존, status: "in_progress" },
  order: 2
}
```

### 4-6. 프로젝트 멘션 (회의록 저장 시)

```
1. (프론트) BlockNote 본문에서 @멘션 추출 → mentionedPageIds 배열 생성
2. PATCH /pages/:meetingId { properties: { ...기존, mentionedPageIds } }
3. (조회 시) GET /pages?workspaceId=...&mentionedPageId=:projectId
   → 이 프로젝트를 멘션한 회의록들
```

### 4-7. 파일 업로드 (이미지/파일 블록)

```
1. POST /files/upload-url { name, type, mimetype, size }
   → { fileId, uploadUrl, key }
2. PUT <uploadUrl> (S3 직접 업로드)
3. POST /files/:fileId/complete { size, checksum }
4. POST /blocks { type: "image", content: { fileKey: <key>, fileId } }
```

---

## 5. 추후 협의 항목 (MVP 이후)

| # | 항목 | 비고 |
|---|---|---|
| A | **인증** | 토큰 기반 (JWT?) — 추가 시점 미정 |
| B | **사용자/팀 모델** | `User`, `Workspace.members`, 권한 |
| C | **본문 검색** | `GET /pages/search`에 `includeBody=true` 옵션 또는 별도 `GET /search` |
| D | **동시 편집 충돌** | 낙관적 락 (`If-Unmodified-Since`) 또는 CRDT |
| E | **알림/활동 피드** | 페이지 변경 이벤트, 멘션 알림 |
| F | **댓글** | 블록 단위 댓글 |

---

## 6. 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-04-27 | 초안 작성 (역인덱스 검색, 부트스트랩 자동 생성, properties 규약) |

---

**문의**: 프론트엔드 측에 [홍우진](mailto:hongwoojin0220@kaist.ac.kr) 또는 이 문서가 있는 저장소의 이슈/PR로 회신 부탁드립니다.
