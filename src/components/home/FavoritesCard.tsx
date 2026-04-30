// src/components/home/FavoritesCard.tsx
import { Link } from "react-router-dom";
import { FileText, KanbanSquare, Pin } from "lucide-react";
import { useFavoritePages } from "@/hooks/useFavoritePages";
import { BentoCard } from "./BentoCard";

function pageHref(p: { _id: string; properties: { type?: string } }): string {
  return p.properties.type === "project"
    ? `/projects/${p._id}`
    : `/meetings/${p._id}`;
}

export function FavoritesCard() {
  const favs = useFavoritePages(5);

  return (
    <BentoCard title="즐겨찾기" accent="pink" span="1x1">
      {favs.isLoading ? (
        <p className="text-xs text-muted-ink">불러오는 중...</p>
      ) : !favs.data || favs.data.length === 0 ? (
        <p className="text-xs text-muted-ink">
          핀 고정한 항목이 없습니다.
        </p>
      ) : (
        <ul className="space-y-1">
          {favs.data.map((p) => {
            const Icon = p.properties.type === "project" ? KanbanSquare : FileText;
            return (
              <li key={p._id}>
                <Link
                  to={pageHref(p)}
                  className="flex items-center gap-2 hover:bg-page rounded-md p-1.5 -mx-1.5 text-sm"
                >
                  <Icon className="w-3.5 h-3.5 text-muted-ink shrink-0" />
                  <span className="text-ink line-clamp-1 flex-1">
                    {p.title || "제목 없음"}
                  </span>
                  <Pin className="w-3 h-3 text-tag-pink shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </BentoCard>
  );
}
