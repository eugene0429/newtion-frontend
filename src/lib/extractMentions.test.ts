import { describe, it, expect } from "vitest";
import { extractMentions } from "./extractMentions";
import type { BlockNoteLikeBlock } from "./blockAdapter";

const para = (
  inline: { type: "text" | "link"; text?: string; href?: string; content?: { type: "text"; text: string }[] }[],
  children: BlockNoteLikeBlock[] = [],
): BlockNoteLikeBlock => ({
  id: Math.random().toString(36).slice(2),
  type: "paragraph",
  props: {},
  content: inline as never,
  children,
});

describe("extractMentions", () => {
  it("내부 path 가 아닌 link 는 무시한다", () => {
    const blocks = [
      para([
        { type: "text", text: "외부 " },
        { type: "link", href: "https://example.com", content: [{ type: "text", text: "링크" }] },
      ]),
    ];
    expect(extractMentions(blocks)).toEqual([]);
  });

  it("/meetings/:id 와 /projects/:id 패턴의 href 를 페이지 ID 로 추출한다", () => {
    const blocks = [
      para([
        { type: "link", href: "/projects/pg_proj_a", content: [{ type: "text", text: "프로젝트 A" }] },
        { type: "text", text: " 와 " },
        { type: "link", href: "/meetings/pg_meet_b", content: [{ type: "text", text: "회의 B" }] },
      ]),
    ];
    expect(extractMentions(blocks)).toEqual(["pg_proj_a", "pg_meet_b"]);
  });

  it("같은 페이지 ID 는 중복 제거하되 등장 순서는 보존한다", () => {
    const blocks = [
      para([
        { type: "link", href: "/projects/pg_a", content: [{ type: "text", text: "A" }] },
      ]),
      para([
        { type: "link", href: "/projects/pg_b", content: [{ type: "text", text: "B" }] },
        { type: "link", href: "/projects/pg_a", content: [{ type: "text", text: "A again" }] },
      ]),
    ];
    expect(extractMentions(blocks)).toEqual(["pg_a", "pg_b"]);
  });

  it("자식 블록까지 재귀적으로 탐색한다", () => {
    const blocks = [
      para([{ type: "text", text: "부모" }], [
        para([
          { type: "link", href: "/projects/pg_child", content: [{ type: "text", text: "child" }] },
        ]),
      ]),
    ];
    expect(extractMentions(blocks)).toEqual(["pg_child"]);
  });

  it("href 가 끝에 슬래시/쿼리스트링이 붙어도 ID 만 추출한다", () => {
    const blocks = [
      para([
        { type: "link", href: "/projects/pg_q?focus=true", content: [{ type: "text", text: "Q" }] },
        { type: "link", href: "/meetings/pg_s/", content: [{ type: "text", text: "S" }] },
      ]),
    ];
    expect(extractMentions(blocks)).toEqual(["pg_q", "pg_s"]);
  });
});
