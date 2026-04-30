import { useEffect, useRef, useState } from "react";

interface Props {
  value: string | undefined;
  onCommit: (next: string | undefined) => void;
}

export function DueDateEditor({ value, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      if (value) onCommit(undefined);
      return;
    }
    if (trimmed === value) return;
    onCommit(trimmed);
  };

  if (!editing) {
    if (!value) {
      return (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="마감일 추가"
          className="text-xs text-muted-ink hover:text-ink"
        >
          + 마감일
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`마감일 ${value}`}
        className="text-xs text-muted-ink hover:text-ink"
      >
        📅 {value}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="date"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setEditing(false);
          setDraft(value ?? "");
        }
      }}
      className="text-xs bg-transparent border border-line rounded px-1 py-0.5 text-ink"
      aria-label="마감일 입력"
    />
  );
}
