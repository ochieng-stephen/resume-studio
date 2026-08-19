import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface FileTab {
  kind: "file";
  path: string;
  name: string;
  content: string;
  savedContent: string;
  dirty: boolean;
}

export interface VirtualTab {
  kind: "tracker" | "ats" | "snippets" | "search";
  path: string;
  name: string;
}

export interface DiffTab {
  kind: "diff";
  path: string;
  name: string;
  leftLabel: string;
  leftContent: string;
  rightLabel: string;
  rightContent: string;
}

export type Tab = FileTab | VirtualTab | DiffTab;

export const TRACKER_TAB_PATH = "resume-studio://tracker";
export const ATS_TAB_PATH = "resume-studio://ats";
export const SNIPPETS_TAB_PATH = "resume-studio://snippets";
export const SEARCH_TAB_PATH = "resume-studio://search";

interface TabsState {
  tabs: Tab[];
  activeTabPath: string | null;
  openFile: (path: string, name: string) => Promise<void>;
  openSingletonTab: (kind: VirtualTab["kind"], path: string, name: string) => void;
  openTrackerTab: () => void;
  openAtsTab: () => void;
  openSnippetsTab: () => void;
  openSearchTab: () => void;
  openDiffTab: (
    leftLabel: string,
    leftContent: string,
    rightLabel: string,
    rightContent: string,
  ) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  saveTab: (path: string) => Promise<void>;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabPath: null,

  openFile: async (path, name) => {
    const existing = get().tabs.find((t) => t.path === path);
    if (existing) {
      set({ activeTabPath: path });
      return;
    }
    const content = await invoke<string>("read_text_file", { path });
    set((s) => ({
      tabs: [
        ...s.tabs,
        { kind: "file", path, name, content, savedContent: content, dirty: false },
      ],
      activeTabPath: path,
    }));
  },

  openSingletonTab: (kind, path, name) => {
    const existing = get().tabs.find((t) => t.path === path);
    if (existing) {
      set({ activeTabPath: path });
      return;
    }
    set((s) => ({
      tabs: [...s.tabs, { kind, path, name }],
      activeTabPath: path,
    }));
  },

  openTrackerTab: () => get().openSingletonTab("tracker", TRACKER_TAB_PATH, "Application Tracker"),
  openAtsTab: () => get().openSingletonTab("ats", ATS_TAB_PATH, "ATS Match Checker"),
  openSnippetsTab: () => get().openSingletonTab("snippets", SNIPPETS_TAB_PATH, "Snippet Library"),
  openSearchTab: () => get().openSingletonTab("search", SEARCH_TAB_PATH, "Search in Files"),

  openDiffTab: (leftLabel, leftContent, rightLabel, rightContent) => {
    const syntheticPath = `resume-studio://diff/${crypto.randomUUID()}`;
    set((s) => ({
      tabs: [
        ...s.tabs,
        {
          kind: "diff",
          path: syntheticPath,
          name: `${leftLabel} ↔ ${rightLabel}`,
          leftLabel,
          leftContent,
          rightLabel,
          rightContent,
        },
      ],
      activeTabPath: syntheticPath,
    }));
  },

  closeTab: (path) => {
    set((s) => {
      const index = s.tabs.findIndex((t) => t.path === path);
      const tabs = s.tabs.filter((t) => t.path !== path);
      let activeTabPath = s.activeTabPath;
      if (activeTabPath === path) {
        const fallback = tabs[index] ?? tabs[index - 1];
        activeTabPath = fallback ? fallback.path : null;
      }
      return { tabs, activeTabPath };
    });
  },

  setActiveTab: (path) => set({ activeTabPath: path }),

  updateContent: (path, content) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.kind === "file" && t.path === path
          ? { ...t, content, dirty: content !== t.savedContent }
          : t,
      ),
    }));
  },

  saveTab: async (path) => {
    const tab = get().tabs.find((t) => t.path === path);
    if (!tab || tab.kind !== "file") return;
    await invoke("write_text_file", { path, contents: tab.content });
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.kind === "file" && t.path === path ? { ...t, savedContent: t.content, dirty: false } : t,
      ),
    }));
  },

  reorderTabs: (fromIndex, toIndex) => {
    set((s) => {
      const tabs = [...s.tabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, moved);
      return { tabs };
    });
  },
}));
