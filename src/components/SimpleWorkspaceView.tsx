import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  BriefcaseIcon,
  EnvelopeIcon,
  FileMagnifyingGlassIcon,
  FilesIcon,
  LightningIcon,
  MagicWandIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CardsThreeIcon,
  TableIcon,
} from "@phosphor-icons/react";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useTabsStore } from "../store/tabsStore";
import { useJobCaptureStore } from "../store/jobCaptureStore";
import { importFileInto } from "../lib/importFile";
import { humanizeFilename } from "../lib/humanizeFilename";
import { buildTemplateStarter, uniqueTemplateFilename } from "../lib/newTemplate";
import { ProfileEditor } from "./ProfileEditor";
import { PortfolioEditor } from "./PortfolioEditor";
import { PromptModal } from "./PromptModal";
import { SlashCommandGuide } from "./SlashCommandGuide";

interface DirEntryInfo {
  name: string;
  path: string;
  is_dir: boolean;
}

interface Item {
  path: string;
  name: string;
  primary: string;
  secondary?: string;
  badge?: string;
}

async function safeListFiles(path: string): Promise<DirEntryInfo[]> {
  try {
    const entries = await invoke<DirEntryInfo[]>("list_dir", { path });
    return entries.filter((e) => !e.is_dir);
  } catch {
    return [];
  }
}

const DOC_EXTENSIONS = ["pdf", "doc", "docx", "md", "txt"];

// Peer-weight quick actions (no single one is the "flagship" the way /autopilot is among
// slash commands), so all four share one identical warm hover treatment rather than any one
// of them being singled out — the icon badge reuses the exact amber tint from the slash
// command panel's icon badges, so the "this is interactive and warm" signature reads as one
// consistent language across the sidebar rather than a one-off.
function QuickTool({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: typeof TableIcon;
  label: string;
  onClick: () => void;
  tone: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 text-[10.5px] font-medium text-[var(--color-text-muted)] transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-icon-hover)]/40 hover:text-[var(--color-text)]"
    >
      {/* Depth illusion (scale) plus an orbit illusion (vertical position), on independent axes:
          the icon grows AND dips down a touch, the label shrinks AND rises a touch — they move
          toward each other symmetrically (translate-y-1 / -translate-y-1), as if both are
          swinging toward a shared horizontal axis sitting between them, like a seesaw or two
          points on a rotating disc. Explicit user direction: "add a vertical displacement... so
          that they appropriately come closer to each other to give the impression as if
          revolving around an axis." Scale still carries depth independently (icon bigger/closer,
          label smaller/farther) — the two cues aren't contradictory, they're orthogonal axes of
          the same gesture. This superseded an earlier version where the label instead drifted
          DOWN, away from the icon (a pure "receding" cue with no convergence) — don't revert to
          that without a fresh explicit ask. Base recipe originally landed on the CV/Resume/
          Capture/New plus-icon buttons in this file, reused here per "use the same animation for
          quick actions icons" — an explicit, deliberate departure from a vertical-lift hover, not
          an oversight. The icon sits bare — no badge/box behind
          it at rest OR on hover ("do not add a background on hover on the quick action icons") —
          resting color is a per-tool tone from the --icon-* triad (via the `tone` prop) so the
          thin/light-weight stroke stays legible and branded without a plate grounding it; the glow `drop-shadow` on hover is what
          signals interactivity instead of a background tint. No stroke-thickening here (unlike
          DrawerPull.tsx) — every sub-pixel offset tried (0.4px, 0.6px) tested as correctly
          applying in Chromium/Playwright but was reported invisible in the real app, most likely
          because Tauri's macOS webview is WebKit, not Chromium, and WebKit appears not to render
          sub-pixel `drop-shadow` offsets the way Chromium does (DrawerPull's whole-number 1px did
          render correctly in the real app, by contrast) — see the WebKit rendering gotcha memory
          for this project. Reverted to the plain scale/color/glow recipe per explicit user
          direction rather than keep guessing at more untested values; do not reintroduce
          stroke-thickening here without first confirming any candidate value actually renders in
          the real Tauri window, not just in Playwright's Chromium. */}
      <span className="flex h-7 w-7 items-center justify-center">
        {/* weight="light" is a deliberate local override of the app-wide "bold" IconContext
            default (src/main.tsx) — asked for specifically on this row for a more relaxed vibe,
            not a reversal of the app-wide bold decision. Started at "thin", bumped one step up
            to "light" — "thin" read as too thin. */}
        <Icon
          size={15}
          weight="light"
          style={{ color: tone }}
          className="transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0.5 group-hover:scale-110 group-hover:drop-shadow-[0_6px_6px_var(--color-icon-hover-glow)]"
        />
      </span>
      {/* Reserves 2-line height so a longer label (e.g. "ATS Check") doesn't make its button
          taller than its neighbors — the row stays visually level regardless of label length. */}
      <span className="flex min-h-[28px] items-center justify-center text-center leading-tight transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5 group-hover:scale-90">
        {label}
      </span>
    </button>
  );
}

// Same card + header-bar recipe as the collapsible panels above (SlashCommandGuide, Profile,
// Portfolio) — every top-level section in this sidebar now shares one bordered-card language,
// so the eye can chunk section boundaries before ever reading a label. The only structural
// difference from the collapsible ones is there's no chevron/collapse toggle: these lists are
// always open, which is itself a meaningful, visible distinction rather than an inconsistency.
function Section({
  title,
  icon: Icon,
  iconColor,
  items,
  emptyText,
  onOpen,
  actions,
}: {
  title: string;
  icon: typeof FilesIcon;
  iconColor?: string;
  items: Item[];
  emptyText: string;
  onOpen: (path: string) => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-[var(--color-cabinet-border)] bg-[var(--color-cabinet)] shadow-[var(--shadow-cabinet)]">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Icon
          size={14}
          className="shrink-0 text-[var(--color-text-muted)]"
          style={iconColor ? { color: iconColor } : undefined}
        />
        <h3 className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {title}
        </h3>
        {items.length > 0 && (
          <span className="text-[10px] text-[var(--color-text-muted)]">{items.length}</span>
        )}
        <div className="flex items-center gap-1">{actions}</div>
      </div>
      <div className="border-t border-[var(--color-cabinet-border)] p-2">
        {items.length === 0 ? (
          // No nested dashed box here — the card's own border already provides the boundary,
          // so a second border-within-a-border was redundant chrome. Quiet text keeps empty
          // sections visually light, so populated sections stand out more by contrast.
          <p className="px-1 py-1 text-[11px] leading-snug text-[var(--color-text-muted)]">
            {emptyText}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <button
                key={item.path}
                onClick={() => onOpen(item.path)}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--color-bg-tertiary)]"
              >
                <span className="truncate text-xs text-[var(--color-text)]">{item.primary}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {item.badge && (
                    <span className="rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--color-text-muted)]">
                      {item.badge}
                    </span>
                  )}
                  {item.secondary && (
                    <span className="text-[10px] text-[var(--color-text-muted)]">{item.secondary}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// A quiet "chapter heading" that breaks the otherwise-uniform top-to-bottom stack of cards into
// a few labelled zones, so the eye can chunk the sidebar into groups before reading any single
// panel title. Deliberately understated per the app's calm, dignified feel — a small uppercase
// caption in the muted walnut tone with a hairline rule trailing to the edge, not a heavy
// full-width divider. The baked-in top margin (larger than the gap below it) is what visually
// ties the label to the group that follows while opening a clear break from the group above.
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-center gap-2.5 px-1">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {children}
      </span>
      <span className="h-px flex-1 bg-[var(--color-cabinet-border)]" />
    </div>
  );
}

export function SimpleWorkspaceView() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const openTrackerTab = useTabsStore((s) => s.openTrackerTab);
  const openAtsTab = useTabsStore((s) => s.openAtsTab);
  const openSnippetsTab = useTabsStore((s) => s.openSnippetsTab);
  const openSearchTab = useTabsStore((s) => s.openSearchTab);
  const openJobCapture = useJobCaptureStore((s) => s.setOpen);

  const [cvResumes, setCvResumes] = useState<Item[]>([]);
  const [generated, setGenerated] = useState<Item[]>([]);
  const [jobs, setJobs] = useState<Item[]>([]);
  const [templates, setTemplates] = useState<Item[]>([]);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  // Immediate hover tooltip for the section action buttons (the native `title` delay is too slow).
  const [btnTip, setBtnTip] = useState<{ label: string; x: number; y: number } | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (root: string) => {
    const [cvs, resumes, tailoredCvs, tailoredResumes, coverLetters, jobPostings, templateFiles] =
      await Promise.all([
        safeListFiles(`${root}/my-current-cvs`),
        safeListFiles(`${root}/my-current-resumes`),
        safeListFiles(`${root}/generated/tailored-cvs`),
        safeListFiles(`${root}/generated/tailored-resumes`),
        safeListFiles(`${root}/generated/cover-letters`),
        safeListFiles(`${root}/jobs`),
        safeListFiles(`${root}/templates/cover-letter-templates`),
      ]);

    setCvResumes([
      ...cvs.map((f) => ({ path: f.path, name: f.name, primary: f.name, badge: "CV" })),
      ...resumes.map((f) => ({ path: f.path, name: f.name, primary: f.name, badge: "Resume" })),
    ]);

    const genItems = [
      ...tailoredCvs.map((f) => ({ f, badge: "Tailored CV" })),
      ...tailoredResumes.map((f) => ({ f, badge: "Tailored Resume" })),
      ...coverLetters.map((f) => ({ f, badge: "Cover Letter" })),
    ]
      .map(({ f, badge }) => {
        const { title, date } = humanizeFilename(f.name);
        return { path: f.path, name: f.name, primary: title, secondary: date ?? undefined, badge, sortKey: date ?? "" };
      })
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    setGenerated(genItems);

    setJobs(
      jobPostings
        .map((f) => {
          const { title, date } = humanizeFilename(f.name);
          return { path: f.path, name: f.name, primary: title, secondary: date ?? undefined, sortKey: date ?? "" };
        })
        .sort((a, b) => b.sortKey.localeCompare(a.sortKey)),
    );

    setTemplates(templateFiles.map((f) => ({ path: f.path, name: f.name, primary: humanizeFilename(f.name).title })));
  };

  useEffect(() => {
    if (rootPath) load(rootPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootPath]);

  useEffect(() => {
    const unlisten = listen<string[]>("workspace-changed", (event) => {
      if (!rootPath) return;
      const watched = [
        "my-current-cvs",
        "my-current-resumes",
        "generated/",
        "jobs/",
        "templates/cover-letter-templates",
      ];
      const relevant = event.payload.some((p) => watched.some((w) => p.includes(`/${w}`)));
      if (!relevant) return;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => load(rootPath), 300);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootPath]);

  if (!rootPath) return null;

  const doImport = async (destDir: string) => {
    const result = await importFileInto(`${rootPath}/${destDir}`, DOC_EXTENSIONS);
    if (result) load(rootPath);
  };

  const openAt = (path: string) => openFile(path, path.split("/").pop() ?? path);

  const createTemplate = async (name: string) => {
    setShowNewTemplate(false);
    const dir = `${rootPath}/templates/cover-letter-templates`;
    const filename = uniqueTemplateFilename(name, templates.map((t) => t.name));
    const path = `${dir}/${filename}`;
    await invoke("write_text_file", { path, contents: buildTemplateStarter(name) });
    await load(rootPath);
    openAt(path);
  };

  const showTip = (label: string, e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    setBtnTip({ label, x: r.left + r.width / 2, y: r.bottom });
  };

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div className="rounded-md border border-[var(--color-cabinet-border)] bg-[var(--color-cabinet)] shadow-[var(--shadow-cabinet)]">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <LightningIcon size={14} className="shrink-0 text-[var(--icon-gold)]" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Quick Actions
          </h3>
        </div>
        <div className="flex gap-2 border-t border-[var(--color-cabinet-border)] p-2">
          <QuickTool icon={TableIcon} label="Tracker" onClick={openTrackerTab} tone="var(--icon-gold)" />
          <QuickTool icon={FileMagnifyingGlassIcon} label="ATS Check" onClick={openAtsTab} tone="var(--icon-sage)" />
          <QuickTool icon={CardsThreeIcon} label="Snippets" onClick={openSnippetsTab} tone="var(--icon-plum)" />
          <QuickTool icon={MagnifyingGlassIcon} label="Search" onClick={openSearchTab} tone="var(--icon-ochre)" />
        </div>
      </div>

      <SlashCommandGuide />

      <GroupLabel>About You</GroupLabel>

      <ProfileEditor rootPath={rootPath} />

      <PortfolioEditor rootPath={rootPath} />

      <GroupLabel>Documents</GroupLabel>

      <Section
        title="My CVs & Resumes"
        icon={FilesIcon}
        iconColor="var(--icon-gold)"
        items={cvResumes}
        emptyText="No CVs or resumes yet. Import your current one to get started."
        onOpen={openAt}
        actions={
          <>
            <button
              onMouseEnter={(e) => showTip("Import CV", e)}
              onMouseLeave={() => setBtnTip(null)}
              onClick={() => doImport("my-current-cvs")}
              className="group flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-text)]"
            >
              <PlusIcon
                size={11}
                className="transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-125 group-hover:text-[var(--color-icon-hover)] group-hover:drop-shadow-[0_5px_5px_var(--color-icon-hover-glow)]"
              />
              <span className="inline-block blur-none transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-90 group-hover:blur-[1px]">
                CV
              </span>
            </button>
            <button
              onMouseEnter={(e) => showTip("Import Resume", e)}
              onMouseLeave={() => setBtnTip(null)}
              onClick={() => doImport("my-current-resumes")}
              className="group flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-text)]"
            >
              <PlusIcon
                size={11}
                className="transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-125 group-hover:text-[var(--color-icon-hover)] group-hover:drop-shadow-[0_5px_5px_var(--color-icon-hover-glow)]"
              />
              <span className="inline-block blur-none transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-90 group-hover:blur-[1px]">
                Resume
              </span>
            </button>
          </>
        }
      />

      <Section
        title="Tailored Applications"
        icon={MagicWandIcon}
        iconColor="var(--icon-plum)"
        items={generated}
        emptyText="Nothing generated yet. Use ⌘K → Tailor CV or Draft Cover Letter."
        onOpen={openAt}
      />

      <Section
        title="Captured Jobs"
        icon={BriefcaseIcon}
        iconColor="var(--icon-ochre)"
        items={jobs}
        emptyText="No job postings captured yet."
        onOpen={openAt}
        actions={
          <button
            onMouseEnter={(e) => showTip("Capture Job Posting", e)}
            onMouseLeave={() => setBtnTip(null)}
            onClick={() => openJobCapture(true)}
            className="group flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-text)]"
          >
            <PlusIcon
              size={11}
              className="transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-125 group-hover:text-[var(--color-icon-hover)] group-hover:drop-shadow-[0_5px_5px_var(--color-icon-hover-glow)]"
            />
            <span className="inline-block blur-none transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-90 group-hover:blur-[1px]">
              Capture
            </span>
          </button>
        }
      />

      <Section
        title="Cover Letter Templates"
        icon={EnvelopeIcon}
        iconColor="var(--icon-gold)"
        items={templates}
        emptyText="No templates yet. Create one to reuse across applications."
        onOpen={openAt}
        actions={
          <button
            onMouseEnter={(e) => showTip("New Template", e)}
            onMouseLeave={() => setBtnTip(null)}
            onClick={() => setShowNewTemplate(true)}
            className="group flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-text)]"
          >
            <PlusIcon
              size={11}
              className="transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-125 group-hover:text-[var(--color-icon-hover)] group-hover:drop-shadow-[0_5px_5px_var(--color-icon-hover-glow)]"
            />
            <span className="inline-block blur-none transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-90 group-hover:blur-[1px]">
              New
            </span>
          </button>
        }
      />

      {showNewTemplate && (
        <PromptModal
          title="New Cover Letter Template"
          label="Template name"
          placeholder='e.g. "Startup / Founder-led"'
          confirmLabel="Create"
          onSubmit={createTemplate}
          onCancel={() => setShowNewTemplate(false)}
        />
      )}

      {btnTip && (
        <div
          className="pointer-events-none fixed z-50 whitespace-nowrap rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px] text-[var(--color-text)] shadow-lg"
          style={{
            left: btnTip.x,
            top: btnTip.y + 6,
            animation: "tip-in 150ms cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {btnTip.label}
        </div>
      )}
    </div>
  );
}
