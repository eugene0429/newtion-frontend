import type { Page } from "@/types/page";

export interface GroupedResults {
  meetings: Page[];
  projects: Page[];
}

export function groupSearchResults(pages: Page[]): GroupedResults {
  const meetings: Page[] = [];
  const projects: Page[] = [];
  for (const p of pages) {
    if (p.properties.type === "meeting") meetings.push(p);
    else if (p.properties.type === "project") projects.push(p);
  }
  return { meetings, projects };
}
