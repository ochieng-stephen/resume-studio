import { Settings } from "lucide-react";
import { useUIStore } from "../store/uiStore";
import { usePaletteStore } from "../store/paletteStore";
import { useSettingsModalStore } from "../store/settingsModalStore";

function IconButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`rounded px-2 py-1 text-xs transition-colors ${
        active
          ? "bg-[var(--color-accent)] text-white"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
      }`}
    >
      {children}
    </button>
  );
}

export function TitleBar() {
  const {
    sidebarVisible,
    terminalVisible,
    previewVisible,
    toggleSidebar,
    toggleTerminal,
    togglePreview,
  } = useUIStore();

  return (
    <div
      data-tauri-drag-region
      className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-[78px] pr-3"
    >
      <span
        data-tauri-drag-region
        className="pointer-events-none text-xs font-medium text-[var(--color-text-muted)]"
      >
        Résumé Studio
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => usePaletteStore.getState().setOpen(true)}
          title="Agent actions (⌘K)"
          className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
        >
          ⌘K Actions
        </button>
        <IconButton
          active={sidebarVisible}
          label="Toggle sidebar"
          onClick={toggleSidebar}
        >
          Sidebar
        </IconButton>
        <IconButton
          active={previewVisible}
          label="Toggle preview"
          onClick={togglePreview}
        >
          Preview
        </IconButton>
        <IconButton
          active={terminalVisible}
          label="Toggle terminal"
          onClick={toggleTerminal}
        >
          Terminal
        </IconButton>
        <button
          onClick={() => useSettingsModalStore.getState().setOpen(true)}
          title="Settings"
          className="rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}
