import { invoke } from "@tauri-apps/api/core";
import { useUIStore } from "../store/uiStore";
import { useTerminalStore } from "../store/terminalStore";

export function buildAgentPrompt(instruction: string, filePaths: string[] = []): string {
  if (filePaths.length === 0) return instruction;
  const refs = filePaths.map((p) => `- ${p}`).join("\n");
  return `${instruction}\n\nRelevant files:\n${refs}`;
}

/**
 * Types a prompt into the active terminal's PTY without submitting it, so the
 * user reviews/edits before running it against whatever agent is in there.
 */
export function sendToAgent(promptText: string) {
  if (!useUIStore.getState().terminalVisible) {
    useUIStore.setState({ terminalVisible: true });
  }
  let { activeId } = useTerminalStore.getState();
  if (!activeId) {
    activeId = useTerminalStore.getState().addTab();
  }
  invoke("pty_write", { id: activeId, data: promptText }).catch(() => {});
}
