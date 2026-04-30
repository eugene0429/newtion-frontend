import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SaveIndicator } from "@/components/editor/SaveIndicator";
import { PinToggle } from "@/components/properties/PinToggle";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import type { AutosaveStatus } from "@/hooks/useAutosaveBlocks";

interface MeetingHeaderProps {
  title: string;
  date?: string;
  isPinned: boolean;
  onTitleChange: (next: string) => void;
  onPinToggle: () => void;
  saveStatus: AutosaveStatus;
}

export function MeetingHeader({
  title,
  date,
  isPinned,
  onTitleChange,
  onPinToggle,
  saveStatus,
}: MeetingHeaderProps) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  return (
    <header className="sticky top-0 bg-page border-b border-line py-4 z-10">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate("/meetings")}
          className="inline-flex items-center gap-1 text-sm text-muted-ink hover:text-ink"
          aria-label="회의록 목록으로"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로
        </button>
        <div className="flex items-center gap-2">
          <PinToggle isPinned={isPinned} onToggle={onPinToggle} size="md" />
          <SaveIndicator status={saveStatus} />
        </div>
      </div>
      <div className="mt-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== title) onTitleChange(draft);
          }}
          placeholder="제목 없음"
          className="w-full bg-transparent text-3xl font-bold text-ink placeholder:text-muted-ink/40 focus:outline-none"
        />
        {date && (
          <p className="text-sm text-muted-ink mt-1">
            📅 {formatMeetingDate(date)}
          </p>
        )}
      </div>
    </header>
  );
}
