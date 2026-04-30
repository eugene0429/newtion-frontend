// src/components/home/RecentMeetingsCard.tsx
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPages } from "@/api/pages";
import { sortByUpdatedAt } from "@/lib/sortByUpdatedAt";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import { useWorkspace } from "@/hooks/useWorkspace";
import { BentoCard } from "./BentoCard";

export function RecentMeetingsCard() {
  const { workspaceId, rootFolders } = useWorkspace();
  const meetingsRoot = rootFolders?.meetings;
  const query = useQuery({
    queryKey: ["pages", { workspaceId, parentPageId: meetingsRoot, includeArchived: false }],
    queryFn: () =>
      getPages({
        workspaceId: workspaceId!,
        parentPageId: meetingsRoot,
        includeArchived: false,
      }),
    enabled: !!workspaceId && !!meetingsRoot,
    staleTime: 30_000,
  });

  const recent = useMemo(() => sortByUpdatedAt(query.data ?? [], 5), [query.data]);

  return (
    <BentoCard
      title="최근 회의록"
      accent="violet"
      span="1x1"
      seeMoreHref="/meetings"
    >
      {query.isLoading ? (
        <p className="text-xs text-muted-ink">불러오는 중...</p>
      ) : recent.length === 0 ? (
        <p className="text-xs text-muted-ink">회의록 없음</p>
      ) : (
        <ul className="space-y-1">
          {recent.map((p) => (
            <li key={p._id}>
              <Link
                to={`/meetings/${p._id}`}
                className="block hover:bg-page rounded-md p-1.5 -mx-1.5 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink line-clamp-1">{p.title || "제목 없음"}</span>
                  <span className="text-[10px] text-muted-ink shrink-0">
                    {formatMeetingDate(p.properties.date)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BentoCard>
  );
}
