import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PinToggle } from "./PinToggle";

describe("PinToggle", () => {
  it("isPinned=false 면 빈 핀 아이콘", () => {
    render(<PinToggle isPinned={false} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /즐겨찾기 추가|pin/i })).toBeInTheDocument();
  });

  it("isPinned=true 면 채워진 핀 + 다른 라벨", () => {
    render(<PinToggle isPinned={true} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /즐겨찾기 해제|unpin/i })).toBeInTheDocument();
  });

  it("클릭 시 onToggle 호출 + 부모 클릭 전파 차단", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <PinToggle isPinned={false} onToggle={onToggle} />
      </div>,
    );
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
