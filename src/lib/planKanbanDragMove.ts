import { computeKanbanOrder } from "./computeKanbanOrder";
import type { Page, ProjectStatus } from "@/types/page";

const COLUMN_ID_PREFIX = "column:";
const STATUSES: ProjectStatus[] = ["planned", "in_progress", "done"];

export interface KanbanDragMove {
  pageId: string;
  newStatus: ProjectStatus;
  newOrder: number;
}

export interface PlanKanbanDragArgs {
  projects: Page[];
  draggedId: string;
  overId: string;
}

function statusOf(p: Page): ProjectStatus {
  return (p.properties.status ?? "planned") as ProjectStatus;
}

function parseColumnId(id: string): ProjectStatus | null {
  if (!id.startsWith(COLUMN_ID_PREFIX)) return null;
  const candidate = id.slice(COLUMN_ID_PREFIX.length) as ProjectStatus;
  return STATUSES.includes(candidate) ? candidate : null;
}

export function planKanbanDragMove(
  args: PlanKanbanDragArgs,
): KanbanDragMove | null {
  const { projects, draggedId, overId } = args;
  const dragged = projects.find((p) => p._id === draggedId);
  if (!dragged) return null;

  const overColumn = parseColumnId(overId);
  const overCard = projects.find((p) => p._id === overId);

  let destStatus: ProjectStatus;
  let destCardId: string | null;
  if (overColumn) {
    destStatus = overColumn;
    destCardId = null;
  } else if (overCard) {
    destStatus = statusOf(overCard);
    destCardId = overCard._id;
  } else {
    return null;
  }

  if (destCardId === draggedId) return null;

  const destColumn = projects
    .filter((p) => statusOf(p) === destStatus && p._id !== draggedId)
    .sort((a, b) => a.order - b.order);

  let insertIndex = destColumn.length;
  if (destCardId) {
    const idx = destColumn.findIndex((p) => p._id === destCardId);
    insertIndex = idx === -1 ? destColumn.length : idx;
  }

  const newOrder = computeKanbanOrder(
    destColumn.map((p) => p.order),
    insertIndex,
  );
  return {
    pageId: draggedId,
    newStatus: destStatus,
    newOrder,
  };
}
