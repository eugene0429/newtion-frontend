import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { updateWorkspace } from "@/api/workspaces";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import { getErrorMessage } from "@/api/client";

const THEME_OPTIONS: { value: ThemeMode; label: string; Icon: typeof Monitor }[] = [
  { value: "system", label: "시스템", Icon: Monitor },
  { value: "light", label: "라이트", Icon: Sun },
  { value: "dark", label: "다크", Icon: Moon },
];

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: "⌘ K / Ctrl K", description: "글로벌 검색 열기" },
  { keys: "@", description: "회의록 본문에서 페이지 멘션" },
  { keys: "Esc", description: "검색 / 모달 닫기" },
];

export default function SettingsPage() {
  const { workspace, workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const [name, setName] = useState(workspace?.name ?? "");
  const [icon, setIcon] = useState(workspace?.icon ?? "");

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setIcon(workspace.icon ?? "");
    }
  }, [workspace]);

  const update = useMutation({
    mutationFn: () =>
      updateWorkspace(workspaceId!, {
        name: name.trim(),
        icon: icon.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bootstrap-workspace"] });
      toast.success("워크스페이스를 저장했어요");
    },
    onError: (err) => {
      toast.error(`저장 실패 — ${getErrorMessage(err)}`);
    },
  });

  const dirty =
    workspace !== undefined &&
    (name.trim() !== workspace.name || (icon.trim() || undefined) !== workspace.icon);

  const canSave = dirty && name.trim().length > 0 && !update.isPending && !!workspaceId;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">설정</h1>
        <p className="text-sm text-muted-ink mt-1">워크스페이스 정보와 앱 환경을 관리합니다</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">워크스페이스</h2>
        <form
          className="space-y-3 rounded-card border border-line bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) update.mutate();
          }}
        >
          <label className="block space-y-1">
            <span className="text-xs text-muted-ink">이름</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-ink">아이콘 (이모지 1자)</span>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={4}
              placeholder="N"
              className="w-24 rounded-md border border-line bg-page px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-brand text-white text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {update.isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">테마</h2>
        <div
          role="radiogroup"
          aria-label="테마 선택"
          className="grid grid-cols-3 gap-2 rounded-card border border-line bg-card p-2"
        >
          {THEME_OPTIONS.map(({ value, label, Icon }) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMode(value)}
                className={
                  "flex flex-col items-center gap-1 py-3 rounded-md text-sm transition-colors motion-reduce:transition-none " +
                  (active
                    ? "bg-brand text-white"
                    : "text-ink hover:bg-page")
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">키보드 단축키</h2>
        <ul className="rounded-card border border-line bg-card divide-y divide-line">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-ink">{s.description}</span>
              <kbd className="font-mono text-xs text-muted-ink bg-page border border-line px-2 py-0.5 rounded">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">정보</h2>
        <dl className="rounded-card border border-line bg-card p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <dt className="text-muted-ink">앱</dt>
            <dd className="text-ink">Newtion</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-ink">모드</dt>
            <dd className="text-ink font-mono text-xs">{import.meta.env.MODE}</dd>
          </div>
          {workspaceId ? (
            <div className="flex justify-between">
              <dt className="text-muted-ink">워크스페이스 ID</dt>
              <dd className="text-ink font-mono text-xs">{workspaceId}</dd>
            </div>
          ) : null}
        </dl>
      </section>
    </div>
  );
}
