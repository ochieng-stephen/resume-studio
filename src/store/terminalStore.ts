import { create } from "zustand";

interface TerminalTab {
  id: string;
  label: string;
}

interface TerminalState {
  tabs: TerminalTab[];
  activeId: string | null;
  addTab: () => string;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
}

let counter = 0;

export const useTerminalStore = create<TerminalState>((set) => ({
  tabs: [],
  activeId: null,
  addTab: () => {
    const id = crypto.randomUUID();
    counter += 1;
    const label = `Terminal ${counter}`;
    set((s) => ({ tabs: [...s.tabs, { id, label }], activeId: id }));
    return id;
  },
  closeTab: (id) => {
    set((s) => {
      const index = s.tabs.findIndex((t) => t.id === id);
      const tabs = s.tabs.filter((t) => t.id !== id);
      let activeId = s.activeId;
      if (activeId === id) {
        const fallback = tabs[index] ?? tabs[index - 1];
        activeId = fallback ? fallback.id : null;
      }
      return { tabs, activeId };
    });
  },
  setActive: (id) => set({ activeId: id }),
}));
