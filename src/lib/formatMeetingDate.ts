const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parse(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatMeetingDate(iso: string | undefined): string {
  const d = parse(iso);
  if (!d) return "";
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

export function formatMonthLabel(iso: string): string {
  const d = parse(iso);
  if (!d) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}
