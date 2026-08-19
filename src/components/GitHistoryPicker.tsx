import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useGitHistoryStore } from "../store/gitHistoryStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useTabsStore } from "../store/tabsStore";

interface GitLogEntry {
  hash: string;
  date: string;
  message: string;
}

export function GitHistoryPicker() {
  const targetPath = useGitHistoryStore((s) => s.targetPath);
  const targetName = useGitHistoryStore((s) => s.targetName);
  const close = useGitHistoryStore((s) => s.close);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openDiffTab = useTabsStore((s) => s.openDiffTab);
  const [entries, setEntries] = useState<GitLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetPath || !rootPath) return;
    setEntries(null);
    setError(null);
    const relativePath = targetPath.replace(`${rootPath}/`, "");
    invoke<GitLogEntry[]>("git_file_history", { repoPath: rootPath, relativePath })
      .then(setEntries)
      .catch((e) => setError(String(e)));
  }, [targetPath, rootPath]);

  if (!targetPath) return null;

  const openCommitDiff = async (entry: GitLogEntry) => {
    if (!rootPath) return;
    const relativePath = targetPath.replace(`${rootPath}/`, "");
    const [oldContent, currentContent] = await Promise.all([
      invoke<string>("git_show_file", {
        repoPath: rootPath,
        commit: entry.hash,
        relativePath,
      }),
      invoke<string>("read_text_file", { path: targetPath }),
    ]);
    openDiffTab(`${entry.date} — ${entry.message}`, oldContent, "Current", currentContent);
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-32"
      onClick={close}
    >
      <div
        className="w-[460px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)]">
          History: {targetName}
        </div>
        <div className="max-h-96 overflow-y-auto py-1">
          {error && (
            <div className="px-3 py-3 text-xs text-[var(--color-text-muted)]">
              {error.includes("not available")
                ? "Git is not installed on this system."
                : "No snapshot history yet — use Save Snapshot (⌘K) first."}
            </div>
          )}
          {!error && entries === null && (
            <div className="px-3 py-3 text-xs text-[var(--color-text-muted)]">Loading…</div>
          )}
          {!error && entries !== null && entries.length === 0 && (
            <div className="px-3 py-3 text-xs text-[var(--color-text-muted)]">
              No snapshot history for this file yet.
            </div>
          )}
          {entries?.map((entry) => (
            <button
              key={entry.hash}
              className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => openCommitDiff(entry)}
            >
              <span className="text-[var(--color-text-muted)]">{entry.date}</span>{" "}
              <span className="text-[var(--color-text)]">{entry.message}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
