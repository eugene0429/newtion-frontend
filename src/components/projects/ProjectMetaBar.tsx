import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PinToggle } from "@/components/properties/PinToggle";
import { ProgressEditor } from "@/components/properties/ProgressEditor";
import { TagsEditor } from "@/components/properties/TagsEditor";
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
  onProgressChange: (next: number | undefined) => void;
  onTagsChange: (next: string[]) => void;
}

export function ProjectMetaBar({
  project,
  onStatusChange,
  onPinToggle,
  onProgressChange,
  onTagsChange,
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
      <ProgressEditor
        value={typeof progress === "number" ? progress : undefined}
        onCommit={onProgressChange}
      />
      {dueDate && <span aria-label="마감일">📅 {dueDate}</span>}
      <TagsEditor value={tags} onCommit={onTagsChange} />
    </div>
  );
}
