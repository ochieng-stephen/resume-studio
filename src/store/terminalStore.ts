import { create } from "zustand";

interface TerminalTab {
  id: string;
  label: string;
}

interface TerminalState {
  tabs: TerminalTab[];
  activeId: string | null;
  /** Tab ids that have had an AI agent launched into them, so we don't launch twice. */
  agentLaunched: Record<string, boolean>;
  addTab: () => string;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  markAgentLaunched: (id: string) => void;
}

let counter = 0;

export const useTerminalStore = create<TerminalState>((set) => ({
  tabs: [],
  activeId: null,
  agentLaunched: {},
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
      const { [id]: _removed, ...agentLaunched } = s.agentLaunched;
      return { tabs, activeId, agentLaunched };
    });
  },
  setActive: (id) => set({ activeId: id }),
  markAgentLaunched: (id) =>
    set((s) => ({ agentLaunched: { ...s.agentLaunched, [id]: true } })),
}));
