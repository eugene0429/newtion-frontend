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

export interface UpdateWorkspaceInput {
  name?: string;
  icon?: string;
  description?: string;
}

export async function updateWorkspace(
  workspaceId: string,
  input: UpdateWorkspaceInput,
): Promise<Workspace> {
  const { data } = await api.patch<Workspace>(`/workspaces/${workspaceId}`, input);
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
