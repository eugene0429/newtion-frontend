// src/components/home/RecentChangesCard.tsx
import { Link } from "react-router-dom";
import { FileText, KanbanSquare } from "lucide-react";
import { useRecentPages } from "@/hooks/useRecentPages";
import { relativeTime } from "@/lib/relativeTime";
import { BentoCard } from "./BentoCard";

function pageHref(p: { _id: string; properties: { type?: string } }): string {
  return p.properties.type === "project"
    ? `/projects/${p._id}`
    : `/meetings/${p._id}`;
}

export function RecentChangesCard() {
  const recent = useRecentPages(8);

  return (
    <BentoCard title="최근 변경" accent="sky" span="2x1">
      {recent.isLoading ? (
        <p className="text-xs text-muted-ink">불러오는 중...</p>
      ) : !recent.data || recent.data.length === 0 ? (
        <p className="text-xs text-muted-ink">변경된 항목 없음</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
          {recent.data.map((p) => {
            const Icon = p.properties.type === "project" ? KanbanSquare : FileText;
            return (
              <li key={p._id}>
                <Link
                  to={pageHref(p)}
                  className="flex items-center gap-2 hover:bg-page rounded-md px-1.5 py-1 -mx-1.5 text-sm"
                >
                  <Icon className="w-3.5 h-3.5 text-muted-ink shrink-0" />
                  <span className="text-ink line-clamp-1 flex-1">
                    {p.title || "제목 없음"}
                  </span>
                  <span className="text-[10px] text-muted-ink shrink-0">
                    {relativeTime(p.updatedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </BentoCard>
  );
}
