import { NavLink } from "react-router-dom";
import { Home, FileText, KanbanSquare, Settings, Search } from "lucide-react";
import { useSidebarStore } from "@/store/sidebarStore";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { SidebarFavorites } from "./SidebarFavorites";
import { SidebarRecent } from "./SidebarRecent";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/", label: "홈", icon: Home },
  { to: "/meetings", label: "회의록", icon: FileText },
  { to: "/projects", label: "프로젝트", icon: KanbanSquare },
];

export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const openPalette = useCommandPaletteStore((s) => s.setOpen);

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col border-r border-line bg-card transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center justify-between px-4 h-14 border-b border-line">
        {!collapsed && (
          <span className="font-bold text-brand">Newtion</span>
        )}
        <button
          type="button"
          onClick={() => openPalette(true)}
          className="text-xs text-muted-ink hover:text-ink"
          aria-label="검색 열기"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      <nav className="px-2 py-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-ink hover:bg-page",
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {!collapsed && (
          <>
            <SidebarFavorites />
            <SidebarRecent />
          </>
        )}
      </div>

      <div className="border-t border-line p-2">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink hover:bg-page"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>설정</span>}
        </NavLink>
        <button
          type="button"
          onClick={toggle}
          className="w-full text-left text-xs text-muted-ink px-3 py-2 hover:text-ink"
        >
          {collapsed ? "▶" : "◀ 접기"}
        </button>
      </div>
    </aside>
  );
}
