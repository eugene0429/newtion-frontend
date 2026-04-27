import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
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
    <ThemeProvider>
      <BrowserRouter>
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
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
