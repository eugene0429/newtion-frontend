import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { KanbanColumn } from "./KanbanColumn";
import { ProjectCard } from "./ProjectCard";
import { useUpdatePage } from "@/hooks/usePageMutations";
import { planKanbanDragMove } from "@/lib/planKanbanDragMove";
import { PROJECT_STATUSES } from "@/lib/projectStatus";
import type { Page, ProjectStatus } from "@/types/page";

interface KanbanBoardProps {
  projects: Page[];
  previews: Record<string, string>;
  onAddCard: (status: ProjectStatus) => void;
  isCreating?: boolean;
  onDragEndForTest?: (handler: (event: DragEndEvent) => void) => void;
}

export function KanbanBoard({
  projects,
  previews,
  onAddCard,
  isCreating,
  onDragEndForTest,
}: KanbanBoardProps) {
  const updatePage = useUpdatePage();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const grouped: Record<ProjectStatus, Page[]> = {
    planned: [],
    in_progress: [],
    done: [],
  };
  for (const p of projects) {
    const s = (p.properties.status ?? "planned") as ProjectStatus;
    grouped[s].push(p);
  }
  for (const s of PROJECT_STATUSES) {
    grouped[s].sort((a, b) => a.order - b.order);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const move = planKanbanDragMove({
      projects,
      draggedId: String(active.id),
      overId: String(over.id),
    });
    if (!move) return;
    updatePage.mutate(
      {
        pageId: move.pageId,
        input: {
          properties: { status: move.newStatus },
          order: move.newOrder,
        },
      },
      {
        onError: () => toast.error("이동 실패 — 잠시 후 다시 시도해주세요"),
      },
    );
  }

  useEffect(() => {
    if (onDragEndForTest) onDragEndForTest(handleDragEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const activeProject = activeId
    ? projects.find((p) => p._id === activeId) ?? null
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROJECT_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            projects={grouped[status]}
            previews={previews}
            onAddCard={onAddCard}
            isCreating={isCreating}
          />
        ))}
      </div>
      <DragOverlay>
        {activeProject ? (
          <ProjectCard
            project={activeProject}
            preview={previews[activeProject._id] ?? ""}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
