const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our",
  "out", "day", "get", "has", "him", "his", "how", "man", "new", "now", "old", "see", "two",
  "way", "who", "boy", "did", "its", "let", "put", "say", "she", "too", "use", "with", "this",
  "that", "have", "from", "they", "will", "would", "there", "their", "what", "about", "which",
  "when", "make", "like", "time", "just", "than", "then", "them", "these", "some", "into",
  "such", "your", "role", "team", "work", "years", "year", "strong", "ability", "abilities",
  "preferred", "required", "requirements", "requirement", "including", "including", "across",
  "within", "using", "used", "join", "join", "company", "companies", "candidate", "candidates",
  "experience", "experienced", "skills", "skill", "knowledge", "opportunity", "opportunities",
  "responsibilities", "responsible", "looking", "seeking", "ideal", "plus", "etc", "eg", "ie",
  "position", "job", "apply", "application", "applicants", "must", "should", "able", "high",
  "level", "excellent", "good", "great", "best", "including", "other", "various", "related",
  "familiarity", "familiar", "understanding", "background", "environment", "environments",
]);

// Short (1-2 char) tokens that are genuine, decision-relevant skills, allow-listed back in after
// the length filter would otherwise drop them. Without this the checker silently ignores exactly
// the terms this app's users care most about. Kept conservative to avoid re-admitting filler.
const SHORT_SKILLS = new Set(["qa", "ux", "ui", "bi", "go", "c#", "ar", "vr"]);

// Curated multi-word skills and acronyms, each with the surface forms that should collapse to one
// canonical token BEFORE tokenizing — so "JS" and "JavaScript", "ML" and "machine learning", or
// "Amazon Web Services" and "AWS" are treated as the same thing on both sides of the match. This
// replaces naive bigram extraction (which produced noise like "python machine") with a precise,
// high-signal set. Longest surface forms are applied first so phrases win over their acronyms.
const CANON_RULES: { canon: string; alts: string[] }[] = [
  { canon: "machine-learning", alts: ["machine learning", "ml"] },
  { canon: "deep-learning", alts: ["deep learning"] },
  { canon: "nlp", alts: ["natural language processing", "nlp"] },
  { canon: "computer-vision", alts: ["computer vision"] },
  { canon: "data-science", alts: ["data science"] },
  { canon: "ai", alts: ["artificial intelligence", "ai"] },
  { canon: "react-native", alts: ["react native"] },
  { canon: "node.js", alts: ["node.js", "nodejs"] },
  { canon: "ci/cd", alts: ["continuous integration", "ci/cd", "cicd"] },
  { canon: "aws", alts: ["amazon web services", "aws"] },
  { canon: "gcp", alts: ["google cloud platform", "google cloud", "gcp"] },
  { canon: "javascript", alts: ["javascript", "js"] },
  { canon: "typescript", alts: ["typescript", "ts"] },
  { canon: "kubernetes", alts: ["kubernetes", "k8s"] },
  { canon: "postgresql", alts: ["postgresql", "postgres"] },
  { canon: "product-management", alts: ["product management"] },
  { canon: "project-management", alts: ["project management"] },
];

// Every canonical token, so the tokenizer/normalizer treat them as first-class (never singularized,
// always "content" even when short like "ai").
const CANON = new Set(CANON_RULES.map((r) => r.canon));

// Readable labels for the hyphenated/acronym canonicals when shown in the UI.
const DISPLAY: Record<string, string> = {
  "machine-learning": "machine learning",
  "deep-learning": "deep learning",
  "computer-vision": "computer vision",
  "data-science": "data science",
  "react-native": "react native",
  "product-management": "product management",
  "project-management": "project management",
  nlp: "NLP", ai: "AI", aws: "AWS", gcp: "GCP", "ci/cd": "CI/CD",
  "node.js": "Node.js", javascript: "JavaScript", typescript: "TypeScript",
  kubernetes: "Kubernetes", postgresql: "PostgreSQL",
};

// Flattened [surface -> canonical] rules, longest surface first, precompiled for the collapse pass.
const COLLAPSE = CANON_RULES.flatMap((r) => r.alts.map((alt) => ({ alt, canon: r.canon })))
  .sort((a, b) => b.alt.length - a.alt.length)
  .map(({ alt, canon }) => ({
    re: new RegExp(`\\b${alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"),
    canon,
  }));

/** Collapse known multi-word/acronym skills into single canonical tokens before tokenizing. */
function collapse(text: string): string {
  let out = text.toLowerCase();
  for (const { re, canon } of COLLAPSE) out = out.replace(re, ` ${canon} `);
  return out;
}

export interface KeywordMatch {
  keyword: string;
  count: number;
  matched: boolean;
}

export interface AtsResult {
  score: number;
  matched: KeywordMatch[];
  missing: KeywordMatch[];
}

function tokenize(text: string): string[] {
  const raw = collapse(text).match(/[a-z][a-z0-9+.#/-]*/gi) ?? [];
  return raw.map((w) => w.replace(/^[-./]+|[-./]+$/g, "")).filter(Boolean);
}

function singularize(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("es") && word.length > 3) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

/** A meaningful token: a canonical skill, or a non-stopword long enough / allow-listed short skill. */
function isContent(word: string): boolean {
  if (CANON.has(word)) return true;
  if (STOPWORDS.has(word)) return false;
  return word.length >= 3 || SHORT_SKILLS.has(word);
}

/** Canonical match key: canonical skills pass through untouched, everything else is singularized. */
function normalize(word: string): string {
  return CANON.has(word) ? word : singularize(word);
}

/** The set of canonical keys present in a body of text (a résumé, a skill list). */
function keySet(text: string): Set<string> {
  return new Set(tokenize(text).filter(isContent).map(normalize));
}

interface KeyEntry {
  keyword: string; // display label
  key: string; // canonical match key
  count: number;
}

function extractKeyEntries(jobDescription: string, maxKeywords: number): KeyEntry[] {
  const tokens = tokenize(jobDescription).filter(isContent);
  // Count by canonical key, but remember the surface forms so non-canonical words display as the
  // author actually wrote them ("pipelines") rather than the internal singular stem ("pipelin").
  const acc = new Map<string, { count: number; surfaces: Map<string, number> }>();
  for (const t of tokens) {
    const key = normalize(t);
    const e = acc.get(key) ?? { count: 0, surfaces: new Map<string, number>() };
    e.count += 1;
    e.surfaces.set(t, (e.surfaces.get(t) ?? 0) + 1);
    acc.set(key, e);
  }
  const label = (key: string, surfaces: Map<string, number>) =>
    DISPLAY[key] ?? [...surfaces.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];
  return [...acc.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxKeywords)
    .map(([key, e]) => ({ key, keyword: label(key, e.surfaces), count: e.count }));
}

export function extractKeywords(jobDescription: string, maxKeywords = 40): KeywordMatch[] {
  return extractKeyEntries(jobDescription, maxKeywords).map((e) => ({
    keyword: e.keyword,
    count: e.count,
    matched: false,
  }));
}

export interface RankedPortfolioItem<T> {
  item: T;
  /** Number of the job's top keywords this item's skills/keywords cover. */
  score: number;
  /** The overlapping keywords, for a "why it fits" explanation. */
  matched: string[];
}

/**
 * Ranks portfolio items by how well their skills/keywords cover the job description's language.
 * Reuses the same keyword extraction/normalization as ATS matching so the two stay consistent.
 */
export function rankPortfolioItems<T extends { skills: string[]; keywords: string[] }>(
  jobDescription: string,
  items: T[],
): RankedPortfolioItem<T>[] {
  const jdEntries = extractKeyEntries(jobDescription, 40);
  const labelFor = new Map(jdEntries.map((e) => [e.key, e.keyword]));
  const jdKeys = new Set(jdEntries.map((e) => e.key));
  return items
    .map((item) => {
      const itemKeys = keySet([...item.skills, ...item.keywords].join(" "));
      const matched = [...jdKeys].filter((k) => itemKeys.has(k)).map((k) => labelFor.get(k) ?? k);
      return { item, score: matched.length, matched };
    })
    .sort((a, b) => b.score - a.score);
}

export function checkAtsMatch(jobDescription: string, resumeText: string): AtsResult {
  const resumeKeys = keySet(resumeText);
  const entries = extractKeyEntries(jobDescription, 40);
  const withMatch: KeywordMatch[] = entries.map((e) => ({
    keyword: e.keyword,
    count: e.count,
    matched: resumeKeys.has(e.key),
  }));
  const matched = withMatch.filter((k) => k.matched);
  const missing = withMatch.filter((k) => !k.matched);
  const score = withMatch.length > 0 ? Math.round((matched.length / withMatch.length) * 100) : 0;
  return { score, matched, missing };
}
