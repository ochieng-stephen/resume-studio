import { create } from "zustand";

interface RenameEdit {
  type: "rename";
  path: string;
  parentPath: string;
  initialName: string;
}
interface CreateEdit {
  type: "create-file" | "create-dir";
  parentPath: string;
}
type TreeEdit = RenameEdit | CreateEdit | null;

interface ContextMenuTarget {
  path: string;
  parentPath: string;
  isDir: boolean;
  name: string;
}

interface TreeState {
  edit: TreeEdit;
  menu: { x: number; y: number; target: ContextMenuTarget } | null;
  refreshTokens: Record<string, number>;
  openMenu: (x: number, y: number, target: ContextMenuTarget) => void;
  closeMenu: () => void;
  startRename: (path: string, parentPath: string, initialName: string) => void;
  startCreate: (parentPath: string, type: "create-file" | "create-dir") => void;
  clearEdit: () => void;
  bumpRefresh: (path: string) => void;
}

export const useTreeStore = create<TreeState>((set) => ({
  edit: null,
  menu: null,
  refreshTokens: {},
  openMenu: (x, y, target) => set({ menu: { x, y, target } }),
  closeMenu: () => set({ menu: null }),
  startRename: (path, parentPath, initialName) =>
    set({ edit: { type: "rename", path, parentPath, initialName }, menu: null }),
  startCreate: (parentPath, type) => set({ edit: { type, parentPath }, menu: null }),
  clearEdit: () => set({ edit: null }),
  bumpRefresh: (path) =>
    set((s) => ({
      refreshTokens: { ...s.refreshTokens, [path]: (s.refreshTokens[path] ?? 0) + 1 },
    })),
}));
