import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useTerminalStore } from "../store/terminalStore";
import { useSettingsStore } from "../store/settingsStore";
import { TerminalInstance } from "./TerminalInstance";

export function TerminalPanel() {
  const tabs = useTerminalStore((s) => s.tabs);
  const agentPresets = useSettingsStore((s) => s.agentPresets);
  const activeId = useTerminalStore((s) => s.activeId);
  const addTab = useTerminalStore((s) => s.addTab);
  const closeTab = useTerminalStore((s) => s.closeTab);
  const setActive = useTerminalStore((s) => s.setActive);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [customAgent, setCustomAgent] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabs.length === 0) addTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!agentMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAgentMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [agentMenuOpen]);

  const launchAgent = (command: string) => {
    if (!activeId || !command.trim()) return;
    invoke("pty_write", { id: activeId, data: `${command.trim()}\n` }).catch(() => {});
    setAgentMenuOpen(false);
    setCustomAgent("");
  };

  const handleClose = (id: string) => {
    closeTab(id);
  };

  return (
    <div className="flex h-56 shrink-0 flex-col border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-1">
        <div className="flex h-full items-center overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex h-full shrink-0 cursor-default items-center gap-1.5 border-r border-[var(--color-border)] px-2.5 text-xs ${
                tab.id === activeId
                  ? "bg-[var(--color-bg)] text-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
              }`}
            >
              <span>{tab.label}</span>
              <button
                className="rounded-sm px-1 hover:bg-[var(--color-bg-tertiary)]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose(tab.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            title="New Terminal"
            className="flex h-full items-center px-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => addTab()}
          >
            <Plus size={13} />
          </button>
        </div>
        <div ref={menuRef} className="relative shrink-0 pr-1">
          <button
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => setAgentMenuOpen((o) => !o)}
          >
            Launch Agent <ChevronDown size={12} />
          </button>
          {agentMenuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 min-w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 shadow-lg">
              {agentPresets.map((agent) => (
                <button
                  key={agent}
                  className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--color-bg-tertiary)]"
                  onClick={() => launchAgent(agent)}
                >
                  {agent}
                </button>
              ))}
              <div className="my-1 border-t border-[var(--color-border)]" />
              <div className="flex items-center gap-1 px-2 py-1">
                <input
                  className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 text-xs outline-none"
                  placeholder="custom command"
                  value={customAgent}
                  onChange={(e) => setCustomAgent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") launchAgent(customAgent);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 px-2 py-1">
        {tabs.map((tab) => (
          <TerminalInstance key={tab.id} id={tab.id} active={tab.id === activeId} />
        ))}
      </div>
    </div>
  );
}
