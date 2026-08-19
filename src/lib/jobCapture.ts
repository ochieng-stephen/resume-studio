export interface JobCaptureInput {
  company: string;
  role: string;
  url: string;
  description: string;
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "untitled";
}

export function buildJobCaptureFile(
  input: JobCaptureInput,
  date: string = new Date().toISOString().slice(0, 10),
): { filename: string; content: string } {
  const filename = `${slugify(input.company)}-${slugify(input.role)}-${date}.md`;
  const lines = [
    `# ${input.role} — ${input.company}`,
    "",
    `- **Company**: ${input.company}`,
    `- **Role**: ${input.role}`,
    `- **Captured**: ${date}`,
  ];
  if (input.url.trim()) lines.push(`- **URL**: ${input.url.trim()}`);
  lines.push("", "## Job Description", "", input.description.trim(), "");
  return { filename, content: lines.join("\n") };
}
