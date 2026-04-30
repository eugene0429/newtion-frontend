import { Link } from "react-router-dom";
import { FileText, KanbanSquare, Pin } from "lucide-react";
import { useFavoritePages } from "@/hooks/useFavoritePages";
import type { Page } from "@/types/page";

function href(p: Page): string {
  return p.properties.type === "project"
    ? `/projects/${p._id}`
    : `/meetings/${p._id}`;
}

export function SidebarFavorites() {
  const favs = useFavoritePages(10);
  if (!favs.data || favs.data.length === 0) return null;

  return (
    <section className="px-2 py-2 border-t border-line">
      <h3 className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-ink flex items-center gap-1">
        <Pin className="w-3 h-3" />
        즐겨찾기
      </h3>
      <ul className="space-y-0.5">
        {favs.data.map((p) => {
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
