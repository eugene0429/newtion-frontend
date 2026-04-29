import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import type { Page, ProjectStatus } from "@/types/page";
import {
  projectStatusDotClass,
  projectStatusLabel,
} from "@/lib/projectStatus";
import { cn } from "@/lib/cn";

interface KanbanColumnProps {
  status: ProjectStatus;
  projects: Page[];
  previews: Record<string, string>;
  onAddCard: (status: ProjectStatus) => void;
  isCreating?: boolean;
}

export function KanbanColumn({
  status,
  projects,
  previews,
  onAddCard,
  isCreating,
}: KanbanColumnProps) {
  const columnId = `column:${status}`;
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: { type: "column", status },
  });
  const ids = projects.map((p) => p._id);

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      className={cn(
        "flex flex-col rounded-card bg-card-muted border border-line p-3 min-h-[200px] transition-colors",
        isOver && "ring-2 ring-brand/40",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              projectStatusDotClass(status),
            )}
            aria-hidden
          />
          <h2 className="text-sm font-medium text-ink">
            {projectStatusLabel(status)}
          </h2>
        </div>
        <span className="text-xs text-muted-ink" aria-label="카드 수">
          {projects.length}
        </span>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1 min-h-[40px]">
          {projects.map((p) => (
            <SortableProjectCard
              key={p._id}
              project={p}
              preview={previews[p._id] ?? ""}
            />
          ))}
        </div>
      </SortableContext>
      <button
        type="button"
        onClick={() => onAddCard(status)}
        disabled={isCreating}
        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-ink hover:text-ink py-1.5 disabled:opacity-50"
      >
        <Plus className="w-3.5 h-3.5" />
        카드 추가
      </button>
    </div>
  );
}

function SortableProjectCard({
  project,
  preview,
}: {
  project: Page;
  preview: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project._id,
    data: {
      type: "card",
      status: project.properties.status ?? "planned",
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <ProjectCard project={project} preview={preview} />
    </div>
  );
}
