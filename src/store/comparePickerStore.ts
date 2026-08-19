import { create } from "zustand";

interface ComparePickerState {
  leftPath: string | null;
  leftName: string | null;
  open: (leftPath: string, leftName: string) => void;
  close: () => void;
}

export const useComparePickerStore = create<ComparePickerState>((set) => ({
  leftPath: null,
  leftName: null,
  open: (leftPath, leftName) => set({ leftPath, leftName }),
  close: () => set({ leftPath: null, leftName: null }),
}));
