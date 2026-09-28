export type ApplicationStatus =
  | "applied"
  | "viewed"
  | "interview"
  | "rejected"
  | "offered"
  | "accepted"
  | "ghosted";

export const STATUSES: ApplicationStatus[] = [
  "applied",
  "viewed",
  "interview",
  "rejected",
  "offered",
  "accepted",
  "ghosted",
];

// Emotional grouping for calm, affirming display: wins are highlighted, closed-negative outcomes
// are muted rather than alarming (an anxious job seeker doesn't need a wall of red), and in-flight
// applications read as neutral progress. Drives both the stats bars and the row status colour.
export type StatusTone = "active" | "progress" | "positive" | "celebrate" | "muted";

export const STATUS_TONE: Record<ApplicationStatus, StatusTone> = {
  applied: "active",
  viewed: "progress",
  interview: "positive",
  offered: "positive",
  accepted: "celebrate",
  rejected: "muted",
  ghosted: "muted",
};

export const STATUS_TONE_COLOR: Record<StatusTone, { light: string; dark: string }> = {
  active: { light: "#6b7280", dark: "#9aa3b2" }, // neutral — in flight
  progress: { light: "#2a78d6", dark: "#3987e5" }, // calm blue — moving
  positive: { light: "#1baf7a", dark: "#199e70" }, // green — good news
  celebrate: { light: "#c8975c", dark: "#ddcdb0" }, // warm accent — a win
  muted: { light: "#9ca3af", dark: "#6b7280" }, // quiet grey — closed, de-emphasised
};

// "In flight" — could still go somewhere. Closed outcomes (rejected/accepted/ghosted) are not.
const OPEN_STATUSES: ApplicationStatus[] = ["applied", "viewed", "interview", "offered"];
export function isOpen(status: ApplicationStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export interface Application {
  company: string;
  role: string;
  platform: string;
  dateApplied: string;
  cvVersion: string;
  coverLetter: boolean;
  status: ApplicationStatus;
  keywords: string[];
  notes: string;
  responseDate?: string;
  followUpDate?: string;
  nextStep?: string;
}

export interface TrackerData {
  version: number;
  lastUpdated: string;
  applications: Application[];
}

export function emptyTracker(): TrackerData {
  return { version: 1, lastUpdated: today(), applications: [] };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeApplication(a: Partial<Application> = {}): Application {
  return {
    company: a.company ?? "",
    role: a.role ?? "",
    platform: a.platform ?? "",
    dateApplied: a.dateApplied ?? today(),
    cvVersion: a.cvVersion ?? "",
    coverLetter: Boolean(a.coverLetter),
    status: a.status ?? "applied",
    keywords: Array.isArray(a.keywords) ? a.keywords : [],
    notes: a.notes ?? "",
    responseDate: a.responseDate,
    followUpDate: a.followUpDate,
    nextStep: a.nextStep,
  };
}

// Tolerant load: coerces older / partial applications.json so inline editing never trips on a
// missing field (e.g. entries created before followUpDate existed).
export function normalizeTracker(raw: unknown): TrackerData {
  const obj = (raw ?? {}) as Partial<TrackerData>;
  return {
    version: 1,
    lastUpdated: obj.lastUpdated ?? today(),
    applications: Array.isArray(obj.applications) ? obj.applications.map(normalizeApplication) : [],
  };
}

// Open applications whose follow-up date has arrived (today or earlier) — the "who do I chase" list.
export function dueFollowUps(data: TrackerData): { app: Application; index: number }[] {
  const t = today();
  return data.applications
    .map((app, index) => ({ app, index }))
    .filter(({ app }) => !!app.followUpDate && app.followUpDate <= t && isOpen(app.status))
    .sort((a, b) => (a.app.followUpDate ?? "").localeCompare(b.app.followUpDate ?? ""));
}

export interface StatBreakdown {
  label: string;
  count: number;
}

export interface TrackerStats {
  total: number;
  responded: number;
  responseRatePct: number;
  active: number;
  interviewing: number;
  offers: number;
  byStatus: { status: ApplicationStatus; count: number }[];
  byPlatform: StatBreakdown[];
  byCvVersion: StatBreakdown[];
}

export function computeStats(data: TrackerData): TrackerStats {
  const apps = data.applications;
  const total = apps.length;
  const byStatus = STATUSES.map((status) => ({
    status,
    count: apps.filter((a) => a.status === status).length,
  }));
  const responded = apps.filter((a) => a.status !== "applied" && a.status !== "ghosted").length;
  const responseRatePct = total > 0 ? Math.round((responded / total) * 100) : 0;
  const active = apps.filter((a) => isOpen(a.status)).length;
  const interviewing = apps.filter((a) => a.status === "interview").length;
  const offers = apps.filter((a) => a.status === "offered" || a.status === "accepted").length;

  const platformCounts = new Map<string, number>();
  for (const a of apps) {
    const key = a.platform.trim() || "Unknown";
    platformCounts.set(key, (platformCounts.get(key) ?? 0) + 1);
  }
  const byPlatform = [...platformCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const cvCounts = new Map<string, number>();
  for (const a of apps) {
    if (!a.cvVersion.trim()) continue;
    cvCounts.set(a.cvVersion, (cvCounts.get(a.cvVersion) ?? 0) + 1);
  }
  const byCvVersion = [...cvCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return { total, responded, responseRatePct, active, interviewing, offers, byStatus, byPlatform, byCvVersion };
}

export function regenerateDashboard(data: TrackerData): string {
  const apps = data.applications;
  const total = apps.length;
  const countByStatus = (s: ApplicationStatus) => apps.filter((a) => a.status === s).length;
  const responded = apps.filter((a) => a.status !== "applied" && a.status !== "ghosted").length;
  const responseRate = total > 0 ? `${Math.round((responded / total) * 100)}% (${responded}/${total})` : "N/A";

  const recent = [...apps]
    .sort((a, b) => b.dateApplied.localeCompare(a.dateApplied))
    .slice(0, 10);

  const platformCounts = new Map<string, number>();
  for (const a of apps) {
    const key = a.platform.trim() || "Unknown";
    platformCounts.set(key, (platformCounts.get(key) ?? 0) + 1);
  }

  const lines: string[] = [];
  lines.push("# Application Dashboard");
  lines.push("");
  lines.push(`*Last updated: ${today()}*`);
  lines.push("");
  lines.push("## Summary");
  lines.push("| Metric | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Total Applications | ${total} |`);
  lines.push(`| Applied | ${countByStatus("applied")} |`);
  lines.push(`| Viewed | ${countByStatus("viewed")} |`);
  lines.push(`| Interview | ${countByStatus("interview")} |`);
  lines.push(`| Offered | ${countByStatus("offered")} |`);
  lines.push(`| Accepted | ${countByStatus("accepted")} |`);
  lines.push(`| Rejected | ${countByStatus("rejected")} |`);
  lines.push(`| Ghosted | ${countByStatus("ghosted")} |`);
  lines.push("");
  lines.push(`**Response Rate**: ${responseRate}`);
  lines.push("");
  lines.push("## Recent Applications");
  if (recent.length === 0) {
    lines.push("");
    lines.push("*No applications tracked yet. Use `/search` to find roles or `/autopilot` to start the full pipeline.*");
  } else {
    lines.push("| Company | Role | Date | Status |");
    lines.push("|---------|------|------|--------|");
    for (const a of recent) {
      lines.push(`| ${a.company} | ${a.role} | ${a.dateApplied} | ${a.status} |`);
    }
  }
  lines.push("");
  const due = dueFollowUps(data);
  lines.push("## Needs Follow-up");
  if (due.length === 0) {
    lines.push("");
    lines.push("*Nothing due right now.*");
  } else {
    lines.push("| Company | Role | Next step | Follow up by |");
    lines.push("|---------|------|-----------|-------------|");
    for (const { app } of due) {
      lines.push(`| ${app.company} | ${app.role} | ${app.nextStep ?? ""} | ${app.followUpDate} |`);
    }
  }
  lines.push("");
  lines.push("## Applications by Platform");
  if (platformCounts.size === 0) {
    lines.push("");
    lines.push("*No data yet.*");
  } else {
    lines.push("| Platform | Count |");
    lines.push("|----------|-------|");
    for (const [platform, count] of platformCounts) {
      lines.push(`| ${platform} | ${count} |`);
    }
  }
  lines.push("");
  lines.push("## Applications by Role Type");
  lines.push("");
  lines.push("*Run `/strategy` for role-type breakdown and deeper pattern analysis.*");
  lines.push("");

  return lines.join("\n");
}
