import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTabsStore } from "../store/tabsStore";
import { isPrintableDocument } from "../lib/documentPaths";
import { exportMarkdownToDocx } from "../lib/docxExport";

export function PreviewPanel() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabPath = useTabsStore((s) => s.activeTabPath);
  const activeTab = tabs.find((t) => t.path === activeTabPath);
  const fileTab = activeTab?.kind === "file" ? activeTab : null;
  const isMarkdown = fileTab !== null && fileTab.name.endsWith(".md");
  const printable = fileTab !== null && isMarkdown && isPrintableDocument(fileTab.path);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        <span>Preview</span>
        {printable && (
          <div className="flex items-center gap-1 normal-case">
            <button
              className="rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => window.print()}
            >
              Export PDF
            </button>
            <button
              className="rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
              onClick={() =>
                fileTab && exportMarkdownToDocx(fileTab.content, fileTab.name.replace(/\.md$/, ""))
              }
            >
              Export DOCX
            </button>
          </div>
        )}
      </div>
      {fileTab && isMarkdown ? (
        <div
          className={
            printable
              ? "flex-1 overflow-y-auto bg-[var(--color-bg-tertiary)] px-4 py-6"
              : "flex-1 overflow-y-auto bg-[var(--color-bg)] px-6 py-5"
          }
        >
          <article className={printable ? "resume-page print-target" : "md-preview"}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileTab.content}</ReactMarkdown>
          </article>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-center text-xs text-[var(--color-text-muted)]">
          {activeTab ? "No preview available for this file type" : "Nothing to preview"}
        </div>
      )}
    </aside>
  );
}
