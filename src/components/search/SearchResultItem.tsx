// src/components/search/SearchResultItem.tsx
import { FileText, KanbanSquare } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Page } from "@/types/page";

interface Props {
  page: Page;
  highlighted?: boolean;
  onSelect: () => void;
  onMouseEnter?: () => void;
}

export function SearchResultItem({
  page,
  highlighted,
  onSelect,
  onMouseEnter,
}: Props) {
  const Icon = page.properties.type === "project" ? KanbanSquare : FileText;
  return (
    <button
      type="button"
      role="option"
      aria-selected={highlighted}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm",
        highlighted
          ? "bg-brand/10 text-brand"
          : "text-ink hover:bg-page",
      )}
    >
      <Icon className="w-4 h-4 shrink-0 text-muted-ink" aria-hidden />
      <span className="truncate">{page.title || "제목 없음"}</span>
    </button>
  );
}
