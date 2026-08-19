function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "template";
}

/** Picks a filename that doesn't collide with any existing name in the folder. */
export function uniqueTemplateFilename(name: string, existingNames: string[]): string {
  const base = slugify(name);
  let filename = `${base}.md`;
  let counter = 2;
  while (existingNames.includes(filename)) {
    filename = `${base}-${counter}.md`;
    counter++;
  }
  return filename;
}

export function buildTemplateStarter(name: string): string {
  return `# Cover Letter Template: ${name}

<!-- Variables to replace: {COMPANY}, {ROLE}, {YOUR_NAME}, {YOUR_EMAIL}, {YOUR_LOCATION} -->

Dear {COMPANY} Hiring Team,



Best regards,
{YOUR_NAME}
{YOUR_EMAIL} | {YOUR_LOCATION}
`;
}
