import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../store/workspaceStore";
import { DirEntryInfo, listCvCandidates } from "../lib/cvCandidates";
import { AtsResult, checkAtsMatch } from "../lib/atsMatch";

export function AtsCheckerView() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [candidates, setCandidates] = useState<DirEntryInfo[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<AtsResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!rootPath) return;
    listCvCandidates(rootPath).then((entries) => {
      setCandidates(entries);
      if (entries.length > 0 && !selectedPath) setSelectedPath(entries[0].path);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootPath]);

  const runCheck = async () => {
    if (!selectedPath || !jobDescription.trim()) return;
    setChecking(true);
    try {
      const resumeText = await invoke<string>("read_text_file", { path: selectedPath });
      setResult(checkAtsMatch(jobDescription, resumeText));
    } finally {
      setChecking(false);
    }
  };

  if (!rootPath) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Open a workspace to use the ATS match checker
      </div>
    );
  }

  const scoreColor =
    result === null
      ? ""
      : result.score >= 70
        ? "text-green-500"
        : result.score >= 40
          ? "text-amber-500"
          : "text-red-500";

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">ATS Match Checker</h2>
      <p className="text-xs text-[var(--color-text-muted)]">
        Local keyword matching, no AI — approximates how an applicant-tracking system scans your
        resume against a job description.
      </p>

      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">Resume:</span>
        <select
          className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
        >
          {candidates.length === 0 && <option value="">No CV/resume files found</option>}
          {candidates.map((c) => (
            <option key={c.path} value={c.path}>
              {rootPath ? c.path.replace(`${rootPath}/`, "") : c.path}
            </option>
          ))}
        </select>
      </div>

      <textarea
        className="min-h-[140px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs outline-none"
        placeholder="Paste the job description here…"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />

      <button
        className="w-fit rounded bg-[var(--color-accent)] px-3 py-1.5 text-xs text-white hover:opacity-90 disabled:opacity-50"
        onClick={runCheck}
        disabled={!selectedPath || !jobDescription.trim() || checking}
      >
        {checking ? "Checking…" : "Check Match"}
      </button>

      {result && (
        <div className="mt-2 flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${scoreColor}`}>{result.score}%</span>
            <span className="text-xs text-[var(--color-text-muted)]">
              keyword match ({result.matched.length}/{result.matched.length + result.missing.length}
              )
            </span>
          </div>

          <div>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Matched ({result.matched.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {result.matched.map((k) => (
                <span
                  key={k.keyword}
                  className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[11px] text-green-600 dark:text-green-400"
                >
                  {k.keyword}
                </span>
              ))}
              {result.matched.length === 0 && (
                <span className="text-[11px] text-[var(--color-text-muted)]">None yet</span>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Missing ({result.missing.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {result.missing.map((k) => (
                <span
                  key={k.keyword}
                  className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-600 dark:text-red-400"
                  title={`Appears ${k.count}× in the job description`}
                >
                  {k.keyword}
                </span>
              ))}
              {result.missing.length === 0 && (
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Nothing missing — great coverage
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
