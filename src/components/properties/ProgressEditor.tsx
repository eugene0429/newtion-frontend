import { useEffect, useRef, useState } from "react";

interface Props {
  value: number | undefined;
  onCommit: (next: number | undefined) => void;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function ProgressEditor({ value, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? 0));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(String(value ?? 0));
  }, [value]);

  const commit = () => {
    setEditing(false);
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      if (typeof value === "number") onCommit(undefined);
      return;
    }
    const next = clamp(parsed);
    if (next === value) return;
    onCommit(next);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(String(value ?? 0));
  };

  if (!editing) {
    if (typeof value !== "number") {
      return (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-muted-ink hover:text-ink"
          aria-label="진행률 추가"
        >
          + 진행률
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-muted-ink hover:text-ink"
        aria-label={`진행률 ${value}%`}
      >
        📊 {value}%
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        ref={inputRef}
        type="number"
        min={0}
        max={100}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className="w-14 bg-transparent border border-line rounded px-1 py-0.5 text-xs text-ink"
        aria-label="진행률 입력"
      />
      <span className="text-xs text-muted-ink">%</span>
    </span>
  );
}
