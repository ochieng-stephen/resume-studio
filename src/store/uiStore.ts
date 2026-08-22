import { create } from "zustand";
import { persist } from "zustand/middleware";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const DEFAULT_SIDEBAR_WIDTH = 288;
export const DEFAULT_PREVIEW_WIDTH = 384;
export const DEFAULT_TERMINAL_HEIGHT = 224;

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;
const PREVIEW_MIN = 280;
const PREVIEW_MAX = 640;
const TERMINAL_MIN = 120;
const TERMINAL_MAX_ABS = 720;

interface UIState {
  sidebarVisible: boolean;
  terminalVisible: boolean;
  previewVisible: boolean;
  sidebarWidth: number;
  previewWidth: number;
  terminalHeight: number;
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  togglePreview: () => void;
  resizeSidebar: (delta: number) => void;
  resizePreview: (delta: number) => void;
  resizeTerminal: (delta: number) => void;
  resetSidebarWidth: () => void;
  resetPreviewWidth: () => void;
  resetTerminalHeight: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarVisible: true,
      terminalVisible: false,
      previewVisible: false,
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      previewWidth: DEFAULT_PREVIEW_WIDTH,
      terminalHeight: DEFAULT_TERMINAL_HEIGHT,
      toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
      toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
      togglePreview: () => set((s) => ({ previewVisible: !s.previewVisible })),
      resizeSidebar: (delta) =>
        set((s) => ({ sidebarWidth: clamp(s.sidebarWidth + delta, SIDEBAR_MIN, SIDEBAR_MAX) })),
      resizePreview: (delta) =>
        set((s) => ({ previewWidth: clamp(s.previewWidth + delta, PREVIEW_MIN, PREVIEW_MAX) })),
      resizeTerminal: (delta) =>
        set((s) => ({
          terminalHeight: clamp(
            s.terminalHeight + delta,
            TERMINAL_MIN,
            Math.min(TERMINAL_MAX_ABS, window.innerHeight - 200),
          ),
        })),
      resetSidebarWidth: () => set({ sidebarWidth: DEFAULT_SIDEBAR_WIDTH }),
      resetPreviewWidth: () => set({ previewWidth: DEFAULT_PREVIEW_WIDTH }),
      resetTerminalHeight: () => set({ terminalHeight: DEFAULT_TERMINAL_HEIGHT }),
    }),
    {
      name: "resume-studio-ui",
      partialize: (s) => ({
        sidebarWidth: s.sidebarWidth,
        previewWidth: s.previewWidth,
        terminalHeight: s.terminalHeight,
      }),
    },
  ),
);
