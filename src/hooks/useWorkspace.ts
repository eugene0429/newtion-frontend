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
