import { render, screen } from "@testing-library/react";
import { SaveIndicator } from "./SaveIndicator";

describe("SaveIndicator", () => {
  it("renders nothing when status is idle", () => {
    const { container } = render(<SaveIndicator status="idle" />);
    expect(container.textContent).toBe("");
  });
  it("shows saving label", () => {
    render(<SaveIndicator status="saving" />);
    expect(screen.getByText("저장 중...")).toBeInTheDocument();
  });
  it("shows saved label", () => {
    render(<SaveIndicator status="saved" />);
    expect(screen.getByText("저장됨 ✓")).toBeInTheDocument();
  });
  it("shows error label and is announced as alert", () => {
    render(<SaveIndicator status="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("저장 실패");
  });
});
