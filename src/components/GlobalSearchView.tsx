import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useTabsStore } from "../store/tabsStore";
import { useEditorScrollStore } from "../store/editorScrollStore";

interface SearchMatch {
  path: string;
  line_number: number;
  line_text: string;
}

export function GlobalSearchView() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!rootPath || !query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const matches = await invoke<SearchMatch[]>("search_workspace", {
          root: rootPath,
          query,
        });
        setResults(matches);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, rootPath]);

  const openResult = async (match: SearchMatch) => {
    const name = match.path.split("/").pop() ?? match.path;
    await openFile(match.path, name);
    useEditorScrollStore.getState().setPendingLine(match.line_number);
  };

  if (!rootPath) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Open a workspace to search across files
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-[var(--color-border)] p-3">
        <input
          autoFocus
          className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs outline-none"
          placeholder="Search across all files in the workspace…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {searching && (
          <div className="px-3 py-2 text-xs text-[var(--color-text-muted)]">Searching…</div>
        )}
        {!searching && query.trim() && results.length === 0 && (
          <div className="px-3 py-2 text-xs text-[var(--color-text-muted)]">No matches</div>
        )}
        {results.map((m, i) => (
          <button
            key={`${m.path}-${m.line_number}-${i}`}
            className="block w-full border-b border-[var(--color-border)] px-3 py-2 text-left hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => openResult(m)}
          >
            <div className="text-[11px] text-[var(--color-text-muted)]">
              {rootPath ? m.path.replace(`${rootPath}/`, "") : m.path}:{m.line_number}
            </div>
            <div className="truncate font-mono text-xs text-[var(--color-text)]">
              {m.line_text}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
