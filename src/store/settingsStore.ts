import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeSetting = "system" | "light" | "dark";

interface SettingsState {
  theme: ThemeSetting;
  agentPresets: string[];
  setTheme: (theme: ThemeSetting) => void;
  setAgentPresets: (presets: string[]) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      agentPresets: ["claude", "codex", "aider"],
      setTheme: (theme) => set({ theme }),
      setAgentPresets: (agentPresets) => set({ agentPresets }),
    }),
    { name: "resume-studio-settings" },
  ),
);
