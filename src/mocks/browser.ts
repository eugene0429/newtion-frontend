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
