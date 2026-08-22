import { useWorkspaceStore } from "../store/workspaceStore";
import { useTreeStore } from "../store/treeStore";
import { useTabsStore } from "../store/tabsStore";
import { useExplorerModeStore } from "../store/explorerModeStore";
import { useUIStore } from "../store/uiStore";
import { FileTree } from "./FileTree";
import { SimpleWorkspaceView } from "./SimpleWorkspaceView";

export function Sidebar() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const startCreate = useTreeStore((s) => s.startCreate);
  const openTrackerTab = useTabsStore((s) => s.openTrackerTab);
  const mode = useExplorerModeStore((s) => s.mode);
  const setMode = useExplorerModeStore((s) => s.setMode);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);

  const rootName = rootPath ? (rootPath.split("/").filter(Boolean).pop() ?? rootPath) : null;

  return (
    <aside
      style={{ width: sidebarWidth }}
      className="flex shrink-0 flex-col bg-[var(--color-bg-secondary)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        <span className="truncate">{rootName ?? "Workspace"}</span>
        {rootPath && (
          <div className="flex items-center gap-1 normal-case">
            {mode === "advanced" && (
              <>
                <button
                  title="Application Tracker"
                  className="rounded px-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
                  onClick={openTrackerTab}
                >
                  Tracker
                </button>
                <button
                  title="New File"
                  className="rounded px-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
                  onClick={() => startCreate(rootPath, "create-file")}
                >
                  +
                </button>
              </>
            )}
            <div className="flex rounded-full border border-[var(--color-border)] p-0.5">
              <button
                title="Simple view"
                onClick={() => setMode("simple")}
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  mode === "simple"
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
                }`}
              >
                Simple
              </button>
              <button
                title="Advanced view — browse raw workspace files"
                onClick={() => setMode("advanced")}
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  mode === "advanced"
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
                }`}
              >
                Advanced
              </button>
            </div>
          </div>
        )}
      </div>
      {rootPath ? (
        mode === "simple" ? (
          <SimpleWorkspaceView />
        ) : (
          <FileTree rootPath={rootPath} />
        )
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">No workspace open</p>
          <button
            className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg-tertiary)]"
            onClick={openFolder}
          >
            Open Folder
          </button>
        </div>
      )}
    </aside>
  );
}
