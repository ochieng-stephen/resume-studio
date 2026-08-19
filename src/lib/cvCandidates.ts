import { invoke } from "@tauri-apps/api/core";

export interface DirEntryInfo {
  name: string;
  path: string;
  is_dir: boolean;
}

export const CV_DIRS = [
  "my-current-cvs",
  "my-current-resumes",
  "generated/tailored-cvs",
  "generated/tailored-resumes",
];

/** Lists all CV/resume files across the standard workspace folders. */
export async function listCvCandidates(rootPath: string): Promise<DirEntryInfo[]> {
  const results: DirEntryInfo[] = [];
  for (const dir of CV_DIRS) {
    try {
      const entries = await invoke<DirEntryInfo[]>("list_dir", { path: `${rootPath}/${dir}` });
      results.push(...entries.filter((e) => !e.is_dir));
    } catch {
      // directory may not exist in this workspace yet — skip it
    }
  }
  return results;
}
