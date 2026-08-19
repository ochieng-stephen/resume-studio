import { create } from "zustand";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useTreeStore } from "./treeStore";

interface WorkspaceState {
  rootPath: string | null;
  openFolder: () => Promise<void>;
  setRootPath: (path: string) => Promise<void>;
}

async function activateWorkspace(path: string) {
  const isWorkspace = await invoke<boolean>("is_resume_workspace", { path });
  if (!isWorkspace) {
    const shouldScaffold = window.confirm(
      "This folder doesn't look like a Résumé Studio workspace yet.\n\n" +
        "Set it up with the standard structure (CLAUDE.md, agent skills, tracker, templates)?",
    );
    if (shouldScaffold) {
      await invoke("scaffold_workspace", { path });
    }
  }
  await invoke("watch_workspace", { path }).catch(() => {});
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  rootPath: null,
  openFolder: async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected !== "string") return;
    await activateWorkspace(selected);
    set({ rootPath: selected });
  },
  setRootPath: async (path) => {
    await activateWorkspace(path);
    set({ rootPath: path });
  },
}));

let pendingDirs = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

listen<string[]>("workspace-changed", (event) => {
  for (const changedPath of event.payload) {
    const dir = changedPath.substring(0, changedPath.lastIndexOf("/"));
    if (dir) pendingDirs.add(dir);
  }
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    const dirs = pendingDirs;
    pendingDirs = new Set();
    const { bumpRefresh } = useTreeStore.getState();
    dirs.forEach((d) => bumpRefresh(d));
  }, 300);
});
