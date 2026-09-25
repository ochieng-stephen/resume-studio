import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useJobCaptureStore } from "../store/jobCaptureStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useTabsStore } from "../store/tabsStore";
import { buildJobCaptureFile } from "../lib/jobCapture";
import { sendToAgent } from "../lib/agentBridge";
import { rankPortfolioItems } from "../lib/atsMatch";
import { PortfolioItem, normalizePortfolio } from "../lib/portfolio";

export function JobCaptureModal() {
  const open = useJobCaptureStore((s) => s.open);
  const setOpen = useJobCaptureStore((s) => s.setOpen);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

  useEffect(() => {
    if (!open || !rootPath) return;
    invoke<string>("read_text_file", { path: `${rootPath}/portfolio/index.json` })
      .then((raw) => setPortfolioItems(normalizePortfolio(JSON.parse(raw)).items))
      .catch(() => setPortfolioItems([]));
  }, [open, rootPath]);

  const matches = useMemo(() => {
    const jd = `${role} ${description}`.trim();
    if (jd.length < 12 || portfolioItems.length === 0) return [];
    return rankPortfolioItems(jd, portfolioItems)
      .filter((m) => m.score > 0)
      .slice(0, 3);
  }, [role, description, portfolioItems]);

  if (!open) return null;

  const reset = () => {
    setCompany("");
    setRole("");
    setUrl("");
    setDescription("");
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = async (thenTailor: boolean) => {
    if (!rootPath || !company.trim() || !role.trim()) return;
    setSaving(true);
    try {
      const { filename, content } = buildJobCaptureFile({ company, role, url, description });
      await invoke("create_dir", { path: `${rootPath}/jobs` }).catch(() => {});
      const path = `${rootPath}/jobs/${filename}`;
      await invoke("write_text_file", { path, contents: content });
      await openFile(path, filename);
      if (thenTailor) {
        sendToAgent(`/tailor See jobs/${filename} for the job posting details.`);
      }
      close();
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || !company.trim() || !role.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24"
      onClick={close}
    >
      <div
        className="w-[480px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)]">
          Capture Job Posting
        </div>
        <div className="flex flex-col gap-2 p-3">
          <div className="flex gap-2">
            <input
              autoFocus
              className="flex-1 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
              placeholder="Company *"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <input
              className="flex-1 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
              placeholder="Role *"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <input
            className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
            placeholder="Source URL (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <textarea
            className="min-h-[160px] rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
            placeholder="Paste the job description…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {matches.length > 0 && (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Portfolio matches for this role
              </p>
              <div className="flex flex-col gap-1">
                {matches.map((m) => (
                  <div key={m.item.id} className="flex items-baseline gap-2">
                    <span className="truncate text-[11px] text-[var(--color-text)]">
                      {m.item.title || "Untitled project"}
                    </span>
                    <span className="shrink-0 truncate text-[10px] text-[var(--color-text-muted)]">
                      {m.matched.slice(0, 4).join(", ")}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                Tailoring will draw on these. Missing something? Add it in Portfolio.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              className="rounded px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
              onClick={close}
            >
              Cancel
            </button>
            <button
              className="rounded border border-[var(--color-border)] px-2.5 py-1 text-xs hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
              onClick={() => submit(false)}
              disabled={disabled}
            >
              Save
            </button>
            <button
              className="rounded bg-[var(--color-accent)] px-2.5 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
              onClick={() => submit(true)}
              disabled={disabled}
            >
              Save &amp; Tailor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
