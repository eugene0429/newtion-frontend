import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSearch } from "@/hooks/useSearch";
import { groupSearchResults } from "@/components/search/groupSearchResults";
import { SearchResultGroup } from "@/components/search/SearchResultGroup";
import type { Page } from "@/types/page";

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const navigate = useNavigate();

  const search = useSearch(q);
  const grouped = useMemo(
    () => (search.data ? groupSearchResults(search.data) : { meetings: [], projects: [] }),
    [search.data],
  );
  const total = grouped.meetings.length + grouped.projects.length;

  const handleSelect = (page: Page) => {
    const href =
      page.properties.type === "project"
        ? `/projects/${page._id}`
        : `/meetings/${page._id}`;
    navigate(href);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">검색</h1>
        {q ? (
          <p className="text-sm text-muted-ink">
            <span className="text-ink">"{q}"</span> 결과 {search.isLoading ? "..." : `${total}개`}
          </p>
        ) : null}
      </header>

      {q.trim().length === 0 ? (
        <p className="text-sm text-muted-ink">검색어를 입력하세요</p>
      ) : search.isLoading ? (
        <p className="text-sm text-muted-ink">불러오는 중...</p>
      ) : total === 0 ? (
        <p className="text-sm text-muted-ink">결과 없음</p>
      ) : (
        <div className="space-y-4">
          <SearchResultGroup
            label="📝 회의록"
            pages={grouped.meetings}
            highlightedId={null}
            onSelect={handleSelect}
            onHover={() => undefined}
          />
          <SearchResultGroup
            label="📋 프로젝트"
            pages={grouped.projects}
            highlightedId={null}
            onSelect={handleSelect}
            onHover={() => undefined}
          />
        </div>
      )}
    </div>
  );
}
