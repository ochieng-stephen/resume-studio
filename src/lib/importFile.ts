import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

/**
 * Opens the native file picker and copies the chosen file into destDir
 * (never overwrites — auto-renames on collision). Returns the new path,
 * or null if the user cancelled.
 */
export async function importFileInto(
  destDir: string,
  extensions?: string[],
): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: extensions ? [{ name: "Files", extensions }] : undefined,
  });
  if (typeof selected !== "string") return null;
  return invoke<string>("copy_file_into", { source: selected, destDir });
}
