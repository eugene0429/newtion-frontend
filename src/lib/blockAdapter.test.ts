import {
  blockNoteToBackend,
  backendToBlockNote,
  type BlockNoteLikeBlock,
} from "./blockAdapter";

const sample: BlockNoteLikeBlock[] = [
  {
    id: "b1",
    type: "heading_1",
    props: { level: 1 },
    content: [{ type: "text", text: "Title", styles: {} }],
    children: [],
  },
  {
    id: "b2",
    type: "paragraph",
    props: {},
    content: [{ type: "text", text: "Hello world", styles: {} }],
    children: [
      {
        id: "b2c1",
        type: "bulleted_list_item",
        props: {},
        content: [{ type: "text", text: "child", styles: {} }],
        children: [],
      },
    ],
  },
];

describe("blockAdapter", () => {
  it("flattens children with parentBlockId and order", () => {
    const out = blockNoteToBackend(sample, "page-1");
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({
      _id: "b1", pageId: "page-1", parentBlockId: null, order: 0,
    });
    expect(out[1]).toMatchObject({
      _id: "b2", parentBlockId: null, order: 1,
    });
    expect(out[2]).toMatchObject({
      _id: "b2c1", parentBlockId: "b2", order: 0,
    });
  });

  it("roundtrips: BlockNote → Backend → BlockNote equals original", () => {
    const backend = blockNoteToBackend(sample, "page-1");
    const roundtrip = backendToBlockNote(backend);
    expect(roundtrip).toEqual(sample);
  });

  it("returns empty array for empty input", () => {
    expect(blockNoteToBackend([], "page-1")).toEqual([]);
    expect(backendToBlockNote([])).toEqual([]);
  });
});
