import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PinToggle } from "@/components/properties/PinToggle";
import {
  PROJECT_STATUSES,
  projectStatusBadgeClass,
  projectStatusLabel,
} from "@/lib/projectStatus";
import { cn } from "@/lib/cn";
import type { Page, ProjectStatus } from "@/types/page";

interface ProjectMetaBarProps {
  project: Page;
  onStatusChange: (next: ProjectStatus) => void;
  onPinToggle: () => void;
}

export function ProjectMetaBar({
  project,
  onStatusChange,
  onPinToggle,
}: ProjectMetaBarProps) {
  const status = (project.properties.status ?? "planned") as ProjectStatus;
  const progress = project.properties.progress;
  const dueDate = project.properties.dueDate;
  const tags = project.properties.tags ?? [];
  const isPinned = project.properties.isPinned === true;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-ink">
      <PinToggle isPinned={isPinned} onToggle={onPinToggle} size="md" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
            projectStatusBadgeClass(status),
          )}
          aria-label="상태 변경"
        >
          {projectStatusLabel(status)}
          <ChevronDown className="w-3 h-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {PROJECT_STATUSES.map((s) => (
            <DropdownMenuItem
              key={s}
              onSelect={() => onStatusChange(s)}
              className={status === s ? "font-semibold" : ""}
            >
              {projectStatusLabel(s)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {typeof progress === "number" && (
        <span aria-label={`진행률 ${progress}%`}>📊 {progress}%</span>
      )}
      {dueDate && <span aria-label="마감일">📅 {dueDate}</span>}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label="태그">
          {tags.map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded bg-tag-pink/10 text-tag-pink"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
