import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { AppBootstrap } from "@/components/feedback/AppBootstrap";
import HomePage from "@/routes/HomePage";
import MeetingsListPage from "@/routes/MeetingsListPage";
import MeetingDetailPage from "@/routes/MeetingDetailPage";
import ProjectsKanbanPage from "@/routes/ProjectsKanbanPage";
import ProjectDetailPage from "@/routes/ProjectDetailPage";
import SearchPage from "@/routes/SearchPage";
import SettingsPage from "@/routes/SettingsPage";
import NotFoundPage from "@/routes/NotFoundPage";

export default function App() {
  return (
    <ErrorBoundary
      fullscreen
      title="Newtion 을 시작할 수 없어요"
      message="앱이 예상치 못한 오류를 만났어요. 새로고침 또는 재시도를 눌러주세요."
    >
      <ThemeProvider>
        <BrowserRouter>
          <AppBootstrap>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<HomePage />} />
                <Route path="meetings" element={<MeetingsListPage />} />
                <Route path="meetings/:id" element={<MeetingDetailPage />} />
                <Route path="projects" element={<ProjectsKanbanPage />}>
                  <Route path=":id" element={<ProjectDetailPage />} />
                </Route>
                <Route path="search" element={<SearchPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </AppBootstrap>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
