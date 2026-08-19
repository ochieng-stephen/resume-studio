import { create } from "zustand";

interface UIState {
  sidebarVisible: boolean;
  terminalVisible: boolean;
  previewVisible: boolean;
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  togglePreview: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarVisible: true,
  terminalVisible: false,
  previewVisible: false,
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
  togglePreview: () => set((s) => ({ previewVisible: !s.previewVisible })),
}));
