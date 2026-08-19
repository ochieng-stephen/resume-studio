import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";
import { usePrefersDark } from "../hooks/usePrefersDark";
import { useWorkspaceStore } from "../store/workspaceStore";

const lightTheme = { background: "#ffffff", foreground: "#1e1e1e", cursor: "#1e1e1e" };
const darkTheme = { background: "#1e1e1e", foreground: "#d4d4d4", cursor: "#d4d4d4" };

export function TerminalInstance({ id, active }: { id: string; active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const dark = usePrefersDark();
  const rootPathAtMount = useRef(useWorkspaceStore.getState().rootPath);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      fontSize: 12,
      fontFamily: "SF Mono, Menlo, monospace",
      theme: dark ? darkTheme : lightTheme,
      cursorBlink: true,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    invoke("pty_spawn", { id, cwd: rootPathAtMount.current ?? undefined }).catch((e) => {
      term.writeln(`Failed to start shell: ${e}`);
    });

    const unlistenOutput = listen<string>(`pty-output-${id}`, (event) => {
      term.write(event.payload);
    });

    const dataDisposable = term.onData((data) => {
      invoke("pty_write", { id, data }).catch(() => {});
    });

    const resizeObserver = new ResizeObserver(() => {
      fit.fit();
      invoke("pty_resize", { id, rows: term.rows, cols: term.cols }).catch(() => {});
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      dataDisposable.dispose();
      unlistenOutput.then((fn) => fn());
      invoke("pty_kill", { id }).catch(() => {});
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = dark ? darkTheme : lightTheme;
    }
  }, [dark]);

  useEffect(() => {
    if (active) {
      fitRef.current?.fit();
      termRef.current?.focus();
    }
  }, [active]);

  return <div className={active ? "block h-full w-full" : "hidden"} ref={containerRef} />;
}
