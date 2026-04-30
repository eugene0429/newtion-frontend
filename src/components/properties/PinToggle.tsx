import { Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  isPinned: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function PinToggle({ isPinned, onToggle, size = "sm", className }: Props) {
  const iconSize = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <button
      type="button"
      aria-label={isPinned ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1 text-muted-ink hover:text-tag-pink",
        isPinned && "text-tag-pink",
        className,
      )}
    >
      {isPinned ? (
        <Pin className={cn(iconSize, "fill-current")} />
      ) : (
        <PinOff className={iconSize} />
      )}
    </button>
  );
}
