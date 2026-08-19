import { useState } from "react";

interface PromptModalProps {
  title: string;
  placeholder?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

/**
 * Tauri's macOS webview doesn't implement window.prompt() (alert/confirm work,
 * prompt silently no-ops), so any text-entry prompt needs its own modal.
 */
export function PromptModal({ title, placeholder, confirmLabel = "Create", onSubmit, onCancel }: PromptModalProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24" onClick={onCancel}>
      <div
        className="w-80 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)]">
          {title}
        </div>
        <div className="flex flex-col gap-2 p-3">
          <input
            autoFocus
            className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onCancel();
            }}
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              className="rounded px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="rounded bg-[var(--color-accent)] px-2.5 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
              onClick={submit}
              disabled={!value.trim()}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
