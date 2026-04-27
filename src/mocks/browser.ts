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
