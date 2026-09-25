export interface PortfolioItem {
  /** Stable slug used for provenance and artifact/case-study references. */
  id: string;
  title: string;
  role: string;
  /** Employer/client. Hidden from generated docs when `confidential` is true. */
  org: string;
  summary: string;
  skills: string[];
  keywords: string[];
  /** Quantified results, e.g. "-22% cart abandonment". */
  outcomes: string[];
  /** Workspace-relative paths under portfolio/ (case-studies/, artifacts/). */
  artifacts: string[];
  links: string[];
  /** Free-form, e.g. "2024-03". */
  date: string;
  /** When true, the agent may use outcomes/skills but must not expose org or links. */
  confidential: boolean;
}

export interface Portfolio {
  items: PortfolioItem[];
  /** Header links for career docs (GitHub, personal site, etc.). */
  profileLinks: string[];
}

export function emptyPortfolio(): Portfolio {
  return { items: [], profileLinks: [] };
}

export function emptyItem(): PortfolioItem {
  return {
    id: "",
    title: "",
    role: "",
    org: "",
    summary: "",
    skills: [],
    keywords: [],
    outcomes: [],
    artifacts: [],
    links: [],
    date: "",
    confidential: false,
  };
}

/** Derives a stable, unique slug id from a title, avoiding collisions with `existing` ids. */
export function slugId(title: string, existing: string[] = []): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "item";
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function normalizeItem(raw: unknown, existing: string[]): PortfolioItem {
  const base = emptyItem();
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title : base.title;
  const id = typeof r.id === "string" && r.id.trim() ? r.id : slugId(title, existing);
  return {
    id,
    title,
    role: typeof r.role === "string" ? r.role : base.role,
    org: typeof r.org === "string" ? r.org : base.org,
    summary: typeof r.summary === "string" ? r.summary : base.summary,
    skills: stringArray(r.skills),
    keywords: stringArray(r.keywords),
    outcomes: stringArray(r.outcomes),
    artifacts: stringArray(r.artifacts),
    links: stringArray(r.links),
    date: typeof r.date === "string" ? r.date : base.date,
    confidential: r.confidential === true,
  };
}

/** Merges parsed JSON with schema defaults so partial/old portfolio.json files never crash the UI. */
export function normalizePortfolio(raw: unknown): Portfolio {
  const base = emptyPortfolio();
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Record<string, unknown>;
  const rawItems = Array.isArray(r.items) ? r.items : [];
  const items: PortfolioItem[] = [];
  for (const it of rawItems) {
    items.push(normalizeItem(it, items.map((x) => x.id)));
  }
  return { items, profileLinks: stringArray(r.profileLinks) };
}
