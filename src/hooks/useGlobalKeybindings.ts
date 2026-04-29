import { useEffect } from "react";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";

export function useGlobalKeybindings(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "k" && e.key !== "K") return;
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      useCommandPaletteStore.getState().toggle();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
