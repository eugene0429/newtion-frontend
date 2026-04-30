import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronDown, FileText, KanbanSquare, FolderClock } from "lucide-react";
import { useRecentPages } from "@/hooks/useRecentPages";
import { cn } from "@/lib/cn";
import type { Page } from "@/types/page";

function href(p: Page): string {
  return p.properties.type === "project"
    ? `/projects/${p._id}`
    : `/meetings/${p._id}`;
}

export function SidebarRecent() {
  const [expanded, setExpanded] = useState(true);
  const recent = useRecentPages(5);
  if (!recent.data || recent.data.length === 0) return null;

  return (
    <section className="px-2 py-2 border-t border-line">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-1 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-ink hover:text-ink"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <FolderClock className="w-3 h-3" />
        최근 항목
      </button>
      <ul className={cn("space-y-0.5", !expanded && "hidden")}>
        {recent.data.map((p) => {
          const Icon = p.properties.type === "project" ? KanbanSquare : FileText;
          return (
            <li key={p._id}>
              <Link
                to={href(p)}
                className="flex items-center gap-2 px-3 py-1 rounded-md text-xs text-ink hover:bg-page"
              >
                <Icon className="w-3.5 h-3.5 text-muted-ink shrink-0" />
                <span className="line-clamp-1">{p.title || "제목 없음"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
