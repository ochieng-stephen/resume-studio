const CV_DIR_SEGMENTS = [
  "/my-current-cvs/",
  "/my-current-resumes/",
  "/generated/tailored-cvs/",
  "/generated/tailored-resumes/",
];

const PRINTABLE_DIR_SEGMENTS = [...CV_DIR_SEGMENTS, "/generated/cover-letters/"];

function includesSegment(path: string, segments: string[]): boolean {
  const normalized = `/${path}`;
  return segments.some((seg) => normalized.includes(seg));
}

/** CVs/resumes eligible for the base-vs-tailored "Compare with..." diff action. */
export function isCvLikeFile(path: string): boolean {
  return path.endsWith(".md") && includesSegment(path, CV_DIR_SEGMENTS);
}

/** CVs, resumes, and cover letters eligible for the print-styled preview + PDF/DOCX export. */
export function isPrintableDocument(path: string): boolean {
  return path.endsWith(".md") && includesSegment(path, PRINTABLE_DIR_SEGMENTS);
}
