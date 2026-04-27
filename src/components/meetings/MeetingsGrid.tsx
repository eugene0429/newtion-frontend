import { MeetingCard } from "./MeetingCard";
import type { Page } from "@/types/page";

interface MeetingsGridProps {
  meetings: Page[];
  previews: Record<string, string>;
}

export function MeetingsGrid({ meetings, previews }: MeetingsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {meetings.map((m) => (
        <MeetingCard key={m._id} meeting={m} preview={previews[m._id] ?? ""} />
      ))}
    </div>
  );
}
