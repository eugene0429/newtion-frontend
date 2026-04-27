import type { Page } from "@/types/page";
import { formatMonthLabel } from "./formatMeetingDate";

export interface MeetingGroup {
  /** Sort key: "YYYY-MM" or "____" for undated. */
  key: string;
  label: string;
  items: Page[];
}

export function groupMeetingsByMonth(meetings: Page[]): MeetingGroup[] {
  const buckets = new Map<string, Page[]>();
  meetings.forEach((m) => {
    const date = m.properties.date;
    const key = date ? date.slice(0, 7) : "____";
    const arr = buckets.get(key) ?? [];
    arr.push(m);
    buckets.set(key, arr);
  });

  const groups: MeetingGroup[] = [];
  buckets.forEach((items, key) => {
    items.sort((a, b) => {
      const da = a.properties.date ?? "";
      const db = b.properties.date ?? "";
      return db.localeCompare(da);
    });
    groups.push({
      key,
      label:
        key === "____"
          ? "날짜 없음"
          : formatMonthLabel(items[0].properties.date ?? ""),
      items,
    });
  });

  groups.sort((a, b) => {
    if (a.key === "____") return 1;
    if (b.key === "____") return -1;
    return b.key.localeCompare(a.key);
  });

  return groups;
}
