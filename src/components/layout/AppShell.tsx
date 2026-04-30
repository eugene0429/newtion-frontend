import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/search/CommandPalette";
import { useGlobalKeybindings } from "@/hooks/useGlobalKeybindings";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";

export function AppShell() {
  useGlobalKeybindings();
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-page text-ink">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          <ErrorBoundary
            resetKey={location.pathname}
            title="이 페이지를 표시할 수 없어요"
            message="이 페이지를 렌더링하다가 문제가 생겼어요. 다른 페이지로 이동하거나 재시도하세요."
          >
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
