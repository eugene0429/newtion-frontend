// src/components/home/QuickActionsCard.tsx
import { Link } from "react-router-dom";
import { FileText, KanbanSquare, Search } from "lucide-react";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { BentoCard } from "./BentoCard";

export function QuickActionsCard() {
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  return (
    <BentoCard title="빠른 액션" accent="teal" span="1x1">
      <div className="space-y-2">
        <Link
          to="/meetings"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink hover:bg-page"
        >
          <FileText className="w-4 h-4 text-muted-ink" />
          새 회의록
        </Link>
        <Link
          to="/projects"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink hover:bg-page"
        >
          <KanbanSquare className="w-4 h-4 text-muted-ink" />
          새 프로젝트
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink hover:bg-page text-left"
        >
          <Search className="w-4 h-4 text-muted-ink" />
          ⌘K 검색
        </button>
      </div>
    </BentoCard>
  );
}
