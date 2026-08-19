import { create } from "zustand";

interface GitHistoryState {
  targetPath: string | null;
  targetName: string | null;
  open: (path: string, name: string) => void;
  close: () => void;
}

export const useGitHistoryStore = create<GitHistoryState>((set) => ({
  targetPath: null,
  targetName: null,
  open: (targetPath, targetName) => set({ targetPath, targetName }),
  close: () => set({ targetPath: null, targetName: null }),
}));
