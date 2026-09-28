import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useJobCaptureStore } from "../store/jobCaptureStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useTabsStore } from "../store/tabsStore";
import { buildJobCaptureFile } from "../lib/jobCapture";
import { sendToAgent } from "../lib/agentBridge";
import { rankPortfolioItems } from "../lib/atsMatch";
import { PortfolioItem, normalizePortfolio } from "../lib/portfolio";
import {
  emptyTracker,
  normalizeApplication,
  normalizeTracker,
  regenerateDashboard,
  today,
} from "../lib/tracker";
import { Field, TextareaField } from "./FormField";

// Adds the captured job to the tracker as a "saved" (to-apply) entry, so capturing and tracking are
// one loop instead of two separate stores. Silently skips if the same company + role is already
// tracked, to avoid duplicates on a re-capture.
async function addSavedToTracker(rootPath: string, company: string, role: string, url: string) {
  const trackerPath = `${rootPath}/tracker/applications.json`;
  const dashboardPath = `${rootPath}/tracker/dashboard.md`;
  let data;
  try {
    data = normalizeTracker(JSON.parse(await invoke<string>("read_text_file", { path: trackerPath })));
  } catch {
    data = emptyTracker();
  }
  const dupe = data.applications.some(
    (a) =>
      a.company.trim().toLowerCase() === company.trim().toLowerCase() &&
      a.role.trim().toLowerCase() === role.trim().toLowerCase(),
  );
  if (dupe) return;
  data.applications.push(
    normalizeApplication({
      company: company.trim(),
      role: role.trim(),
      status: "saved",
      dateApplied: "", // not applied yet; stamped when it graduates to "applied"
      notes: url.trim() ? `Source: ${url.trim()}` : "",
      nextStep: "Apply",
    }),
  );
  data.lastUpdated = today();
  await invoke("create_dir", { path: `${rootPath}/tracker` }).catch(() => {});
  await invoke("write_text_file", { path: trackerPath, contents: JSON.stringify(data, null, 2) });
  await invoke("write_text_file", { path: dashboardPath, contents: regenerateDashboard(data) });
}

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
  const [addToTracker, setAddToTracker] = useState(true);
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

  // Keyboard: Escape closes, Cmd/Ctrl+Enter saves (plain Enter is left for the textarea). These
  // hooks MUST stay above the `if (!open) return null` early return — a conditional hook count
  // crashes React. close/submit are defined below, so they're reached via refs updated each render.
  const submitRef = useRef<(thenTailor: boolean) => void>(() => {});
  const closeRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submitRef.current(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setCompany("");
    setRole("");
    setUrl("");
    setDescription("");
    setAddToTracker(true);
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
      if (addToTracker) await addSavedToTracker(rootPath, company, role, url).catch(() => {});
      await openFile(path, filename);
      if (thenTailor) {
        sendToAgent(`/tailor See jobs/${filename} for the job posting details.`);
      }
      close();
    } finally {
      setSaving(false);
    }
  };
  // Keep the latest close/submit reachable from the keyboard effect without re-subscribing.
  submitRef.current = submit;
  closeRef.current = close;

  const disabled = saving || !company.trim() || !role.trim();
  const jdText = `${role} ${description}`.trim();

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
        <div className="flex flex-col gap-3 p-3">
          <div className="grid grid-cols-2 gap-x-2 gap-y-3">
            <Field
              label="Company"
              required
              autoFocus
              placeholder="e.g. Acme Corp"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <Field
              label="Role"
              required
              placeholder="e.g. Senior Product Designer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <Field
            label="Source URL"
            placeholder="https://… (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <TextareaField
            label="Job description"
            placeholder="Paste the job description…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
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

          {matches.length === 0 && jdText.length >= 12 && (
            <div className="rounded-md border border-dashed border-[var(--color-border)] p-2 text-[10px] leading-relaxed text-[var(--color-text-muted)]">
              {portfolioItems.length === 0
                ? "Add projects to your Portfolio so tailoring can cite real, relevant work."
                : "No strong Portfolio matches for this role yet. Tailoring still works; adding relevant projects makes it stronger."}
            </div>
          )}

          <label className="flex items-center gap-1.5 pt-1 text-[11px] text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={addToTracker}
              onChange={(e) => setAddToTracker(e.target.checked)}
            />
            Add to my tracker as a job to apply to
          </label>

          {!description.trim() && (
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Add the job description to enable tailoring.
            </p>
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
              className="rounded bg-[var(--color-accent)] px-2.5 py-1 text-xs text-[var(--color-bg)] hover:opacity-90 disabled:opacity-50"
              onClick={() => submit(true)}
              disabled={disabled || !description.trim()}
              title={!description.trim() ? "Paste the job description first" : undefined}
            >
              Save &amp; Tailor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
