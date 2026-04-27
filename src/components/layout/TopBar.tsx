import { Moon, Sun, Monitor } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import { useWorkspace } from "@/hooks/useWorkspace";

const ICONS = { system: Monitor, light: Sun, dark: Moon };

export function TopBar() {
  const mode = useThemeStore((s) => s.mode);
  const cycle = useThemeStore((s) => s.cycle);
  const { workspace } = useWorkspace();
  const Icon = ICONS[mode];

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-line bg-card">
      <div className="text-sm font-medium text-ink">
        {workspace?.name ?? "Newtion"}
      </div>
      <button
        type="button"
        onClick={cycle}
        aria-label={`테마: ${mode}`}
        className="p-2 rounded-md hover:bg-page"
      >
        <Icon className="w-4 h-4" />
      </button>
    </header>
  );
}
