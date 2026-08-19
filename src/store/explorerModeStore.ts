import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ExplorerMode = "simple" | "advanced";

interface ExplorerModeState {
  mode: ExplorerMode;
  setMode: (mode: ExplorerMode) => void;
}

export const useExplorerModeStore = create<ExplorerModeState>()(
  persist(
    (set) => ({
      mode: "simple",
      setMode: (mode) => set({ mode }),
    }),
    { name: "resume-studio-explorer-mode" },
  ),
);
