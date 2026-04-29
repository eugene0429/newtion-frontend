import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearch } from "@/hooks/useSearch";
import { groupSearchResults } from "./groupSearchResults";
import { SearchResultGroup } from "./SearchResultGroup";
import type { Page } from "@/types/page";

function pageHref(page: Page): string {
  return page.properties.type === "project"
    ? `/projects/${page._id}`
    : `/meetings/${page._id}`;
}

export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 200);
  const search = useSearch(debounced);
  const grouped = useMemo(
    () => (search.data ? groupSearchResults(search.data) : { meetings: [], projects: [] }),
    [search.data],
  );
  const flat = useMemo(
    () => [...grouped.meetings, ...grouped.projects],
    [grouped],
  );

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlightedId(null);
      // Focus 는 Dialog 가 자동으로 처리하지만 input 우선 보장
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setHighlightedId(null);
  }, [debounced]);

  const handleSelect = (page: Page) => {
    setOpen(false);
    navigate(pageHref(page));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flat.length === 0) {
      if (e.key === "Enter" && query.trim().length > 0) {
        e.preventDefault();
        setOpen(false);
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = highlightedId
        ? flat.findIndex((p) => p._id === highlightedId)
        : -1;
      const next = flat[(idx + 1) % flat.length];
      setHighlightedId(next._id);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = highlightedId
        ? flat.findIndex((p) => p._id === highlightedId)
        : 0;
      const prev = flat[(idx - 1 + flat.length) % flat.length];
      setHighlightedId(prev._id);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedId) {
        const target = flat.find((p) => p._id === highlightedId);
        if (target) handleSelect(target);
      } else if (query.trim().length > 0) {
        setOpen(false);
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 gap-0">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search className="w-4 h-4 text-muted-ink" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="검색 — 회의록, 프로젝트 제목"
            className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
            aria-label="검색"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {debounced.trim().length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-ink">
              검색어를 입력하세요
            </p>
          ) : search.isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-ink">
              불러오는 중...
            </p>
          ) : flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-ink">
              결과 없음
            </p>
          ) : (
            <>
              <SearchResultGroup
                label="📝 회의록"
                pages={grouped.meetings}
                highlightedId={highlightedId}
                onSelect={handleSelect}
                onHover={(p) => setHighlightedId(p._id)}
              />
              <SearchResultGroup
                label="📋 프로젝트"
                pages={grouped.projects}
                highlightedId={highlightedId}
                onSelect={handleSelect}
                onHover={(p) => setHighlightedId(p._id)}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
