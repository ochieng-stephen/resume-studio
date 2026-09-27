import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { StackIcon, LockIcon, PlusIcon, SparkleIcon, TrashIcon } from "@phosphor-icons/react";
import {
  Portfolio,
  PortfolioItem,
  emptyItem,
  emptyPortfolio,
  normalizePortfolio,
  slugId,
} from "../lib/portfolio";
import { launchAgentAndSend } from "../lib/agentBridge";
import { DrawerPull } from "./DrawerPull";
import { TagListInput } from "./TagListInput";

// Warm amber selection accent (calm, not the app's electric blue) for the mood of this panel.
const SELECT = "#c8975c";

// The card is 168px wide with a 1px border and 10px of horizontal padding around the title.
// WebKit (Tauri's macOS webview) can let flex items grow past their intended width instead of
// wrapping text, so the title gets an explicit pixel width here rather than trusting flex to
// size it — that's a hard limit the browser can't ignore.
const CARD_WIDTH = 168;
const TITLE_WIDTH = CARD_WIDTH - 2 - 20;

// Muted sunset/earth cover-art gradients — cohesive and calm, so the panel feels affirming.
const COVERS = [
  "linear-gradient(145deg,#caa079,#a67c5f)",
  "linear-gradient(145deg,#c28d7e,#9a6961)",
  "linear-gradient(145deg,#d2aa6a,#b6884f)",
  "linear-gradient(145deg,#b39c6c,#897655)",
  "linear-gradient(145deg,#c9a27a,#9c7a68)",
];

/** Deterministically picks a cover gradient so each project keeps a stable, distinct look. */
function coverFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return COVERS[h % COVERS.length];
}

/** Pulls the first quantified figure from the outcomes to headline the card (e.g. "-22%"). */
function heroMetric(outcomes: string[]): string | null {
  for (const o of outcomes) {
    const m = o.match(/[+\-−]?\$?\d[\d,.]*\s?[%kKmMbB×xX]?/);
    if (m) return m[0].replace(/\s+/g, "").slice(0, 8);
  }
  return null;
}

export function PortfolioEditor({ rootPath }: { rootPath: string }) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const path = `${rootPath}/portfolio/index.json`;

  useEffect(() => {
    invoke<string>("read_text_file", { path })
      .then((raw) => setPortfolio(normalizePortfolio(JSON.parse(raw))))
      .catch(() => setPortfolio(emptyPortfolio()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const persist = (next: Portfolio, debounce = false) => {
    setPortfolio(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const write = () =>
      invoke("write_text_file", {
        path,
        contents: JSON.stringify({ version: 1, ...next }, null, 2),
      });
    if (debounce) {
      saveTimer.current = setTimeout(write, 500);
    } else {
      write();
    }
  };

  if (!portfolio) return null;

  const addProject = () => {
    const item = emptyItem();
    persist({ ...portfolio, items: [...portfolio.items, item] });
    setEditingIndex(portfolio.items.length); // select the newly added card
    setExpanded(true);
  };

  const updateItem = (index: number, patch: Partial<PortfolioItem>) => {
    const items = [...portfolio.items];
    let next = { ...items[index], ...patch };
    // Derive a stable slug id the first time a title is entered.
    if (!next.id && next.title.trim()) {
      const others = items.filter((_, i) => i !== index).map((x) => x.id);
      next = { ...next, id: slugId(next.title, others) };
    }
    items[index] = next;
    persist({ ...portfolio, items }, true);
  };

  const removeItem = (index: number) => {
    persist({ ...portfolio, items: portfolio.items.filter((_, i) => i !== index) });
    setEditingIndex(null);
  };

  const editing = editingIndex !== null ? portfolio.items[editingIndex] : null;

  return (
    <div className="rounded-md border border-[var(--color-cabinet-border)] bg-[var(--color-cabinet)] shadow-[var(--shadow-cabinet)]">
      <button
        className="group flex w-full items-center gap-2 px-3 py-2.5 text-left transition-transform active:scale-[0.99]"
        onClick={() => setExpanded((v) => !v)}
      >
        <StackIcon size={14} className="shrink-0 text-[var(--color-text-muted)]" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Portfolio
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">{portfolio.items.length}</span>
        <DrawerPull expanded={expanded} />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
        <div className="flex flex-col gap-2.5 border-t border-[var(--color-cabinet-border)] p-2.5">
          {portfolio.items.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-md border border-dashed border-[var(--color-border)] px-2.5 py-3 text-center">
              <p className="text-[11px] text-[var(--color-text-muted)]">
                A quiet home for your real work. Add the projects you're proud of, and the agent
                draws on them when tailoring your CV and cover letters.
              </p>
              <button
                onClick={() => launchAgentAndSend("/portfolio import ")}
                className="flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-bg-tertiary)] px-2 py-1.5 text-[11px] font-medium text-[var(--color-text)] hover:opacity-80"
              >
                <SparkleIcon size={12} /> Build from my CV
              </button>
              <button
                onClick={addProject}
                className="flex items-center justify-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <PlusIcon size={11} /> Add a project manually
              </button>
            </div>
          ) : (
            <>
              {/* Card carousel — each project's unclicked state */}
              <div
                className="flex gap-2.5 overflow-x-auto pb-1.5"
                style={{ scrollSnapType: "x mandatory" }}
              >
                {portfolio.items.map((item, index) => {
                  const selected = editingIndex === index;
                  const metric = heroMetric(item.outcomes);
                  const mono = (item.title.trim()[0] || "•").toUpperCase();
                  const subtitle = item.confidential
                    ? [item.role, "Confidential"].filter(Boolean).join(" · ")
                    : [item.role, item.org].filter(Boolean).join(" · ");
                  return (
                    <button
                      key={item.id || `i${index}`}
                      onClick={() => setEditingIndex(selected ? null : index)}
                      style={
                        selected
                          ? {
                              borderColor: SELECT,
                              boxShadow: `0 0 0 1px ${SELECT}, 0 8px 20px -8px ${SELECT}99`,
                            }
                          : undefined
                      }
                      className="flex w-[168px] min-w-0 shrink-0 snap-start flex-col overflow-hidden rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg)] text-left transition hover:translate-y-0.5 hover:border-[var(--color-text-muted)]"
                    >
                      {/* A slim identity band, not a thumbnail — most users won't upload cover
                          art, so the space goes to the title instead of a decorative hero image. */}
                      <div
                        className="flex h-10 items-center justify-between gap-1.5 px-2"
                        style={{ background: coverFor(item.id || item.title || `i${index}`) }}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold text-white">
                          {mono}
                        </span>
                        <span className="flex items-center gap-1">
                          {item.confidential && (
                            <LockIcon
                              size={10}
                              className="text-white"
                              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.45))" }}
                            />
                          )}
                          {metric && (
                            <span
                              className="text-[13px] font-extrabold tracking-tight text-white"
                              style={{ fontVariantNumeric: "tabular-nums", textShadow: "0 1px 4px rgba(0,0,0,.45)" }}
                            >
                              {metric}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 px-2.5 pb-2.5 pt-2">
                        <div
                          className="min-h-[48px] max-h-[48px] overflow-hidden text-[12.5px] font-semibold leading-tight text-[var(--color-text)]"
                          style={{ width: TITLE_WIDTH }}
                        >
                          {item.title || "Untitled project"}
                        </div>
                        {subtitle && (
                          <div
                            className="truncate text-[10.5px] text-[var(--color-text-muted)]"
                            style={{ width: TITLE_WIDTH }}
                          >
                            {subtitle}
                          </div>
                        )}
                        {item.skills.length > 0 && (
                          <div
                            className="mt-1 flex gap-1 overflow-hidden"
                            style={{ width: TITLE_WIDTH }}
                          >
                            {item.skills.slice(0, 2).map((s) => (
                              <span
                                key={s}
                                className="shrink-0 rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--color-text-muted)]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                <button
                  onClick={addProject}
                  className="flex w-[84px] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:border-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <PlusIcon size={16} />
                  <span className="text-[10px]">Add</span>
                </button>
              </div>

              {/* Editor for the selected project, in place below the carousel */}
              {editing && editingIndex !== null && (
                <div
                  className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2"
                  style={{ borderTop: `2px solid ${SELECT}` }}
                >
                  <input
                    className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
                    placeholder="Title (e.g. Checkout redesign, -22% abandonment)"
                    value={editing.title}
                    onChange={(e) => updateItem(editingIndex, { title: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
                      placeholder="Role"
                      value={editing.role}
                      onChange={(e) => updateItem(editingIndex, { role: e.target.value })}
                    />
                    <input
                      className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
                      placeholder="Org / client"
                      value={editing.org}
                      onChange={(e) => updateItem(editingIndex, { org: e.target.value })}
                    />
                    <input
                      className="col-span-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
                      placeholder="Date (e.g. 2024-03)"
                      value={editing.date}
                      onChange={(e) => updateItem(editingIndex, { date: e.target.value })}
                    />
                  </div>
                  <textarea
                    className="min-h-[48px] resize-y rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
                    placeholder="What you did (1-3 sentences)"
                    value={editing.summary}
                    onChange={(e) => updateItem(editingIndex, { summary: e.target.value })}
                  />
                  <TagListInput
                    label="Outcomes (what changed)"
                    values={editing.outcomes}
                    onChange={(v) => updateItem(editingIndex, { outcomes: v })}
                    placeholder="e.g. -22% cart abandonment"
                  />
                  <TagListInput
                    label="Skills"
                    values={editing.skills}
                    onChange={(v) => updateItem(editingIndex, { skills: v })}
                    placeholder="e.g. React"
                  />
                  <TagListInput
                    label="Keywords"
                    values={editing.keywords}
                    onChange={(v) => updateItem(editingIndex, { keywords: v })}
                    placeholder="e.g. e-commerce"
                  />
                  <TagListInput
                    label="Links"
                    values={editing.links}
                    onChange={(v) => updateItem(editingIndex, { links: v })}
                    placeholder="repo / demo / article URL"
                  />
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                      <input
                        type="checkbox"
                        checked={editing.confidential}
                        onChange={(e) => updateItem(editingIndex, { confidential: e.target.checked })}
                      />
                      Confidential (hide org &amp; links in docs)
                    </label>
                    <button
                      title="Delete project"
                      onClick={() => removeItem(editingIndex)}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-red-500"
                    >
                      <TrashIcon size={11} /> Delete
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-0.5">
                <button
                  onClick={() => launchAgentAndSend("/portfolio import ")}
                  title="Have the agent extract projects from your CVs"
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]"
                >
                  <SparkleIcon size={11} /> Import from CV
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
