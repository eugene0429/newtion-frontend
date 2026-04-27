import { Link } from "react-router-dom";
import { Pin } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import type { Page } from "@/types/page";

interface MeetingCardProps {
  meeting: Page;
  preview: string;
}

export function MeetingCard({ meeting, preview }: MeetingCardProps) {
  return (
    <Link
      to={`/meetings/${meeting._id}`}
      className={cn(
        "group block rounded-card bg-card border border-line p-4",
        "shadow-elevation hover:shadow-elevation-hover",
        "transition-all duration-card hover:scale-[1.02]",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-ink">
          {formatMeetingDate(meeting.properties.date)}
        </span>
        {meeting.properties.isPinned && (
          <Pin
            className="w-3.5 h-3.5 text-tag-pink"
            aria-label="고정됨"
          />
        )}
      </div>
      <h3 className="text-base font-semibold text-ink mb-1 line-clamp-1">
        {meeting.title || "제목 없음"}
      </h3>
      <p className="text-sm text-muted-ink line-clamp-2 whitespace-pre-line">
        {preview || "내용 없음"}
      </p>
    </Link>
  );
}
