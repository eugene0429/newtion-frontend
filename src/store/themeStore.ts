import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;
}

const order: ThemeMode[] = ["system", "light", "dark"];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "system",
      setMode: (mode) => set({ mode }),
      cycle: () => {
        const next = order[(order.indexOf(get().mode) + 1) % order.length];
        set({ mode: next });
      },
    }),
    {
      name: "newtion-theme",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
