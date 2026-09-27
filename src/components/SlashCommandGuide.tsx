import { useState } from "react";
import {
  ArrowBendDownLeftIcon,
  CompassIcon,
  EnvelopeIcon,
  ListChecksIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  RocketIcon,
  StackIcon,
  TerminalWindowIcon,
  type Icon,
} from "@phosphor-icons/react";
import { sendToAgent } from "../lib/agentBridge";
import { SLASH_COMMANDS } from "../lib/slashCommands";
import { DrawerPull } from "./DrawerPull";

// What each command *does* for the agent, not just how to type it — this panel is the
// entry point to the AI doing real work on someone's job search, so it should read as a
// list of things offered on your behalf, not a CLI man page.
const COMMAND_ICONS: Record<string, Icon> = {
  "/search": MagnifyingGlassIcon,
  "/tailor": MagicWandIcon,
  "/cover-letter": EnvelopeIcon,
  "/portfolio": StackIcon,
  "/strategy": CompassIcon,
  "/autopilot": RocketIcon,
  "/tracker": ListChecksIcon,
};

// /autopilot is the one command that hands the whole search → tailor → apply loop to the
// agent — it earns the panel's one warm accent so it reads as the standout offer rather
// than one of seven equally-weighted CLI entries.
const FLAGSHIP_COMMAND = "/autopilot";

export function SlashCommandGuide() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-[var(--color-cabinet-border)] bg-[var(--color-cabinet)] shadow-[var(--shadow-cabinet)]">
      <button
        className="group flex w-full items-center gap-2 px-3 py-2.5 text-left transition-transform active:scale-[0.99]"
        onClick={() => setExpanded((v) => !v)}
      >
        <TerminalWindowIcon size={14} className="shrink-0 text-[var(--color-text-muted)]" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Slash Commands
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">{SLASH_COMMANDS.length}</span>
        <DrawerPull expanded={expanded} />
      </button>

      {/* A real drawer slides, it doesn't snap — grid-template-rows 0fr→1fr is a pure-CSS way
          to animate to "auto" height. Always rendered (not conditionally mounted) so the
          transition has something to animate between. */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
        <div className="flex flex-col gap-1 border-t border-[var(--color-cabinet-border)] p-2">
          {SLASH_COMMANDS.map((cmd) => {
            const Icon = COMMAND_ICONS[cmd.command] ?? TerminalWindowIcon;
            const flagship = cmd.command === FLAGSHIP_COMMAND;
            return (
              <button
                key={cmd.command}
                title={`Type "${cmd.command}" into the terminal`}
                onClick={() => sendToAgent(`${cmd.command} `)}
                className="group flex items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-[var(--color-bg-tertiary)]"
              >
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={
                    flagship
                      ? { background: "#c8975c26", color: "#c8975c" }
                      : { background: "var(--color-bg-tertiary)", color: "var(--color-text-muted)" }
                  }
                >
                  <Icon size={13} weight={flagship ? "duotone" : undefined} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-medium leading-snug text-[var(--color-text)]">
                    {cmd.description}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <code className="shrink-0 rounded-sm bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 font-mono text-[9.5px] text-[var(--color-text-muted)]">
                      {cmd.command}
                    </code>
                    <span className="truncate text-[9.5px] text-[var(--color-text-muted)]">
                      {cmd.argumentHint}
                    </span>
                  </div>
                </div>
                <ArrowBendDownLeftIcon
                  size={11}
                  className="mt-1.5 shrink-0 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100"
                />
              </button>
            );
          })}
          <p className="px-2 pt-1.5 text-[10px] leading-snug text-[var(--color-text-muted)]">
            Click a command to try it — fill in the details in the terminal, then press Enter to run it.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
