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

export interface StatBreakdown {
  label: string;
  count: number;
}

export interface TrackerStats {
  total: number;
  responded: number;
  responseRatePct: number;
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

  return { total, responded, responseRatePct, byStatus, byPlatform, byCvVersion };
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
    platformCounts.set(a.platform, (platformCounts.get(a.platform) ?? 0) + 1);
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
