import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { formatMeetingDate } from "@/lib/formatMeetingDate";
import { PinToggle } from "@/components/properties/PinToggle";
import { useTogglePin } from "@/hooks/useTogglePin";
import type { Page } from "@/types/page";

interface MeetingCardProps {
  meeting: Page;
  preview: string;
}

export function MeetingCard({ meeting, preview }: MeetingCardProps) {
  const isPinned = meeting.properties.isPinned === true;
  const togglePin = useTogglePin();

  return (
    <Link
      to={`/meetings/${meeting._id}`}
      className={cn(
        "group block rounded-card bg-card border border-line p-4",
        "shadow-elevation hover:shadow-elevation-hover",
        "transition-all duration-card hover:scale-[1.02]",
        "motion-reduce:transition-none motion-reduce:hover:scale-100",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-ink">
          {formatMeetingDate(meeting.properties.date)}
        </span>
        <PinToggle
          isPinned={isPinned}
          onToggle={() =>
            togglePin.mutate({ pageId: meeting._id, currentlyPinned: isPinned })
          }
          className={cn(
            !isPinned && "opacity-0 group-hover:opacity-100 transition-opacity",
          )}
        />
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
