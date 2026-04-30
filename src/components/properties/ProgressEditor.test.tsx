import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressEditor } from "./ProgressEditor";

describe("ProgressEditor", () => {
  it("readonly 모드: 값만 표시한다", () => {
    render(<ProgressEditor value={42} onCommit={() => {}} />);
    expect(screen.getByLabelText(/진행률/i)).toBeInTheDocument();
    expect(screen.getByText(/42%/)).toBeInTheDocument();
  });

  it("값이 없으면 '진행률 추가' 트리거를 표시한다", () => {
    render(<ProgressEditor value={undefined} onCommit={() => {}} />);
    expect(screen.getByRole("button", { name: /진행률 추가/i })).toBeInTheDocument();
  });

  it("트리거 클릭 → input 모드로 진입 + 자동 포커스", async () => {
    const user = userEvent.setup();
    render(<ProgressEditor value={42} onCommit={() => {}} />);
    await user.click(screen.getByText(/42%/));
    const input = screen.getByLabelText(/진행률 입력/i) as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input.value).toBe("42");
  });

  it("값을 바꾸고 Enter → onCommit(새 값)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<ProgressEditor value={42} onCommit={onCommit} />);
    await user.click(screen.getByText(/42%/));
    const input = screen.getByLabelText(/진행률 입력/i);
    await user.clear(input);
    await user.type(input, "75{Enter}");
    expect(onCommit).toHaveBeenCalledWith(75);
  });

  it("0-100 범위 밖 값은 clamp 한다", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<ProgressEditor value={42} onCommit={onCommit} />);
    await user.click(screen.getByText(/42%/));
    const input = screen.getByLabelText(/진행률 입력/i);
    await user.clear(input);
    await user.type(input, "150{Enter}");
    expect(onCommit).toHaveBeenCalledWith(100);
  });

  it("Esc 누르면 commit 없이 readonly 모드로", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<ProgressEditor value={42} onCommit={onCommit} />);
    await user.click(screen.getByText(/42%/));
    await user.keyboard("{Escape}");
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText(/42%/)).toBeInTheDocument();
  });
});
