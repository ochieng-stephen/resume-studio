import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  BellIcon,
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon,
  ChartBarIcon,
  CheckIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useWorkspaceStore } from "../store/workspaceStore";
import {
  ApplicationStatus,
  STATUS_TONE,
  STATUS_TONE_COLOR,
  STATUSES,
  TrackerData,
  TrackerStats,
  computeStats,
  dueFollowUps,
  emptyTracker,
  isOpen,
  normalizeTracker,
  regenerateDashboard,
  today,
} from "../lib/tracker";
import { usePrefersDark } from "../hooks/usePrefersDark";
import { TrackerStatsView } from "./TrackerStats";
import { Field, TextareaField, FIELD_FOCUS } from "./FormField";

const emptyForm = {
  company: "",
  role: "",
  platform: "",
  dateApplied: today(),
  cvVersion: "",
  coverLetter: false,
  keywords: "",
  notes: "",
  followUpDate: "",
  nextStep: "",
};

type FormState = typeof emptyForm;

// The small vocabulary of real job-search follow-up actions, offered as one-tap chips so setting a
// next step is near-zero friction (and so someone unsure what a good follow-up even is gets a nudge).
const NEXT_STEP_SUGGESTIONS = [
  "Nudge recruiter",
  "Send thank-you",
  "Check in",
  "Prep for interview",
  "Reply to offer",
  "Ask for feedback",
];

// Only the columns someone actually scans by. Each has a sensible first-click direction: names
// A->Z, dates newest-first, status grouped down the funnel, follow-ups soonest-first.
type SortKey = "company" | "dateApplied" | "status" | "followUp";
const DEFAULT_DIR: Record<SortKey, "asc" | "desc"> = {
  company: "asc",
  dateApplied: "desc",
  status: "asc",
  followUp: "asc",
};

// The at-a-glance numbers double as filters: click one to focus the table on those applications.
type FilterKey = "saved" | "active" | "interviewing" | "offers";

// One affirming number in the at-a-glance strip. Doubles as a filter toggle when it has an
// onClick — but only when there's something to filter to (a count of 0 stays inert, so you can
// never click your way into an empty table).
function Glance({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className={active ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>
        {label}
      </span>
    </>
  );
  if (!onClick || value === 0) {
    return <span className="flex items-baseline gap-1 px-1">{inner}</span>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? `Showing ${label} only. Click to clear.` : `Show ${label} only`}
      className="flex items-baseline gap-1 rounded-full px-2 py-0.5 transition-colors hover:bg-[var(--color-bg-tertiary)]"
      style={active ? { background: "color-mix(in srgb, var(--color-icon-hover) 14%, transparent)" } : undefined}
    >
      {inner}
    </button>
  );
}

// A gentle, grounded line — affirming without being a motivational poster. Meets the person where
// they are: momentum when there's momentum, quiet encouragement when it's early or slow.
function encouragement(stats: TrackerStats): string {
  if (stats.offers > 0) return "You've got offers on the table.";
  if (stats.interviewing > 0) return "You're in the room. Keep going.";
  if (stats.active > 0) return "In motion, one step at a time.";
  return "Every application is a step forward.";
}

export function TrackerView() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const dark = usePrefersDark();
  const [data, setData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "dateApplied",
    dir: "desc",
  });
  const [filter, setFilter] = useState<FilterKey | null>(null);
  // Full-note tooltip shown instantly on hover (the native `title` delay is too slow for scanning).
  const [noteTip, setNoteTip] = useState<{
    text: string;
    x: number;
    top: number;
    bottom: number;
  } | null>(null);

  const trackerPath = rootPath ? `${rootPath}/tracker/applications.json` : null;
  const dashboardPath = rootPath ? `${rootPath}/tracker/dashboard.md` : null;

  const load = async () => {
    if (!trackerPath) return;
    setLoading(true);
    try {
      const raw = await invoke<string>("read_text_file", { path: trackerPath });
      setData(normalizeTracker(JSON.parse(raw)));
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

  const openAdd = () => {
    setForm(emptyForm);
    setEditingIndex(null);
    setShowForm(true);
  };

  const openEdit = (index: number) => {
    if (!data) return;
    const a = data.applications[index];
    setForm({
      company: a.company,
      role: a.role,
      platform: a.platform,
      dateApplied: a.dateApplied,
      cvVersion: a.cvVersion,
      coverLetter: a.coverLetter,
      keywords: a.keywords.join(", "),
      notes: a.notes,
      followUpDate: a.followUpDate ?? "",
      nextStep: a.nextStep ?? "",
    });
    setEditingIndex(index);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingIndex(null);
    setForm(emptyForm);
  };

  // Status transitions stay here (not in the edit form) so date semantics live in one place:
  // responseDate is stamped on the first real response (not on "saved"), and dateApplied is stamped
  // when a saved job first graduates to "applied" so the pipeline dates stay honest.
  const updateStatus = (index: number, status: ApplicationStatus) => {
    if (!data) return;
    const applications = data.applications.map((a, i) =>
      i === index
        ? {
            ...a,
            status,
            dateApplied:
              a.status === "saved" && status !== "saved" && !a.dateApplied ? today() : a.dateApplied,
            responseDate:
              status !== "applied" && status !== "saved" ? today() : a.responseDate,
          }
        : a,
    );
    persist({ ...data, applications });
  };

  const removeApplication = (index: number) => {
    if (!data) return;
    const applications = data.applications.filter((_, i) => i !== index);
    setPendingDelete(null);
    persist({ ...data, applications });
  };

  const markFollowUpDone = (index: number) => {
    if (!data) return;
    const applications = data.applications.map((a, i) =>
      i === index ? { ...a, followUpDate: undefined } : a,
    );
    persist({ ...data, applications });
  };

  const submitForm = () => {
    if (!data || !form.company.trim() || !form.role.trim()) return;
    // Descriptive fields only; status/responseDate are preserved on edit (spread of the existing
    // entry) and defaulted to "applied" on add.
    const base = {
      company: form.company.trim(),
      role: form.role.trim(),
      platform: form.platform.trim(),
      dateApplied: form.dateApplied,
      cvVersion: form.cvVersion.trim(),
      coverLetter: form.coverLetter,
      keywords: form.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      notes: form.notes.trim(),
      followUpDate: form.followUpDate || undefined,
      nextStep: form.nextStep.trim() || undefined,
    };
    const applications =
      editingIndex === null
        ? [...data.applications, { ...base, status: "applied" as ApplicationStatus }]
        : data.applications.map((a, i) => (i === editingIndex ? { ...a, ...base } : a));
    persist({ ...data, applications });
    closeForm();
  };

  const statusColor = (s: ApplicationStatus) => {
    const tone = STATUS_TONE_COLOR[STATUS_TONE[s]];
    return dark ? tone.dark : tone.light;
  };

  // Same column re-clicked flips direction; a new column starts at its natural direction.
  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: DEFAULT_DIR[key] },
    );

  const toggleFilter = (key: FilterKey) => setFilter((f) => (f === key ? null : key));

  const statusMatchesFilter = (s: ApplicationStatus): boolean => {
    switch (filter) {
      case "saved":
        return s === "saved";
      case "active":
        // Matches the "in progress" glance: in the pipeline, but not the saved shortlist.
        return isOpen(s) && s !== "saved";
      case "interviewing":
        return s === "interview";
      case "offers":
        return s === "offered" || s === "accepted";
      default:
        return true;
    }
  };

  const sortableHeader = (label: string, key: SortKey) => {
    const active = sort.key === key;
    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={`group flex items-center gap-1 font-medium ${
          active ? "text-[var(--color-text)]" : "hover:text-[var(--color-text)]"
        }`}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <CaretUpIcon size={10} weight="bold" />
          ) : (
            <CaretDownIcon size={10} weight="bold" />
          )
        ) : (
          <CaretUpDownIcon size={10} className="opacity-0 transition-opacity group-hover:opacity-40" />
        )}
      </button>
    );
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
        <p>No tracker yet in this workspace.</p>
        <button
          className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg-tertiary)]"
          onClick={createTracker}
        >
          Create Tracker
        </button>
      </div>
    );
  }

  const stats = computeStats(data);
  const due = dueFollowUps(data);
  // Most-recent-first for display, but keep each row's ORIGINAL index so edit / status / delete
  // still address the right entry regardless of sort order.
  // Display order is user-controlled via the sortable headers; default is most-recent-first.
  // Each row keeps its ORIGINAL index so edit / status / delete address the right entry.
  const dir = sort.dir === "asc" ? 1 : -1;
  const rows = data.applications
    .map((app, index) => ({ app, index }))
    .filter(({ app }) => statusMatchesFilter(app.status))
    .sort((a, b) => {
      switch (sort.key) {
        case "company":
          return a.app.company.localeCompare(b.app.company) * dir;
        case "status":
          return (STATUSES.indexOf(a.app.status) - STATUSES.indexOf(b.app.status)) * dir;
        case "followUp": {
          // Applications with no follow-up date always sink to the bottom, in both directions.
          const av = a.app.followUpDate;
          const bv = b.app.followUpDate;
          if (!av && !bv) return 0;
          if (!av) return 1;
          if (!bv) return -1;
          return av.localeCompare(bv) * dir;
        }
        default:
          return a.app.dateApplied.localeCompare(b.app.dateApplied) * dir;
      }
    });

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
          {data.applications.length > 0 && (
            <button
              className="flex items-center gap-1 rounded border border-[var(--color-border)] px-2.5 py-1.5 text-xs hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => setShowStats((v) => !v)}
            >
              <ChartBarIcon size={13} className="text-[var(--icon-sage)]" /> {showStats ? "Hide insights" : "Show insights"}
            </button>
          )}
          <button
            className="flex items-center gap-1 rounded bg-[var(--color-accent)] px-2.5 py-1.5 text-xs text-[var(--color-bg)] hover:opacity-90"
            onClick={openAdd}
          >
            <PlusIcon size={13} /> Add application
          </button>
        </div>
      </div>

      {/* Affirming, forward-looking at-a-glance strip — leads with momentum, not a response rate. */}
      {data.applications.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs">
          <Glance
            label="to apply"
            value={stats.saved}
            color={statusColor("saved")}
            active={filter === "saved"}
            onClick={() => toggleFilter("saved")}
          />
          <Glance
            label="in progress"
            value={stats.active}
            color={statusColor("applied")}
            active={filter === "active"}
            onClick={() => toggleFilter("active")}
          />
          <Glance
            label="interviewing"
            value={stats.interviewing}
            color={statusColor("interview")}
            active={filter === "interviewing"}
            onClick={() => toggleFilter("interviewing")}
          />
          <Glance
            label={stats.offers === 1 ? "offer" : "offers"}
            value={stats.offers}
            color={statusColor("accepted")}
            active={filter === "offers"}
            onClick={() => toggleFilter("offers")}
          />
          {filter ? (
            <button
              type="button"
              onClick={() => setFilter(null)}
              className="ml-auto flex items-center gap-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              <XIcon size={11} /> Clear filter
            </button>
          ) : (
            <span className="ml-auto text-[var(--color-text-muted)]">{encouragement(stats)}</span>
          )}
        </div>
      )}

      {/* Gentle "who to chase" callout — the forward-looking support an anxious job seeker needs. */}
      {due.length > 0 && (
        <div
          className="mb-3 rounded-md border p-3"
          style={{
            borderColor: "color-mix(in srgb, var(--color-icon-hover) 40%, transparent)",
            background: "color-mix(in srgb, var(--color-icon-hover) 10%, transparent)",
          }}
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)]">
            <BellIcon size={13} weight="fill" style={{ color: "var(--color-icon-hover)" }} />
            {due.length} follow-up{due.length === 1 ? "" : "s"} ready
          </div>
          <div className="flex flex-col gap-1">
            {due.map(({ app, index }) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {app.nextStep && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      color: "var(--color-icon-hover)",
                      background: "color-mix(in srgb, var(--color-icon-hover) 14%, transparent)",
                    }}
                  >
                    {app.nextStep}
                  </span>
                )}
                <span className="min-w-0 truncate text-[var(--color-text)]">
                  {app.company} <span className="text-[var(--color-text-muted)]">· {app.role}</span>
                </span>
                <span className="shrink-0 text-[10px] text-[var(--color-text-muted)] tabular-nums">
                  due {app.followUpDate}
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openEdit(index)}
                    className="rounded px-1.5 py-0.5 text-[11px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => markFollowUpDone(index)}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]"
                  >
                    <CheckIcon size={11} /> Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showStats && data.applications.length > 0 && (
        <div className="mb-4">
          <TrackerStatsView stats={stats} />
        </div>
      )}

      {showForm && (
        <div className="mb-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
          <h3 className="mb-2.5 text-xs font-semibold text-[var(--color-text)]">
            {editingIndex === null ? "Add application" : "Edit application"}
          </h3>
          <div className="grid grid-cols-2 gap-x-2 gap-y-3">
            <Field
              label="Company"
              required
              placeholder="e.g. Acme Corp"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
            <Field
              label="Role"
              required
              placeholder="e.g. Senior Product Designer"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            />
            <Field
              label="Platform"
              placeholder="e.g. LinkedIn"
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
            />
            <Field
              label="Date applied"
              type="date"
              value={form.dateApplied}
              onChange={(e) => setForm((f) => ({ ...f, dateApplied: e.target.value }))}
            />
            <Field
              label="CV version used"
              placeholder="e.g. cv-frontend-v2"
              value={form.cvVersion}
              onChange={(e) => setForm((f) => ({ ...f, cvVersion: e.target.value }))}
            />
            <Field
              label="Follow up on"
              type="date"
              value={form.followUpDate}
              onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))}
            />
            <div className="col-span-2 flex flex-col gap-1.5">
              <Field
                label="Next step"
                placeholder="What to do next, e.g. send a thank-you note"
                value={form.nextStep}
                onChange={(e) => setForm((f) => ({ ...f, nextStep: e.target.value }))}
              />
              {!form.nextStep.trim() && (
                <div className="flex flex-wrap gap-1">
                  {NEXT_STEP_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, nextStep: s }))}
                      className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="col-span-2 flex items-center gap-1.5 px-1 text-xs text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={form.coverLetter}
                onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.checked }))}
              />
              Cover letter included
            </label>
            <Field
              className="col-span-2"
              label="Keywords"
              placeholder="Comma-separated, e.g. react, typescript, ci/cd"
              value={form.keywords}
              onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
            />
            <TextareaField
              className="col-span-2"
              label="Notes"
              rows={2}
              placeholder="Anything worth remembering: a contact, a next step, how it felt"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <div className="col-span-2 flex justify-end gap-2">
              <button
                className="rounded px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
                onClick={closeForm}
              >
                Cancel
              </button>
              <button
                className="rounded bg-[var(--color-accent)] px-2.5 py-1 text-xs text-[var(--color-bg)] hover:opacity-90 disabled:opacity-50"
                onClick={submitForm}
                disabled={!form.company.trim() || !form.role.trim()}
              >
                {editingIndex === null ? "Save" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {data.applications.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm text-[var(--color-text)]">Nothing here yet, and that's okay.</p>
          <p className="max-w-xs text-xs leading-relaxed text-[var(--color-text-muted)]">
            When you apply somewhere, add it here to keep track of where things stand and who to
            follow up with, one step at a time.
          </p>
          <button
            onClick={openAdd}
            className="mt-1 flex items-center gap-1 rounded bg-[var(--color-accent)] px-3 py-1.5 text-xs text-[var(--color-bg)] hover:opacity-90"
          >
            <PlusIcon size={13} /> Add your first application
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-left text-[var(--color-text-muted)]">
                <th className="px-2 py-1.5">{sortableHeader("Company", "company")}</th>
                <th className="px-2 py-1.5 font-medium">Role</th>
                <th className="px-2 py-1.5">{sortableHeader("Applied", "dateApplied")}</th>
                <th className="px-2 py-1.5">{sortableHeader("Status", "status")}</th>
                <th className="px-2 py-1.5">{sortableHeader("Follow-up", "followUp")}</th>
                <th className="px-2 py-1.5 font-medium">Notes</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ app, index }) => {
                const dueNow =
                  !!app.followUpDate && app.followUpDate <= today() && isOpen(app.status);
                return (
                  <tr
                    key={index}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-tertiary)]"
                  >
                    <td className="px-2 py-1.5">
                      <div className="text-[var(--color-text)]">{app.company}</div>
                      {app.platform && (
                        <div className="text-[10px] text-[var(--color-text-muted)]">{app.platform}</div>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--color-text)]">{app.role}</td>
                    <td className="px-2 py-1.5 tabular-nums text-[var(--color-text-muted)]">
                      {app.dateApplied || "·"}
                    </td>
                    <td className="px-2 py-1.5">
                      {/* Filled status pill — a soft tint of the status colour (mixed with the
                          surface so it's opaque and calm) makes the status far easier to spot than a
                          dot, while the value text stays in the legible --color-text. Muted statuses
                          barely tint (staying quiet); vibrant ones pop. appearance-none + a
                          hand-placed caret replace WebKit's native select chrome. */}
                      <div className="relative inline-flex items-center">
                        <select
                          className={`appearance-none rounded-md border py-0.5 pl-2.5 pr-6 text-xs text-[var(--color-text)] outline-none ${FIELD_FOCUS}`}
                          style={{
                            backgroundColor: `color-mix(in srgb, ${statusColor(app.status)} 20%, var(--color-bg))`,
                            borderColor: `color-mix(in srgb, ${statusColor(app.status)} 45%, var(--color-bg))`,
                          }}
                          value={app.status}
                          onChange={(e) => updateStatus(index, e.target.value as ApplicationStatus)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <CaretDownIcon
                          size={10}
                          weight="bold"
                          className="pointer-events-none absolute right-2 text-[var(--color-text-muted)]"
                        />
                      </div>
                      {app.responseDate && (
                        <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)] tabular-nums">
                          replied {app.responseDate}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {app.followUpDate ? (
                        <div className="flex flex-col">
                          <span
                            className={`tabular-nums ${dueNow ? "font-semibold" : "text-[var(--color-text-muted)]"}`}
                            style={dueNow ? { color: "var(--color-icon-hover)" } : undefined}
                          >
                            {app.followUpDate}
                          </span>
                          {app.nextStep && (
                            <span className="text-[10px] text-[var(--color-text-muted)]">
                              {app.nextStep}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">·</span>
                      )}
                    </td>
                    <td
                      className="max-w-[220px] cursor-default truncate px-2 py-1.5 text-[var(--color-text-muted)]"
                      onMouseEnter={(e) => {
                        if (!app.notes) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        setNoteTip({ text: app.notes, x: r.left, top: r.top, bottom: r.bottom });
                      }}
                      onMouseLeave={() => setNoteTip(null)}
                    >
                      {app.notes}
                    </td>
                    <td className="px-2 py-1.5">
                      {pendingDelete === index ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[var(--color-text-muted)]">Remove?</span>
                          <button
                            onClick={() => removeApplication(index)}
                            title="Confirm remove"
                            className="rounded-sm p-1 text-red-500 hover:bg-[var(--color-bg)]"
                          >
                            <CheckIcon size={13} />
                          </button>
                          <button
                            onClick={() => setPendingDelete(null)}
                            title="Cancel"
                            className="rounded-sm p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
                          >
                            <XIcon size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => openEdit(index)}
                            title="Edit"
                            className="rounded-sm p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                          >
                            <PencilSimpleIcon size={13} />
                          </button>
                          <button
                            onClick={() => setPendingDelete(index)}
                            title="Remove"
                            className="rounded-sm p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-red-500"
                          >
                            <TrashIcon size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {noteTip && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs whitespace-pre-wrap rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs leading-snug text-[var(--color-text)] shadow-lg"
          style={{
            left: Math.max(8, Math.min(noteTip.x, window.innerWidth - 328)),
            // Flip above the row when there isn't enough room below; anchoring by `bottom` lets it
            // grow upward regardless of the note's height.
            ...(window.innerHeight - noteTip.bottom < 180
              ? { bottom: window.innerHeight - noteTip.top + 6 }
              : { top: noteTip.bottom + 6 }),
          }}
        >
          {noteTip.text}
        </div>
      )}
    </div>
  );
}
