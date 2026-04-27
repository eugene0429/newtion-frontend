import { computeBlockDelta } from "./computeBlockDelta";
import type { BlockInput } from "./blockAdapter";

const make = (
  _id: string,
  overrides: Partial<BlockInput> = {},
): BlockInput => ({
  _id,
  pageId: "pg",
  parentBlockId: null,
  type: "paragraph",
  content: { props: {}, inline: [{ type: "text", text: _id, styles: {} }] },
  order: 0,
  ...overrides,
});

describe("computeBlockDelta", () => {
  it("empty previous + new blocks → all toCreate", () => {
    const next = [make("a"), make("b")];
    const delta = computeBlockDelta([], next);
    expect(delta.toCreate.map((b) => b._id)).toEqual(["a", "b"]);
    expect(delta.toUpdate).toEqual([]);
    expect(delta.toDelete).toEqual([]);
  });

  it("removed block goes to toDelete", () => {
    const prev = [make("a"), make("b")];
    const next = [make("a")];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toDelete).toEqual(["b"]);
    expect(delta.toCreate).toEqual([]);
    expect(delta.toUpdate).toEqual([]);
  });

  it("changed content moves to toUpdate", () => {
    const prev = [make("a", { content: { props: {}, inline: [{ type: "text", text: "old", styles: {} }] } })];
    const next = [make("a", { content: { props: {}, inline: [{ type: "text", text: "new", styles: {} }] } })];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toUpdate.map((b) => b._id)).toEqual(["a"]);
  });

  it("unchanged block is not in any bucket", () => {
    const prev = [make("a")];
    const next = [make("a")];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toCreate).toEqual([]);
    expect(delta.toUpdate).toEqual([]);
    expect(delta.toDelete).toEqual([]);
  });

  it("order change alone triggers toUpdate", () => {
    const prev = [make("a", { order: 0 }), make("b", { order: 1 })];
    const next = [make("a", { order: 1 }), make("b", { order: 0 })];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toUpdate.map((b) => b._id).sort()).toEqual(["a", "b"]);
  });

  it("parentBlockId change triggers toUpdate", () => {
    const prev = [make("a", { parentBlockId: null })];
    const next = [make("a", { parentBlockId: "p" })];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toUpdate.map((b) => b._id)).toEqual(["a"]);
  });

  it("type change triggers toUpdate", () => {
    const prev = [make("a", { type: "paragraph" })];
    const next = [make("a", { type: "heading_1" })];
    const delta = computeBlockDelta(prev, next);
    expect(delta.toUpdate.map((b) => b._id)).toEqual(["a"]);
  });
});
