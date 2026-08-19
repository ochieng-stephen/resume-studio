import { create } from "zustand";

interface EditorScrollState {
  pendingLine: number | null;
  setPendingLine: (line: number) => void;
  clearPendingLine: () => void;
}

export const useEditorScrollStore = create<EditorScrollState>((set) => ({
  pendingLine: null,
  setPendingLine: (line) => set({ pendingLine: line }),
  clearPendingLine: () => set({ pendingLine: null }),
}));
