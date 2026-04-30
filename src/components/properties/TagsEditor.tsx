import { useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  value: string[];
  onCommit: (next: string[]) => void;
}

export function TagsEditor({ value, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const tryAdd = (currentDraft?: string) => {
    const raw = currentDraft ?? draftRef.current;
    const next = raw.trim();
    setDraft("");
    draftRef.current = "";
    if (next.length === 0) {
      setEditing(false);
      return;
    }
    const lower = next.toLowerCase();
    if (value.some((t) => t.toLowerCase() === lower)) {
      setEditing(false);
      return;
    }
    onCommit([...value, next]);
    setEditing(false);
  };

  const remove = (tag: string) => {
    onCommit(value.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-1" aria-label="태그">
      {value.map((t) => (
        <span
          key={t}
          className="group/tag inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-tag-pink/10 text-tag-pink"
        >
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            aria-label={`태그 ${t} 제거`}
            className="opacity-0 group-hover/tag:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) {
              const withoutComma = v.slice(0, -1);
              setDraft(withoutComma);
              draftRef.current = withoutComma;
              tryAdd(withoutComma);
              return;
            }
            setDraft(v);
            draftRef.current = v;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              tryAdd();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
              setDraft("");
              draftRef.current = "";
            }
          }}
          onBlur={() => tryAdd()}
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded border border-line bg-transparent",
            "w-20 text-ink",
          )}
          aria-label="태그 입력"
          placeholder="새 태그"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="태그 추가"
          className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border border-dashed border-line text-muted-ink hover:text-ink"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
