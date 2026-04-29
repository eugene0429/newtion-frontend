import { seed } from "./seed";
import { db } from "./store";

describe("seed", () => {
  it("empty: true leaves db blank", () => {
    seed({ empty: true });
    expect(db.workspaces).toHaveLength(0);
    expect(db.pages).toHaveLength(0);
    expect(db.blocks).toHaveLength(0);
  });

  it("populated: 1 workspace, 2 root folders, 5 meetings, 8 projects", () => {
    seed();
    expect(db.workspaces).toHaveLength(1);
    const meetings = db.pages.filter((p) => p.properties.type === "meeting");
    const projects = db.pages.filter((p) => p.properties.type === "project");
    expect(meetings).toHaveLength(5);
    expect(projects).toHaveLength(8);
  });

  it("each meeting has at least 3 blocks at root level", () => {
    seed();
    const meetings = db.pages.filter((p) => p.properties.type === "meeting");
    meetings.forEach((m) => {
      const blocks = db.blocks.filter(
        (b) => b.pageId === m._id && b.parentBlockId === null,
      );
      expect(blocks.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("프로젝트 8개 각각에 블록 트리가 시드된다", () => {
    seed();
    const projects = db.pages.filter((p) => p.properties.type === "project");
    expect(projects).toHaveLength(8);
    for (const project of projects) {
      const blocks = db.blocks.filter((b) => b.pageId === project._id);
      expect(blocks.length).toBeGreaterThanOrEqual(2);
    }
  });
});
