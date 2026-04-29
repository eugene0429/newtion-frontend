// src/components/search/SearchResultGroup.tsx
import type { Page } from "@/types/page";
import { SearchResultItem } from "./SearchResultItem";

interface Props {
  label: string;
  pages: Page[];
  highlightedId: string | null;
  onSelect: (page: Page) => void;
  onHover: (page: Page) => void;
}

export function SearchResultGroup({
  label,
  pages,
  highlightedId,
  onSelect,
  onHover,
}: Props) {
  if (pages.length === 0) return null;
  return (
    <div role="group" aria-label={label} className="space-y-1">
      <div className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-ink">
        {label}
      </div>
      <div role="listbox" className="space-y-0.5">
        {pages.map((p) => (
          <SearchResultItem
            key={p._id}
            page={p}
            highlighted={highlightedId === p._id}
            onSelect={() => onSelect(p)}
            onMouseEnter={() => onHover(p)}
          />
        ))}
      </div>
    </div>
  );
}
