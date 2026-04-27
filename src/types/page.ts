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
