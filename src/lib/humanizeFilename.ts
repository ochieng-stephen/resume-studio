export interface HumanizedFilename {
  title: string;
  date: string | null;
}

const DATE_SUFFIX = /-(\d{4}-\d{2}-\d{2})\.[a-z0-9]+$/i;

/**
 * Turns "acme-corp-senior-backend-engineer-2026-08-16.md" into a readable
 * title + date. Company/role aren't split out (hyphenated names make that
 * ambiguous) — just de-slugified into one readable line.
 */
export function humanizeFilename(filename: string): HumanizedFilename {
  const dateMatch = filename.match(DATE_SUFFIX);
  const date = dateMatch ? dateMatch[1] : null;
  const withoutExt = filename.replace(/\.[a-z0-9]+$/i, "");
  const withoutDate = date ? withoutExt.slice(0, -(date.length + 1)) : withoutExt;
  const title = withoutDate
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { title: title || filename, date };
}
