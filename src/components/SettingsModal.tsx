import { useState } from "react";
import { useSettingsModalStore } from "../store/settingsModalStore";
import { ThemeSetting, useSettingsStore } from "../store/settingsStore";

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "⌘K", action: "Agent action palette" },
  { keys: "⌘B", action: "Toggle sidebar" },
  { keys: "⌘J", action: "Toggle terminal" },
  { keys: "⌘⌥P", action: "Toggle preview" },
  { keys: "⌘N", action: "New file" },
  { keys: "⌘S", action: "Save file" },
];

export function SettingsModal() {
  const open = useSettingsModalStore((s) => s.open);
  const setOpen = useSettingsModalStore((s) => s.setOpen);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const agentPresets = useSettingsStore((s) => s.agentPresets);
  const setAgentPresets = useSettingsStore((s) => s.setAgentPresets);
  const [newPreset, setNewPreset] = useState("");

  if (!open) return null;

  const close = () => setOpen(false);

  const addPreset = () => {
    const value = newPreset.trim();
    if (!value || agentPresets.includes(value)) return;
    setAgentPresets([...agentPresets, value]);
    setNewPreset("");
  };

  const removePreset = (preset: string) => {
    setAgentPresets(agentPresets.filter((p) => p !== preset));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-20"
      onClick={close}
    >
      <div
        className="max-h-[80vh] w-[440px] overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--color-border)] px-4 py-2.5 text-xs font-medium text-[var(--color-text)]">
          Settings
        </div>

        <div className="flex flex-col gap-5 p-4">
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Appearance
            </h3>
            <div className="flex gap-1">
              {(["system", "light", "dark"] as ThemeSetting[]).map((t) => (
                <button
                  key={t}
                  className={`flex-1 rounded border px-2 py-1.5 text-xs capitalize ${
                    theme === t
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                      : "border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]"
                  }`}
                  onClick={() => setTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Terminal Agent Presets
            </h3>
            <div className="flex flex-col gap-1.5">
              {agentPresets.map((preset) => (
                <div
                  key={preset}
                  className="flex items-center justify-between rounded border border-[var(--color-border)] px-2 py-1 text-xs"
                >
                  <span className="text-[var(--color-text)]">{preset}</span>
                  <button
                    className="text-[var(--color-text-muted)] hover:text-red-500"
                    onClick={() => removePreset(preset)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="flex gap-1.5">
                <input
                  className="flex-1 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
                  placeholder="Add a command, e.g. codex"
                  value={newPreset}
                  onChange={(e) => setNewPreset(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPreset()}
                />
                <button
                  className="rounded border border-[var(--color-border)] px-2.5 py-1 text-xs hover:bg-[var(--color-bg-tertiary)]"
                  onClick={addPreset}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Keyboard Shortcuts
            </h3>
            <div className="flex flex-col gap-1">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">{s.action}</span>
                  <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text)]">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
