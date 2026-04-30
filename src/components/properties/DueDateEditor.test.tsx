import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DueDateEditor } from "./DueDateEditor";

describe("DueDateEditor", () => {
  it("값이 있으면 표시한다", () => {
    render(<DueDateEditor value="2026-05-10" onCommit={() => {}} />);
    expect(screen.getByText(/2026-05-10/)).toBeInTheDocument();
  });

  it("값이 없으면 '+ 마감일' 트리거", () => {
    render(<DueDateEditor value={undefined} onCommit={() => {}} />);
    expect(screen.getByRole("button", { name: /마감일 추가/i })).toBeInTheDocument();
  });

  it("표시 클릭 → date input 노출 + 값 변경 → onCommit(YYYY-MM-DD)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<DueDateEditor value="2026-05-10" onCommit={onCommit} />);
    await user.click(screen.getByText(/2026-05-10/));
    const input = screen.getByLabelText(/마감일 입력/i) as HTMLInputElement;
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "2026-06-01" } });
    input.blur();
    expect(onCommit).toHaveBeenCalledWith("2026-06-01");
  });

  it("input 을 비우고 blur → onCommit(undefined) (마감일 제거)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<DueDateEditor value="2026-05-10" onCommit={onCommit} />);
    await user.click(screen.getByText(/2026-05-10/));
    const input = screen.getByLabelText(/마감일 입력/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    input.blur();
    expect(onCommit).toHaveBeenCalledWith(undefined);
  });
});
