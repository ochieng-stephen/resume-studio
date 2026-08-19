import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useWorkspaceStore } from "../store/workspaceStore";
import { Snippet, SnippetLibrary, emptySnippetLibrary } from "../lib/snippets";

export function SnippetLibraryView() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [data, setData] = useState<SnippetLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const path = rootPath ? `${rootPath}/snippets.json` : null;

  const load = async () => {
    if (!path) return;
    setLoading(true);
    try {
      const raw = await invoke<string>("read_text_file", { path });
      setData(JSON.parse(raw));
    } catch {
      setData(emptySnippetLibrary());
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const persist = async (next: SnippetLibrary) => {
    if (!path) return;
    setData(next);
    await invoke("write_text_file", { path, contents: JSON.stringify(next, null, 2) });
  };

  const addSnippet = () => {
    if (!data || !text.trim()) return;
    const snippet: Snippet = {
      id: crypto.randomUUID(),
      text: text.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    persist({ snippets: [...data.snippets, snippet] });
    setText("");
    setTags("");
  };

  const removeSnippet = (id: string) => {
    if (!data) return;
    persist({ snippets: data.snippets.filter((s) => s.id !== id) });
  };

  const copySnippet = async (snippet: Snippet) => {
    await navigator.clipboard.writeText(snippet.text);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId((id) => (id === snippet.id ? null : id)), 1500);
  };

  if (!rootPath) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Open a workspace to use the snippet library
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">Snippet Library</h2>
      <p className="text-xs text-[var(--color-text-muted)]">
        Reusable, quantified bullet points. Click Copy, then paste into any resume or cover
        letter.
      </p>

      <div className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
        <textarea
          className="min-h-[70px] rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
          placeholder='e.g. "Led migration of payments platform, cutting latency 40%"'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <button
            className="flex items-center gap-1 rounded bg-[var(--color-accent)] px-2.5 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
            onClick={addSnippet}
            disabled={!text.trim()}
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {data.snippets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-[var(--color-text-muted)]">
          No snippets yet. Add reusable bullet points above.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {data.snippets.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2.5"
            >
              <div className="flex-1">
                <p className="text-xs text-[var(--color-text)]">{s.text}</p>
                {s.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {copiedId === s.id && <span className="text-[10px] text-green-500">Copied!</span>}
                <button
                  className="rounded-sm p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
                  onClick={() => copySnippet(s)}
                  title="Copy to clipboard"
                >
                  <Copy size={13} />
                </button>
                <button
                  className="rounded-sm p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-red-500"
                  onClick={() => removeSnippet(s.id)}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
