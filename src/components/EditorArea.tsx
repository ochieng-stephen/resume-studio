import { useEffect, useRef } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { listen } from "@tauri-apps/api/event";
import { useTabsStore } from "../store/tabsStore";
import { useEditorScrollStore } from "../store/editorScrollStore";
import { usePrefersDark } from "../hooks/usePrefersDark";
import { TrackerView } from "./TrackerView";
import { DiffView } from "./DiffView";
import { AtsCheckerView } from "./AtsCheckerView";
import { SnippetLibraryView } from "./SnippetLibraryView";
import { GlobalSearchView } from "./GlobalSearchView";

function getLanguageExtension(name: string) {
  if (name.endsWith(".md")) return [markdown()];
  if (name.endsWith(".json")) return [json()];
  return [];
}

export function EditorArea() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabPath = useTabsStore((s) => s.activeTabPath);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);
  const closeTab = useTabsStore((s) => s.closeTab);
  const updateContent = useTabsStore((s) => s.updateContent);
  const saveTab = useTabsStore((s) => s.saveTab);
  const reorderTabs = useTabsStore((s) => s.reorderTabs);
  const dark = usePrefersDark();
  const dragIndex = useRef<number | null>(null);
  const cmRef = useRef<ReactCodeMirrorRef>(null);
  const pendingLine = useEditorScrollStore((s) => s.pendingLine);
  const clearPendingLine = useEditorScrollStore((s) => s.clearPendingLine);

  const activeTab = tabs.find((t) => t.path === activeTabPath);

  useEffect(() => {
    const view = cmRef.current?.view;
    if (pendingLine !== null && view) {
      const lineNum = Math.min(pendingLine, view.state.doc.lines);
      const line = view.state.doc.line(lineNum);
      view.dispatch({
        selection: { anchor: line.from, head: line.to },
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
      view.focus();
      clearPendingLine();
    }
  }, [pendingLine, activeTabPath, clearPendingLine]);

  useEffect(() => {
    const unlisten = listen<string>("menu-action", (event) => {
      if (event.payload === "save_file" && activeTabPath) {
        saveTab(activeTabPath);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [activeTabPath, saveTab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (activeTabPath) saveTab(activeTabPath);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTabPath, saveTab]);

  if (tabs.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-9 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-xs text-[var(--color-text-muted)]">
          No tabs open
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
          Open a file to start editing
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        {tabs.map((tab, index) => (
          <div
            key={tab.path}
            draggable
            onDragStart={() => {
              dragIndex.current = index;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex.current !== null && dragIndex.current !== index) {
                reorderTabs(dragIndex.current, index);
              }
              dragIndex.current = null;
            }}
            onClick={() => setActiveTab(tab.path)}
            className={`flex h-full shrink-0 cursor-default items-center gap-1.5 border-r border-[var(--color-border)] px-3 text-xs ${
              tab.path === activeTabPath
                ? "bg-[var(--color-bg)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
            }`}
          >
            {tab.kind === "file" && tab.dirty && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
            )}
            <span className="max-w-[140px] truncate">{tab.name}</span>
            <button
              className="shrink-0 rounded-sm px-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.path);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {activeTab && activeTab.kind === "file" && (
        <div className="min-h-0 flex-1 overflow-auto">
          <CodeMirror
            ref={cmRef}
            key={activeTab.path}
            value={activeTab.content}
            height="100%"
            theme={dark ? vscodeDark : vscodeLight}
            extensions={getLanguageExtension(activeTab.name)}
            onChange={(value) => updateContent(activeTab.path, value)}
          />
        </div>
      )}
      {activeTab && activeTab.kind === "tracker" && <TrackerView />}
      {activeTab && activeTab.kind === "ats" && <AtsCheckerView />}
      {activeTab && activeTab.kind === "snippets" && <SnippetLibraryView />}
      {activeTab && activeTab.kind === "search" && <GlobalSearchView />}
      {activeTab && activeTab.kind === "diff" && (
        <DiffView
          leftLabel={activeTab.leftLabel}
          leftContent={activeTab.leftContent}
          rightLabel={activeTab.rightLabel}
          rightContent={activeTab.rightContent}
        />
      )}
    </div>
  );
}
