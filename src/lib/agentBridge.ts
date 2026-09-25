import { invoke } from "@tauri-apps/api/core";
import { useUIStore } from "../store/uiStore";
import { useTerminalStore } from "../store/terminalStore";
import { useSettingsStore } from "../store/settingsStore";

export function buildAgentPrompt(instruction: string, filePaths: string[] = []): string {
  if (filePaths.length === 0) return instruction;
  const refs = filePaths.map((p) => `- ${p}`).join("\n");
  return `${instruction}\n\nRelevant files:\n${refs}`;
}

/** Polls until the PTY session for `id` exists (it spawns asynchronously on mount). */
async function waitForPtyReady(id: string, timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (await invoke<boolean>("pty_is_ready", { id })) return true;
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

/** Reveals the terminal, ensures an active tab, and waits for its PTY to be ready to write. */
async function ensureReadyTerminal(): Promise<string> {
  if (!useUIStore.getState().terminalVisible) {
    useUIStore.setState({ terminalVisible: true });
  }
  let activeId = useTerminalStore.getState().activeId;
  if (!activeId) {
    activeId = useTerminalStore.getState().addTab();
  }
  await waitForPtyReady(activeId);
  return activeId;
}

/**
 * Types a prompt into the active terminal's PTY without submitting it, so the
 * user reviews/edits before running it against whatever agent is in there.
 */
export function sendToAgent(promptText: string) {
  void ensureReadyTerminal().then((id) => {
    invoke("pty_write", { id, data: promptText }).catch(() => {});
  });
}

/**
 * Launches the user's default AI agent into the active terminal if one hasn't been
 * launched there yet, then types (without submitting) the command for the user to run
 * once the agent is ready. Removes the "you must start an agent first" friction for
 * one-click actions like "Build from my CV".
 */
export function launchAgentAndSend(command: string) {
  void ensureReadyTerminal().then((id) => {
    const term = useTerminalStore.getState();
    if (!term.agentLaunched[id]) {
      const agent = useSettingsStore.getState().agentPresets[0] ?? "claude";
      invoke("pty_write", { id, data: `${agent}\n` }).catch(() => {});
      term.markAgentLaunched(id);
    }
    invoke("pty_write", { id, data: command }).catch(() => {});
  });
}
