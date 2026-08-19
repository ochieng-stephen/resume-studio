import { create } from "zustand";

interface SettingsModalState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useSettingsModalStore = create<SettingsModalState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
