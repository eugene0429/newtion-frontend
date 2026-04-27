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
