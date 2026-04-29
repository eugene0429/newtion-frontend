import type { ProjectStatus } from "@/types/page";

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "planned",
  "in_progress",
  "done",
] as const;

export function projectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case "planned":
      return "예정";
    case "in_progress":
      return "진행중";
    case "done":
      return "완료";
  }
}

export function projectStatusEmoji(status: ProjectStatus): string {
  switch (status) {
    case "planned":
      return "🟦";
    case "in_progress":
      return "🟧";
    case "done":
      return "🟩";
  }
}

export function projectStatusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "planned":
      return "bg-status-plannedBg text-status-plannedFg";
    case "in_progress":
      return "bg-status-progressBg text-status-progressFg";
    case "done":
      return "bg-status-doneBg text-status-doneFg";
  }
}

export function projectStatusDotClass(status: ProjectStatus): string {
  switch (status) {
    case "planned":
      return "bg-status-plannedFg";
    case "in_progress":
      return "bg-status-progressFg";
    case "done":
      return "bg-status-doneFg";
  }
}
