import { useEffect, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useModalStore } from "@/store/modalStore";
import { cn } from "@/lib/cn";

interface ProjectModalShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function ProjectModalShell({
  open,
  onClose,
  children,
}: ProjectModalShellProps) {
  const fullscreen = useModalStore((s) => s.fullscreen);
  const toggleFullscreen = useModalStore((s) => s.toggleFullscreen);
  const setFullscreen = useModalStore((s) => s.setFullscreen);

  useEffect(() => {
    if (!open) setFullscreen(false);
  }, [open, setFullscreen]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "bg-card text-ink",
          fullscreen
            ? "max-w-none w-screen h-screen rounded-none p-0"
            : "max-w-4xl max-h-[85vh] overflow-y-auto",
        )}
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute right-12 top-4 rounded-sm p-1 opacity-70 hover:opacity-100 z-10"
          aria-label={fullscreen ? "기본 크기" : "풀스크린"}
        >
          {fullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
        {children}
      </DialogContent>
    </Dialog>
  );
}
