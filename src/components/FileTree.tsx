import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import { useTabsStore } from "../store/tabsStore";
import { useTreeStore } from "../store/treeStore";

interface DirEntryInfo {
  name: string;
  path: string;
  is_dir: boolean;
}

function fileIcon(name: string) {
  if (name.endsWith(".md")) return FileText;
  if (name.endsWith(".json")) return FileJson;
  return File;
}

function NewEntryInput({ parentPath, isDir }: { parentPath: string; isDir: boolean }) {
  const [value, setValue] = useState("");
  const clearEdit = useTreeStore((s) => s.clearEdit);
  const bumpRefresh = useTreeStore((s) => s.bumpRefresh);

  const commit = async () => {
    const name = value.trim();
    if (!name) {
      clearEdit();
      return;
    }
    const path = `${parentPath}/${name}`;
    try {
      await invoke(isDir ? "create_dir" : "create_file", { path });
      bumpRefresh(parentPath);
    } catch (e) {
      console.error(e);
    }
    clearEdit();
  };

  return (
    <input
      autoFocus
      className="w-full rounded-sm border border-[var(--color-accent)] bg-[var(--color-bg)] px-1 text-xs text-[var(--color-text)] outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") clearEdit();
      }}
    />
  );
}

function RenameInput({
  path,
  parentPath,
  initialName,
}: {
  path: string;
  parentPath: string;
  initialName: string;
}) {
  const [value, setValue] = useState(initialName);
  const clearEdit = useTreeStore((s) => s.clearEdit);
  const bumpRefresh = useTreeStore((s) => s.bumpRefresh);

  const commit = async () => {
    const name = value.trim();
    if (!name || name === initialName) {
      clearEdit();
      return;
    }
    const newPath = `${parentPath}/${name}`;
    try {
      await invoke("rename_entry", { from: path, to: newPath });
      bumpRefresh(parentPath);
      const tabsState = useTabsStore.getState();
      if (tabsState.tabs.some((t) => t.path === path)) {
        useTabsStore.setState((s) => ({
          tabs: s.tabs.map((t) => (t.path === path ? { ...t, path: newPath, name } : t)),
          activeTabPath: s.activeTabPath === path ? newPath : s.activeTabPath,
        }));
      }
    } catch (e) {
      console.error(e);
    }
    clearEdit();
  };

  return (
    <input
      autoFocus
      className="w-full rounded-sm border border-[var(--color-accent)] bg-[var(--color-bg)] px-1 text-xs text-[var(--color-text)] outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") clearEdit();
      }}
    />
  );
}

function TreeNode({
  entry,
  parentPath,
  depth,
}: {
  entry: DirEntryInfo;
  parentPath: string;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DirEntryInfo[] | null>(null);
  const openFile = useTabsStore((s) => s.openFile);
  const activeTabPath = useTabsStore((s) => s.activeTabPath);
  const openMenu = useTreeStore((s) => s.openMenu);
  const edit = useTreeStore((s) => s.edit);
  const refreshToken = useTreeStore((s) => s.refreshTokens[entry.path] ?? 0);

  useEffect(() => {
    if (entry.is_dir && expanded) {
      invoke<DirEntryInfo[]>("list_dir", { path: entry.path }).then(setChildren);
    }
  }, [entry.is_dir, entry.path, expanded, refreshToken]);

  const isRenaming = edit?.type === "rename" && edit.path === entry.path;
  const isCreatingHere =
    entry.is_dir &&
    (edit?.type === "create-file" || edit?.type === "create-dir") &&
    edit.parentPath === entry.path;

  const Icon = entry.is_dir ? (expanded ? FolderOpen : Folder) : fileIcon(entry.name);

  return (
    <div>
      <div
        className={`flex cursor-default items-center gap-1 rounded-sm px-1 py-0.5 text-xs hover:bg-[var(--color-bg-tertiary)] ${
          activeTabPath === entry.path ? "bg-[var(--color-bg-tertiary)]" : ""
        }`}
        style={{ paddingLeft: depth * 14 + 4 }}
        onClick={() => {
          if (entry.is_dir) {
            setExpanded((e) => !e);
          } else {
            openFile(entry.path, entry.name);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openMenu(e.clientX, e.clientY, {
            path: entry.path,
            parentPath,
            isDir: entry.is_dir,
            name: entry.name,
          });
        }}
      >
        {entry.is_dir ? (
          expanded ? (
            <ChevronDown size={12} className="shrink-0 text-[var(--color-text-muted)]" />
          ) : (
            <ChevronRight size={12} className="shrink-0 text-[var(--color-text-muted)]" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon size={13} className="shrink-0 text-[var(--color-text-muted)]" />
        {isRenaming ? (
          <RenameInput path={entry.path} parentPath={parentPath} initialName={entry.name} />
        ) : (
          <span className="truncate">{entry.name}</span>
        )}
      </div>
      {entry.is_dir && expanded && (
        <div>
          {isCreatingHere && (
            <div
              className="flex items-center gap-1 px-1 py-0.5"
              style={{ paddingLeft: (depth + 1) * 14 + 4 }}
            >
              <span className="w-3 shrink-0" />
              <NewEntryInput parentPath={entry.path} isDir={edit!.type === "create-dir"} />
            </div>
          )}
          {children === null ? (
            <div
              className="px-1 py-0.5 text-xs text-[var(--color-text-muted)]"
              style={{ paddingLeft: (depth + 1) * 14 + 4 }}
            >
              Loading…
            </div>
          ) : (
            children.map((child) => (
              <TreeNode key={child.path} entry={child} parentPath={entry.path} depth={depth + 1} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FileTree({ rootPath }: { rootPath: string }) {
  const [rootEntries, setRootEntries] = useState<DirEntryInfo[] | null>(null);
  const refreshToken = useTreeStore((s) => s.refreshTokens[rootPath] ?? 0);
  const openMenu = useTreeStore((s) => s.openMenu);
  const edit = useTreeStore((s) => s.edit);

  useEffect(() => {
    invoke<DirEntryInfo[]>("list_dir", { path: rootPath }).then(setRootEntries);
  }, [rootPath, refreshToken]);

  const isCreatingAtRoot =
    (edit?.type === "create-file" || edit?.type === "create-dir") && edit.parentPath === rootPath;

  return (
    <div
      className="flex-1 overflow-y-auto py-1"
      onContextMenu={(e) => {
        e.preventDefault();
        openMenu(e.clientX, e.clientY, {
          path: rootPath,
          parentPath: rootPath,
          isDir: true,
          name: "",
        });
      }}
    >
      {isCreatingAtRoot && (
        <div className="flex items-center gap-1 px-1 py-0.5">
          <span className="w-3 shrink-0" />
          <NewEntryInput parentPath={rootPath} isDir={edit!.type === "create-dir"} />
        </div>
      )}
      {rootEntries === null ? (
        <div className="px-2 py-1 text-xs text-[var(--color-text-muted)]">Loading…</div>
      ) : rootEntries.length === 0 ? (
        <div className="px-2 py-1 text-xs text-[var(--color-text-muted)]">Empty folder</div>
      ) : (
        rootEntries.map((entry) => (
          <TreeNode key={entry.path} entry={entry} parentPath={rootPath} depth={0} />
        ))
      )}
    </div>
  );
}
