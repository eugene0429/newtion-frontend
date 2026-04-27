import { server } from "@/test/msw";
import { resetDb, db } from "@/mocks/db/store";
import { createBlock, createBlocksBatch } from "@/api/blocks";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => resetDb());

describe("blocks handler — client-supplied _id", () => {
  it("preserves _id when POST /blocks body provides it", async () => {
    const created = await createBlock({
      _id: "client-block-1",
      pageId: "pg_x",
      type: "paragraph",
      content: { props: {}, inline: [] },
      order: 0,
    });
    expect(created._id).toBe("client-block-1");
    expect(db.blocks.find((b) => b._id === "client-block-1")).toBeDefined();
  });

  it("preserves _id for every item in POST /blocks/batch", async () => {
    const created = await createBlocksBatch([
      { _id: "a", pageId: "pg_x", type: "paragraph", content: {}, order: 0 },
      { _id: "b", pageId: "pg_x", type: "paragraph", content: {}, order: 1 },
    ]);
    expect(created.map((b) => b._id)).toEqual(["a", "b"]);
  });

  it("falls back to generated _id when none provided", async () => {
    const created = await createBlock({
      pageId: "pg_x",
      type: "paragraph",
      content: {},
      order: 0,
    });
    expect(created._id).toMatch(/^bl_/);
  });
});
