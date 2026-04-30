import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorFallback } from "./ErrorFallback";

describe("ErrorFallback", () => {
  it("주어진 메시지와 에러 ID 를 표시한다", () => {
    render(
      <ErrorFallback
        title="문제가 발생했어요"
        message="알 수 없는 오류"
        errorId="abc12345"
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText("문제가 발생했어요")).toBeInTheDocument();
    expect(screen.getByText("알 수 없는 오류")).toBeInTheDocument();
    expect(screen.getByText(/abc12345/)).toBeInTheDocument();
  });

  it("재시도 버튼 클릭 → onRetry 호출", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorFallback
        title="문제가 발생했어요"
        message="알 수 없는 오류"
        errorId="abc12345"
        onRetry={onRetry}
      />,
    );
    await user.click(screen.getByRole("button", { name: /재시도/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("onRetry 가 없으면 새로고침 버튼만 노출한다", () => {
    render(
      <ErrorFallback
        title="앱을 시작할 수 없어요"
        message="네트워크 연결을 확인해주세요"
        errorId="zz999999"
      />,
    );
    expect(screen.queryByRole("button", { name: /재시도/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /새로고침/i })).toBeInTheDocument();
  });
});
