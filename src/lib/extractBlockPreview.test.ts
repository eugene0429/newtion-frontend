import { extractBlockPreview } from "./extractBlockPreview";
import type { Block } from "@/types/block";

const para = (text: string, order: number): Block => ({
  _id: `b${order}`,
  pageId: "pg",
  parentBlockId: null,
  type: "paragraph",
  content: { props: {}, inline: [{ type: "text", text, styles: {} }] },
  order,
  createdAt: "",
  updatedAt: "",
  removedAt: null,
});

describe("extractBlockPreview", () => {
  it("returns first paragraph text", () => {
    expect(extractBlockPreview([para("Hello", 0)])).toBe("Hello");
  });

  it("joins multiple paragraphs with newlines, capped at maxLength", () => {
    expect(
      extractBlockPreview(
        [para("first", 0), para("second", 1), para("third", 2)],
        { maxLength: 100 },
      ),
    ).toBe("first\nsecond\nthird");
  });

  it("truncates with ellipsis when text exceeds maxLength", () => {
    const long = "x".repeat(200);
    const out = extractBlockPreview([para(long, 0)], { maxLength: 50 });
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBe(51);
  });

  it("ignores blocks without inline text", () => {
    const dividerLike: Block = {
      _id: "d",
      pageId: "pg",
      parentBlockId: null,
      type: "divider",
      content: {},
      order: 0,
      createdAt: "",
      updatedAt: "",
      removedAt: null,
    };
    expect(extractBlockPreview([dividerLike, para("only this", 1)])).toBe(
      "only this",
    );
  });

  it("returns empty string for empty input", () => {
    expect(extractBlockPreview([])).toBe("");
  });
});
