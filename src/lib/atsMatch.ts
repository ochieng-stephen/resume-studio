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
  const raw = text.toLowerCase().match(/[a-z][a-z0-9+.#/-]*/gi) ?? [];
  return raw.map((w) => w.replace(/^[-./]+|[-./]+$/g, "")).filter((w) => w.length >= 3);
}

function singularize(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("es") && word.length > 3) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

export function extractKeywords(jobDescription: string, maxKeywords = 40): KeywordMatch[] {
  const tokens = tokenize(jobDescription).filter((w) => !STOPWORDS.has(w));
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([keyword, count]) => ({ keyword, count, matched: false }));
}

export function checkAtsMatch(jobDescription: string, resumeText: string): AtsResult {
  const resumeTokens = new Set(tokenize(resumeText).map(singularize));
  const keywords = extractKeywords(jobDescription);
  const withMatch = keywords.map((k) => ({
    ...k,
    matched: resumeTokens.has(k.keyword) || resumeTokens.has(singularize(k.keyword)),
  }));
  const matched = withMatch.filter((k) => k.matched);
  const missing = withMatch.filter((k) => !k.matched);
  const score = withMatch.length > 0 ? Math.round((matched.length / withMatch.length) * 100) : 0;
  return { score, matched, missing };
}
