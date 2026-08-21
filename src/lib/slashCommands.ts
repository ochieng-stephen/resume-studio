export interface SlashCommand {
  command: string;
  argumentHint: string;
  description: string;
}

/** Mirrors src-tauri/scaffold/claude/skills/*\/SKILL.md — the commands a terminal agent recognizes in this workspace. */
export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/search",
    argumentHint: "[role keywords or filters]",
    description: "Search job platforms for openings matching your profile.",
  },
  {
    command: "/tailor",
    argumentHint: "[job URL or role description]",
    description: "Optimize your CV/resume for a specific role.",
  },
  {
    command: "/cover-letter",
    argumentHint: "[job URL or company + role]",
    description: "Generate a targeted cover letter from your templates.",
  },
  {
    command: "/strategy",
    argumentHint: "[review | update | keywords | platforms]",
    description: "Analyze application performance and refine your search strategy.",
  },
  {
    command: "/autopilot",
    argumentHint: "[scope or filters]",
    description: "Fully autonomous search → tailor → apply pipeline.",
  },
  {
    command: "/tracker",
    argumentHint: "[view | add | update | stats | export]",
    description: "View and manage tracked applications.",
  },
];
