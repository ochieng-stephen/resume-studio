import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTreeStore } from "../store/treeStore";
import { useTabsStore } from "../store/tabsStore";
import { buildAgentPrompt, sendToAgent } from "../lib/agentBridge";
import { isCvLikeFile } from "../lib/documentPaths";
import { useComparePickerStore } from "../store/comparePickerStore";
import { useGitHistoryStore } from "../store/gitHistoryStore";

export function FileContextMenu() {
  const menu = useTreeStore((s) => s.menu);
  const closeMenu = useTreeStore((s) => s.closeMenu);
  const startRename = useTreeStore((s) => s.startRename);
  const startCreate = useTreeStore((s) => s.startCreate);
  const bumpRefresh = useTreeStore((s) => s.bumpRefresh);
  const openComparePicker = useComparePickerStore((s) => s.open);
  const openGitHistory = useGitHistoryStore((s) => s.open);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeMenu();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menu, closeMenu]);

  if (!menu) return null;
  const { target } = menu;
  const isRoot = target.name === "";

  const Item = ({
    label,
    onClick,
    danger,
  }: {
    label: string;
    onClick: () => void;
    danger?: boolean;
  }) => (
    <button
      className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--color-bg-tertiary)] ${
        danger ? "text-red-500" : "text-[var(--color-text)]"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[170px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 shadow-lg"
      style={{ left: menu.x, top: menu.y }}
    >
      {target.isDir && (
        <Item label="New File" onClick={() => startCreate(target.path, "create-file")} />
      )}
      {target.isDir && (
        <Item label="New Folder" onClick={() => startCreate(target.path, "create-dir")} />
      )}
      {!isRoot && (
        <Item
          label="Rename"
          onClick={() => startRename(target.path, target.parentPath, target.name)}
        />
      )}
      <Item
        label="Reveal in Finder"
        onClick={async () => {
          await invoke("reveal_in_finder", { path: target.path });
          closeMenu();
        }}
      />
      {!isRoot && (
        <Item
          label="Send to Agent"
          onClick={() => {
            sendToAgent(buildAgentPrompt("Please look at this file:", [target.path]));
            closeMenu();
          }}
        />
      )}
      {!isRoot && !target.isDir && isCvLikeFile(target.path) && (
        <Item
          label="Compare with…"
          onClick={() => {
            openComparePicker(target.path, target.name);
            closeMenu();
          }}
        />
      )}
      {!isRoot && !target.isDir && (
        <Item
          label="View History"
          onClick={() => {
            openGitHistory(target.path, target.name);
            closeMenu();
          }}
        />
      )}
      {!isRoot && (
        <>
          <div className="my-1 border-t border-[var(--color-border)]" />
          <Item
            label="Delete"
            danger
            onClick={async () => {
              const ok = window.confirm(`Move "${target.name}" to Trash?`);
              if (ok) {
                await invoke("delete_entry", { path: target.path });
                bumpRefresh(target.parentPath);
                const tabsState = useTabsStore.getState();
                if (tabsState.tabs.some((t) => t.path === target.path)) {
                  tabsState.closeTab(target.path);
                }
              }
              closeMenu();
            }}
          />
        </>
      )}
    </div>
  );
}
