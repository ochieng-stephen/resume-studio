import { useEffect, useState } from "react";
import {
  Briefcase,
  FileEdit,
  FileSearch,
  GitCommit,
  Mail,
  Rocket,
  Search,
  Sparkles,
  Table,
  TrendingUp,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { usePaletteStore } from "../store/paletteStore";
import { useTabsStore } from "../store/tabsStore";
import { useJobCaptureStore } from "../store/jobCaptureStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { sendToAgent } from "../lib/agentBridge";

interface Action {
  id: string;
  label: string;
  description: string;
  icon: typeof Search;
  needsInput: boolean;
  placeholder?: string;
  confirmLabel?: string;
  run: (input: string) => void;
}

const ACTIONS: Action[] = [
  {
    id: "search",
    label: "Search Roles",
    description: "Find job openings matching your profile",
    icon: Search,
    needsInput: true,
    placeholder: 'Optional filters, e.g. "backend python remote"',
    run: (input) => sendToAgent(input.trim() ? `/search ${input.trim()}` : "/search"),
  },
  {
    id: "tailor",
    label: "Tailor CV",
    description: "Optimize your CV/resume for a specific role",
    icon: FileEdit,
    needsInput: true,
    placeholder: "Job URL or description",
    run: (input) => sendToAgent(`/tailor ${input.trim()}`),
  },
  {
    id: "cover-letter",
    label: "Draft Cover Letter",
    description: "Generate a targeted cover letter",
    icon: Mail,
    needsInput: true,
    placeholder: "Job URL or company + role",
    run: (input) => sendToAgent(`/cover-letter ${input.trim()}`),
  },
  {
    id: "strategy",
    label: "Review Strategy",
    description: "Analyze performance and get recommendations",
    icon: TrendingUp,
    needsInput: false,
    run: () => sendToAgent("/strategy"),
  },
  {
    id: "autopilot",
    label: "Autopilot",
    description: "Fully autonomous search → tailor → apply pipeline",
    icon: Rocket,
    needsInput: true,
    placeholder: 'Optional scope, e.g. "5 backend roles"',
    run: (input) => sendToAgent(input.trim() ? `/autopilot ${input.trim()}` : "/autopilot"),
  },
  {
    id: "tracker",
    label: "Open Application Tracker",
    description: "View and manage tracked applications",
    icon: Table,
    needsInput: false,
    run: () => useTabsStore.getState().openTrackerTab(),
  },
  {
    id: "ats",
    label: "Check ATS Match",
    description: "Local keyword match between a resume and a job description",
    icon: FileSearch,
    needsInput: false,
    run: () => useTabsStore.getState().openAtsTab(),
  },
  {
    id: "capture-job",
    label: "Capture Job Posting",
    description: "Save a job posting and optionally tailor your CV for it",
    icon: Briefcase,
    needsInput: false,
    run: () => useJobCaptureStore.getState().setOpen(true),
  },
  {
    id: "snippets",
    label: "Snippet Library",
    description: "Reusable, quantified bullet points",
    icon: Sparkles,
    needsInput: false,
    run: () => useTabsStore.getState().openSnippetsTab(),
  },
  {
    id: "search-files",
    label: "Search in Files",
    description: "Search across every file in the workspace",
    icon: Search,
    needsInput: false,
    run: () => useTabsStore.getState().openSearchTab(),
  },
  {
    id: "snapshot",
    label: "Save Snapshot",
    description: "Git-commit the current state of your workspace",
    icon: GitCommit,
    needsInput: true,
    placeholder: "Commit message (optional)",
    confirmLabel: "Save Snapshot",
    run: async (input) => {
      const rootPath = useWorkspaceStore.getState().rootPath;
      if (!rootPath) return;
      try {
        const result = await invoke<string>("git_snapshot", {
          path: rootPath,
          message: input.trim(),
        });
        window.alert(result);
      } catch (e) {
        window.alert(`Snapshot failed: ${e}`);
      }
    },
  },
];

export function CommandPalette() {
  const open = usePaletteStore((s) => s.open);
  const setOpen = usePaletteStore((s) => s.setOpen);
  const [selected, setSelected] = useState<Action | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setInput("");
    }
  }, [open]);

  if (!open) return null;

  const runAction = (action: Action, value: string) => {
    action.run(value);
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-32"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[420px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!selected ? (
          <div className="py-1">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--color-bg-tertiary)]"
                onClick={() => {
                  if (action.needsInput) {
                    setSelected(action);
                  } else {
                    runAction(action, "");
                  }
                }}
              >
                <action.icon size={15} className="shrink-0 text-[var(--color-text-muted)]" />
                <div>
                  <div className="text-xs font-medium text-[var(--color-text)]">{action.label}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    {action.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--color-text)]">
              <selected.icon size={14} />
              {selected.label}
            </div>
            <input
              autoFocus
              className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs outline-none"
              placeholder={selected.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runAction(selected, input);
                if (e.key === "Escape") setSelected(null);
              }}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
                onClick={() => setSelected(null)}
              >
                Back
              </button>
              <button
                className="rounded bg-[var(--color-accent)] px-2 py-1 text-xs text-white hover:opacity-90"
                onClick={() => runAction(selected, input)}
              >
                {selected.confirmLabel ?? "Send to Agent"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
