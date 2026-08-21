import { useState } from "react";
import { ChevronDown, ChevronRight, CornerDownLeft, SquareSlash } from "lucide-react";
import { sendToAgent } from "../lib/agentBridge";
import { SLASH_COMMANDS } from "../lib/slashCommands";

export function SlashCommandGuide() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <button
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <SquareSlash size={14} className="shrink-0 text-[var(--color-text-muted)]" />
        <span className="flex-1 text-xs font-medium text-[var(--color-text)]">Slash Commands</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">{SLASH_COMMANDS.length}</span>
        {expanded ? (
          <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-0.5 border-t border-[var(--color-border)] p-2">
          {SLASH_COMMANDS.map((cmd) => (
            <button
              key={cmd.command}
              title={`Type "${cmd.command}" into the terminal`}
              onClick={() => sendToAgent(`${cmd.command} `)}
              className="group flex items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--color-bg-tertiary)]"
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <code className="shrink-0 rounded-sm bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text)]">
                    {cmd.command}
                  </code>
                  <span className="truncate text-[10px] italic text-[var(--color-text-muted)]">
                    {cmd.argumentHint}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">
                  {cmd.description}
                </p>
              </div>
              <CornerDownLeft
                size={11}
                className="mt-0.5 shrink-0 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100"
              />
            </button>
          ))}
          <p className="px-2 pt-1.5 text-[10px] leading-snug text-[var(--color-text-muted)]">
            Click a command to type it into the terminal — fill in the details, then press Enter to run it.
          </p>
        </div>
      )}
    </div>
  );
}
