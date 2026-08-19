import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useComparePickerStore } from "../store/comparePickerStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useTabsStore } from "../store/tabsStore";
import { DirEntryInfo, listCvCandidates } from "../lib/cvCandidates";

export function ComparePicker() {
  const leftPath = useComparePickerStore((s) => s.leftPath);
  const leftName = useComparePickerStore((s) => s.leftName);
  const close = useComparePickerStore((s) => s.close);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openDiffTab = useTabsStore((s) => s.openDiffTab);
  const [candidates, setCandidates] = useState<DirEntryInfo[]>([]);

  useEffect(() => {
    if (!leftPath || !rootPath) return;
    listCvCandidates(rootPath).then((entries) =>
      setCandidates(entries.filter((e) => e.path !== leftPath)),
    );
  }, [leftPath, rootPath]);

  if (!leftPath) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-32"
      onClick={close}
    >
      <div
        className="w-[440px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)]">
          Compare &ldquo;{leftName}&rdquo; with…
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {candidates.length === 0 ? (
            <div className="px-3 py-3 text-xs text-[var(--color-text-muted)]">
              No other CV/resume files found in my-current-cvs, my-current-resumes, or
              generated/tailored-*.
            </div>
          ) : (
            candidates.map((c) => (
              <button
                key={c.path}
                className="block w-full px-3 py-1.5 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]"
                onClick={async () => {
                  const [leftContent, rightContent] = await Promise.all([
                    invoke<string>("read_text_file", { path: leftPath }),
                    invoke<string>("read_text_file", { path: c.path }),
                  ]);
                  openDiffTab(leftName ?? "", leftContent, c.name, rightContent);
                  close();
                }}
              >
                {rootPath ? c.path.replace(`${rootPath}/`, "") : c.path}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
