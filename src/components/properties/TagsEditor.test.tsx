import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagsEditor } from "./TagsEditor";

describe("TagsEditor", () => {
  it("기존 태그를 칩으로 표시한다", () => {
    render(<TagsEditor value={["a", "b"]} onCommit={() => {}} />);
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
  });

  it("+ 클릭 → input 입력 → Enter → onCommit([...prev, new])", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={["a"]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 추가/i }));
    const input = screen.getByLabelText(/태그 입력/i);
    await user.type(input, "new{Enter}");
    expect(onCommit).toHaveBeenCalledWith(["a", "new"]);
  });

  it("Comma 입력도 태그로 commit 한다", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={[]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 추가/i }));
    const input = screen.getByLabelText(/태그 입력/i);
    await user.type(input, "x,");
    expect(onCommit).toHaveBeenCalledWith(["x"]);
  });

  it("중복 태그는 무시한다 (대소문자 구분 없이)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={["frontend"]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 추가/i }));
    await user.type(screen.getByLabelText(/태그 입력/i), "FRONTEND{Enter}");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("빈 문자열은 commit 하지 않는다", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={[]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 추가/i }));
    await user.type(screen.getByLabelText(/태그 입력/i), "   {Enter}");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("✕ 클릭 → onCommit(제거된 배열)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={["a", "b"]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 a 제거/i }));
    expect(onCommit).toHaveBeenCalledWith(["b"]);
  });

  it("Esc 는 input 을 닫고 commit 안 함", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<TagsEditor value={[]} onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: /태그 추가/i }));
    const input = screen.getByLabelText(/태그 입력/i);
    await user.type(input, "draft");
    await user.keyboard("{Escape}");
    expect(onCommit).not.toHaveBeenCalled();
  });
});
