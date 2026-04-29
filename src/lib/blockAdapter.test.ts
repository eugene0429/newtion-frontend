import {
  blockNoteToBackend,
  backendToBlockNote,
  blockNoteTypeToBackend,
  backendTypeToBlockNote,
  type BlockNoteLikeBlock,
} from "./blockAdapter";

const sample: BlockNoteLikeBlock[] = [
  {
    id: "b1",
    type: "heading",
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
        type: "bulletListItem",
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

describe("blockAdapter — type mapping", () => {
  it("maps BlockNote types to backend BlockType", () => {
    expect(blockNoteTypeToBackend("paragraph", {})).toEqual({
      type: "paragraph",
      props: {},
    });
    expect(blockNoteTypeToBackend("bulletListItem", {})).toEqual({
      type: "bulleted_list_item",
      props: {},
    });
    expect(blockNoteTypeToBackend("numberedListItem", {})).toEqual({
      type: "numbered_list_item",
      props: {},
    });
    expect(blockNoteTypeToBackend("checkListItem", { checked: true })).toEqual({
      type: "to_do",
      props: { checked: true },
    });
    expect(blockNoteTypeToBackend("codeBlock", { language: "ts" })).toEqual({
      type: "code",
      props: { language: "ts" },
    });
    expect(blockNoteTypeToBackend("quote", {})).toEqual({ type: "quote", props: {} });
    expect(blockNoteTypeToBackend("image", {})).toEqual({ type: "image", props: {} });
    expect(blockNoteTypeToBackend("file", {})).toEqual({ type: "file", props: {} });
  });

  it("maps heading levels to heading_1/2/3", () => {
    expect(blockNoteTypeToBackend("heading", { level: 1 })).toEqual({
      type: "heading_1",
      props: { level: 1 },
    });
    expect(blockNoteTypeToBackend("heading", { level: 2 })).toEqual({
      type: "heading_2",
      props: { level: 2 },
    });
    expect(blockNoteTypeToBackend("heading", { level: 3 })).toEqual({
      type: "heading_3",
      props: { level: 3 },
    });
    expect(blockNoteTypeToBackend("heading", {})).toEqual({
      type: "heading_1",
      props: { level: 1 },
    });
  });

  it("inverse mapping: backend BlockType to BlockNote type", () => {
    expect(backendTypeToBlockNote("paragraph", {})).toEqual({ type: "paragraph", props: {} });
    expect(backendTypeToBlockNote("bulleted_list_item", {})).toEqual({
      type: "bulletListItem",
      props: {},
    });
    expect(backendTypeToBlockNote("to_do", { checked: false })).toEqual({
      type: "checkListItem",
      props: { checked: false },
    });
    expect(backendTypeToBlockNote("code", { language: "ts" })).toEqual({
      type: "codeBlock",
      props: { language: "ts" },
    });
    expect(backendTypeToBlockNote("heading_1", { level: 1 })).toEqual({
      type: "heading",
      props: { level: 1 },
    });
    expect(backendTypeToBlockNote("heading_2", {})).toEqual({
      type: "heading",
      props: { level: 2 },
    });
    expect(backendTypeToBlockNote("heading_3", {})).toEqual({
      type: "heading",
      props: { level: 3 },
    });
  });

  it("roundtrips a realistic BlockNote document", () => {
    const blockNoteDoc: BlockNoteLikeBlock[] = [
      {
        id: "h1",
        type: "heading",
        props: { level: 1 },
        content: [{ type: "text", text: "Title", styles: {} }],
        children: [],
      },
      {
        id: "p1",
        type: "paragraph",
        props: {},
        content: [{ type: "text", text: "Body", styles: {} }],
        children: [],
      },
      {
        id: "todo1",
        type: "checkListItem",
        props: { checked: true },
        content: [{ type: "text", text: "Done", styles: {} }],
        children: [],
      },
    ];
    const backend = blockNoteToBackend(blockNoteDoc, "page-1");
    expect(backend[0].type).toBe("heading_1");
    expect(backend[2].type).toBe("to_do");
    const roundtrip = backendToBlockNote(backend);
    expect(roundtrip).toEqual(blockNoteDoc);
  });
});

describe("blockAdapter — mention link inline", () => {
  it("link 인라인 (멘션 직렬화 형식) 이 라운드트립에서 보존된다", () => {
    const original: BlockNoteLikeBlock[] = [
      {
        id: "blk_1",
        type: "paragraph",
        props: {},
        content: [
          { type: "text", text: "관련 프로젝트: " } as never,
          {
            type: "link",
            href: "/projects/pg_proj_a",
            content: [{ type: "text", text: "프로젝트 A" }],
          } as never,
        ],
        children: [],
      },
    ];
    const backend = blockNoteToBackend(original, "page-1");
    const roundtrip = backendToBlockNote(backend);
    expect(roundtrip).toEqual(original);
  });
});
