import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/search/CommandPalette";
import { useGlobalKeybindings } from "@/hooks/useGlobalKeybindings";

export function AppShell() {
  useGlobalKeybindings();
  return (
    <div className="flex min-h-screen bg-page text-ink">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
