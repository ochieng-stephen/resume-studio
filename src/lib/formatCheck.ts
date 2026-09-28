// Document format / parseability heuristics for the Keyword Match view. The single biggest reason
// resumes fail real ATS is not keywords but *parsing*: multi-column layouts, tables, text trapped
// in images or headers, and non-standard glyphs the parser drops. This app can't crack open a PDF's
// internal structure, so these are honest, text-level heuristics plus clear guidance for the binary
// formats it can't read. Findings are framed as gentle "worth checking", never alarming.

export type FormatStatus = "ok" | "warn" | "info";

export interface FormatFinding {
  id: string;
  label: string;
  status: FormatStatus;
  detail: string;
}

const BINARY_EXTS = new Set(["pdf", "doc", "docx", "rtf", "pages"]);
// Decorative bullets / symbols ATS parsers commonly drop or turn into noise.
const RISKY_GLYPHS = /[▪●◦‣⁃➤■□◆◇★☆✔✓➔→»]/;

function extOf(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

/**
 * @param filename  the resume file name (for format detection)
 * @param text      the extracted text, or null if the file couldn't be read as text (binary)
 */
export function checkFormat(filename: string, text: string | null): FormatFinding[] {
  const ext = extOf(filename);
  const findings: FormatFinding[] = [];

  // 1) File format itself.
  if (BINARY_EXTS.has(ext)) {
    findings.push({
      id: "format",
      label: `${ext.toUpperCase()} format`,
      status: "info",
      detail:
        "ATS parse PDF and Word files inconsistently. Keep it single-column with real selectable " +
        "text (not a scan or image), avoid tables and text boxes, and keep your name, email, and " +
        "phone in the body, not in a header or footer, which some parsers ignore.",
    });
  } else if (ext === "md" || ext === "txt" || ext === "") {
    findings.push({
      id: "format",
      label: "Plain-text format",
      status: "ok",
      detail: "Plain text and Markdown parse cleanly. This is the most ATS-safe format to work from.",
    });
  }

  // If we couldn't read the file as text, we can't run content heuristics — say so plainly.
  if (text === null) {
    findings.push({
      id: "unreadable",
      label: "Text not readable here",
      status: "warn",
      detail:
        "This file couldn't be read as text for the keyword check. If it's a scanned or " +
        "image-based PDF, an ATS can't read it either. Work from a text-selectable export, or keep " +
        "a Markdown/plain-text version of your resume to check against.",
    });
    return findings;
  }

  const body = text.trim();
  const lines = body.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const wordCount = body ? body.split(/\s+/).length : 0;

  // 2) Extractable text sanity.
  if (wordCount < 80) {
    findings.push({
      id: "sparse",
      label: "Very little text",
      status: "warn",
      detail:
        "Only a small amount of text was found. If your resume is longer than this, the layout may " +
        "be trapping text in images, columns, or text boxes an ATS can't read.",
    });
  }

  // 3) Column / table layout — several lines with wide internal gaps or tab stops.
  const columnLike = nonEmpty.filter((l) => /\t/.test(l) || /\S {3,}\S/.test(l)).length;
  if (nonEmpty.length >= 5 && columnLike >= Math.max(3, Math.ceil(nonEmpty.length * 0.2))) {
    findings.push({
      id: "columns",
      label: "Possible columns or tables",
      status: "warn",
      detail:
        "Several lines look like columns or a table (wide gaps or tab stops). Multi-column and " +
        "tabular layouts often scramble in an ATS. A single-column, top-to-bottom flow is safest.",
    });
  }

  // 4) Standard section headings help an ATS segment the resume.
  const lower = body.toLowerCase();
  const hasExperience = /(experience|work history|employment)/.test(lower);
  const hasEducation = /education/.test(lower);
  const hasSkills = /(skills|technical skills|competencies)/.test(lower);
  if (wordCount >= 80 && !(hasExperience && hasEducation && hasSkills)) {
    const missing = [
      !hasExperience && "Experience",
      !hasEducation && "Education",
      !hasSkills && "Skills",
    ].filter(Boolean);
    findings.push({
      id: "sections",
      label: "Standard sections",
      status: "warn",
      detail: `Consider clear section headings so an ATS can organize your resume. Not found: ${missing.join(", ")}.`,
    });
  }

  // 5) Contact details present in the body text.
  if (wordCount >= 80) {
    const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(body);
    const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(body);
    if (!hasEmail || !hasPhone) {
      const missing = [!hasEmail && "email", !hasPhone && "phone"].filter(Boolean);
      findings.push({
        id: "contact",
        label: "Contact details in body",
        status: "warn",
        detail: `Keep your ${missing.join(" and ")} in the body text (not only in a header/footer, which some ATS skip).`,
      });
    }
  }

  // 6) ATS-hostile bullet glyphs.
  if (RISKY_GLYPHS.test(body)) {
    findings.push({
      id: "glyphs",
      label: "Decorative symbols",
      status: "warn",
      detail:
        "Some decorative bullet symbols get dropped or garbled by ATS parsers. Plain hyphens or " +
        "standard round bullets are the safest.",
    });
  }

  return findings;
}
