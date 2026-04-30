import React from "react";
import { errorId as makeId } from "@/lib/errorId";
import { ErrorFallback } from "./ErrorFallback";

interface Props {
  /** 변경 시 boundary 자동 리셋 (라우트 전환 등). */
  resetKey?: string | number;
  /** Fallback 의 풀스크린 여부 */
  fullscreen?: boolean;
  /** 사용자에게 보여줄 제목/메시지 — 미제공 시 기본값. */
  title?: string;
  message?: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, errorId: "" };

  static getDerivedStateFromError(error: Error): State {
    return { error, errorId: makeId() };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, errorId: "" });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 운영 환경에서는 외부 로거로 보낼 수 있는 hook point.
    if (typeof console !== "undefined") {
      console.error("[ErrorBoundary]", error, info);
    }
  }

  handleRetry = () => {
    this.setState({ error: null, errorId: "" });
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          title={this.props.title ?? "문제가 발생했어요"}
          message={this.props.message ?? this.state.error.message}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          fullscreen={this.props.fullscreen}
        />
      );
    }
    return this.props.children;
  }
}
