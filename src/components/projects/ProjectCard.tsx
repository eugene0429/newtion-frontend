import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { PinToggle } from "@/components/properties/PinToggle";
import { useTogglePin } from "@/hooks/useTogglePin";
import type { Page, ProjectStatus } from "@/types/page";

interface ProjectCardProps {
  project: Page;
  preview: string;
}

export function ProjectCard({ project, preview }: ProjectCardProps) {
  const status = (project.properties.status ?? "planned") as ProjectStatus;
  const progress = project.properties.progress;
  const tags = project.properties.tags ?? [];
  const isPinned = project.properties.isPinned === true;
  const showProgress =
    status === "in_progress" && typeof progress === "number";
  const clampedProgress = Math.max(0, Math.min(100, progress ?? 0));
  const togglePin = useTogglePin();

  return (
    <Link
      to={`/projects/${project._id}`}
      className={cn(
        "group block rounded-card bg-card border border-line p-3",
        "shadow-elevation hover:shadow-elevation-hover",
        "transition-all duration-card hover:scale-[1.01]",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-ink line-clamp-1">
          {project.title || "제목 없음"}
        </h3>
        <PinToggle
          isPinned={isPinned}
          onToggle={() =>
            togglePin.mutate({ pageId: project._id, currentlyPinned: isPinned })
          }
          className={cn(
            "shrink-0",
            !isPinned && "opacity-0 group-hover:opacity-100 transition-opacity",
          )}
        />
      </div>
      {preview && (
        <p className="text-xs text-muted-ink line-clamp-2 whitespace-pre-line mb-2">
          {preview}
        </p>
      )}
      {showProgress && (
        <div
          className="h-1 w-full rounded-full bg-line/60 overflow-hidden mb-2"
          aria-label={`진행률 ${clampedProgress}%`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={clampedProgress}
        >
          <div
            className="h-full bg-status-progressFg"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
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
    </Link>
  );
}
