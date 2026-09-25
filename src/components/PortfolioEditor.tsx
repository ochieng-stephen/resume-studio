import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Lock,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Portfolio,
  PortfolioItem,
  emptyItem,
  emptyPortfolio,
  normalizePortfolio,
  slugId,
} from "../lib/portfolio";
import { sendToAgent } from "../lib/agentBridge";
import { TagListInput } from "./TagListInput";

export function PortfolioEditor({ rootPath }: { rootPath: string }) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    setEditingId(""); // new blank item's id is empty until it gets a title
    setExpanded(true);
  };

  const updateItem = (index: number, patch: Partial<PortfolioItem>) => {
    const items = [...portfolio.items];
    const current = items[index];
    let next = { ...current, ...patch };
    // Derive a stable slug id the first time a title is entered.
    if (!next.id && next.title.trim()) {
      const others = items.filter((_, i) => i !== index).map((x) => x.id);
      next = { ...next, id: slugId(next.title, others) };
      if (editingId === "") setEditingId(next.id);
    }
    items[index] = next;
    persist({ ...portfolio, items }, true);
  };

  const removeItem = (index: number) => {
    const items = portfolio.items.filter((_, i) => i !== index);
    persist({ ...portfolio, items });
    setEditingId(null);
  };

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <button
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <Layers size={14} className="shrink-0 text-[var(--color-text-muted)]" />
        <span className="flex-1 text-xs font-medium text-[var(--color-text)]">Portfolio</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">{portfolio.items.length}</span>
        {expanded ? (
          <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-[var(--color-border)] p-2.5">
          {portfolio.items.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-md border border-dashed border-[var(--color-border)] px-2.5 py-3 text-center">
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Your evidence corpus — real projects and outcomes the agent draws from when
                tailoring CVs and cover letters.
              </p>
              <button
                onClick={() => sendToAgent("/portfolio import ")}
                className="flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-bg-tertiary)] px-2 py-1.5 text-[11px] font-medium text-[var(--color-text)] hover:opacity-80"
              >
                <Sparkles size={12} /> Build from my CV
              </button>
              <button
                onClick={addProject}
                className="flex items-center justify-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <Plus size={11} /> Add a project manually
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {portfolio.items.map((item, index) => {
                const isEditing =
                  editingId === item.id || (editingId === "" && item.id === "");
                return (
                  <div
                    key={item.id || `new-${index}`}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]"
                  >
                    <button
                      onClick={() => setEditingId(isEditing ? null : item.id || "")}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
                    >
                      <span className="flex-1 truncate text-xs text-[var(--color-text)]">
                        {item.title || "Untitled project"}
                      </span>
                      {item.confidential && (
                        <Lock size={11} className="shrink-0 text-[var(--color-text-muted)]" />
                      )}
                      {item.outcomes[0] && !item.confidential && (
                        <span className="shrink-0 truncate text-[10px] text-[var(--color-text-muted)]">
                          {item.outcomes[0]}
                        </span>
                      )}
                    </button>

                    {isEditing && (
                      <div className="flex flex-col gap-2 border-t border-[var(--color-border)] p-2">
                        <input
                          className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
                          placeholder="Title (e.g. Checkout redesign, -22% abandonment)"
                          value={item.title}
                          onChange={(e) => updateItem(index, { title: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
                            placeholder="Role"
                            value={item.role}
                            onChange={(e) => updateItem(index, { role: e.target.value })}
                          />
                          <input
                            className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
                            placeholder="Org / client"
                            value={item.org}
                            onChange={(e) => updateItem(index, { org: e.target.value })}
                          />
                          <input
                            className="col-span-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
                            placeholder="Date (e.g. 2024-03)"
                            value={item.date}
                            onChange={(e) => updateItem(index, { date: e.target.value })}
                          />
                        </div>
                        <textarea
                          className="min-h-[48px] resize-y rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
                          placeholder="What you did (1-3 sentences)"
                          value={item.summary}
                          onChange={(e) => updateItem(index, { summary: e.target.value })}
                        />
                        <TagListInput
                          label="Outcomes (what changed)"
                          values={item.outcomes}
                          onChange={(v) => updateItem(index, { outcomes: v })}
                          placeholder="e.g. -22% cart abandonment"
                        />
                        <TagListInput
                          label="Skills"
                          values={item.skills}
                          onChange={(v) => updateItem(index, { skills: v })}
                          placeholder="e.g. React"
                        />
                        <TagListInput
                          label="Keywords"
                          values={item.keywords}
                          onChange={(v) => updateItem(index, { keywords: v })}
                          placeholder="e.g. e-commerce"
                        />
                        <TagListInput
                          label="Links"
                          values={item.links}
                          onChange={(v) => updateItem(index, { links: v })}
                          placeholder="repo / demo / article URL"
                        />
                        <div className="flex items-center justify-between pt-0.5">
                          <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                            <input
                              type="checkbox"
                              checked={item.confidential}
                              onChange={(e) =>
                                updateItem(index, { confidential: e.target.checked })
                              }
                            />
                            Confidential (hide org & links in docs)
                          </label>
                          <button
                            title="Delete project"
                            onClick={() => removeItem(index)}
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-red-500"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-0.5">
                <button
                  onClick={addProject}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]"
                >
                  <Plus size={11} /> Add project
                </button>
                <button
                  onClick={() => sendToAgent("/portfolio import ")}
                  title="Have the agent extract projects from your CVs"
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]"
                >
                  <Sparkles size={11} /> Import from CV
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
