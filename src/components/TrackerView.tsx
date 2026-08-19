import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { BarChart2, Plus, Trash2 } from "lucide-react";
import { useWorkspaceStore } from "../store/workspaceStore";
import {
  Application,
  ApplicationStatus,
  STATUSES,
  TrackerData,
  computeStats,
  emptyTracker,
  regenerateDashboard,
  today,
} from "../lib/tracker";
import { TrackerStatsView } from "./TrackerStats";

const emptyForm = {
  company: "",
  role: "",
  platform: "",
  dateApplied: today(),
  cvVersion: "",
  coverLetter: false,
  keywords: "",
  notes: "",
};

export function TrackerView() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [data, setData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const trackerPath = rootPath ? `${rootPath}/tracker/applications.json` : null;
  const dashboardPath = rootPath ? `${rootPath}/tracker/dashboard.md` : null;

  const load = async () => {
    if (!trackerPath) return;
    setLoading(true);
    try {
      const raw = await invoke<string>("read_text_file", { path: trackerPath });
      setData(JSON.parse(raw));
    } catch {
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackerPath]);

  useEffect(() => {
    const unlisten = listen<string[]>("workspace-changed", (event) => {
      if (trackerPath && event.payload.some((p) => p === trackerPath)) {
        load();
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackerPath]);

  const persist = async (next: TrackerData) => {
    if (!trackerPath || !dashboardPath) return;
    next.lastUpdated = today();
    setData(next);
    await invoke("write_text_file", { path: trackerPath, contents: JSON.stringify(next, null, 2) });
    await invoke("write_text_file", { path: dashboardPath, contents: regenerateDashboard(next) });
  };

  const createTracker = async () => {
    await persist(emptyTracker());
  };

  const updateStatus = (index: number, status: ApplicationStatus) => {
    if (!data) return;
    const applications = data.applications.map((a, i) =>
      i === index
        ? { ...a, status, responseDate: status !== "applied" ? today() : a.responseDate }
        : a,
    );
    persist({ ...data, applications });
  };

  const removeApplication = (index: number) => {
    if (!data) return;
    if (!window.confirm("Remove this application from the tracker?")) return;
    const applications = data.applications.filter((_, i) => i !== index);
    persist({ ...data, applications });
  };

  const submitForm = () => {
    if (!data || !form.company.trim() || !form.role.trim()) return;
    const entry: Application = {
      company: form.company.trim(),
      role: form.role.trim(),
      platform: form.platform.trim(),
      dateApplied: form.dateApplied,
      cvVersion: form.cvVersion.trim(),
      coverLetter: form.coverLetter,
      status: "applied",
      keywords: form.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      notes: form.notes.trim(),
    };
    persist({ ...data, applications: [...data.applications, entry] });
    setForm(emptyForm);
    setShowForm(false);
  };

  if (!rootPath) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Open a workspace to view the application tracker
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Loading tracker…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-[var(--color-text-muted)]">
        <p>No tracker/applications.json found in this workspace.</p>
        <button
          className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg-tertiary)]"
          onClick={createTracker}
        >
          Create Tracker
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Application Tracker
          <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">
            {data.applications.length} tracked
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 rounded border border-[var(--color-border)] px-2.5 py-1.5 text-xs hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => setShowStats((v) => !v)}
          >
            <BarChart2 size={13} /> {showStats ? "Hide Stats" : "Show Stats"}
          </button>
          <button
            className="flex items-center gap-1 rounded bg-[var(--color-accent)] px-2.5 py-1.5 text-xs text-white hover:opacity-90"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus size={13} /> Add Application
          </button>
        </div>
      </div>

      {showStats && data.applications.length > 0 && (
        <div className="mb-4">
          <TrackerStatsView stats={computeStats(data)} />
        </div>
      )}

      {showForm && (
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
          <input
            className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
            placeholder="Company *"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          />
          <input
            className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
            placeholder="Role *"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />
          <input
            className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
            placeholder="Platform"
            value={form.platform}
            onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
          />
          <input
            type="date"
            className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
            value={form.dateApplied}
            onChange={(e) => setForm((f) => ({ ...f, dateApplied: e.target.value }))}
          />
          <input
            className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
            placeholder="CV version used"
            value={form.cvVersion}
            onChange={(e) => setForm((f) => ({ ...f, cvVersion: e.target.value }))}
          />
          <label className="flex items-center gap-1.5 px-1 text-xs text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={form.coverLetter}
              onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.checked }))}
            />
            Cover letter included
          </label>
          <input
            className="col-span-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
            placeholder="Keywords (comma-separated)"
            value={form.keywords}
            onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
          />
          <textarea
            className="col-span-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
            placeholder="Notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <div className="col-span-2 flex justify-end gap-2">
            <button
              className="rounded px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              className="rounded bg-[var(--color-accent)] px-2.5 py-1 text-xs text-white hover:opacity-90"
              onClick={submitForm}
              disabled={!form.company.trim() || !form.role.trim()}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {data.applications.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-[var(--color-text-muted)]">
          No applications tracked yet. Use Search / Autopilot (⌘K) or "Add Application" above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-left text-[var(--color-text-muted)]">
                <th className="px-2 py-1.5 font-medium">Company</th>
                <th className="px-2 py-1.5 font-medium">Role</th>
                <th className="px-2 py-1.5 font-medium">Platform</th>
                <th className="px-2 py-1.5 font-medium">Applied</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
                <th className="px-2 py-1.5 font-medium">Cover Letter</th>
                <th className="px-2 py-1.5 font-medium">Notes</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {data.applications.map((app, index) => (
                <tr
                  key={`${app.company}-${app.role}-${index}`}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-tertiary)]"
                >
                  <td className="px-2 py-1.5 text-[var(--color-text)]">{app.company}</td>
                  <td className="px-2 py-1.5 text-[var(--color-text)]">{app.role}</td>
                  <td className="px-2 py-1.5 text-[var(--color-text-muted)]">{app.platform}</td>
                  <td className="px-2 py-1.5 text-[var(--color-text-muted)]">{app.dateApplied}</td>
                  <td className="px-2 py-1.5">
                    <select
                      className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 text-xs outline-none"
                      value={app.status}
                      onChange={(e) => updateStatus(index, e.target.value as ApplicationStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-center">{app.coverLetter ? "✓" : ""}</td>
                  <td className="max-w-[220px] truncate px-2 py-1.5 text-[var(--color-text-muted)]" title={app.notes}>
                    {app.notes}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      className="rounded-sm p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-red-500"
                      onClick={() => removeApplication(index)}
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
