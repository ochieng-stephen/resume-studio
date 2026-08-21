import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Briefcase,
  FileSearch,
  FileText,
  Files,
  Plus,
  Search,
  Sparkles,
  Table,
} from "lucide-react";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useTabsStore } from "../store/tabsStore";
import { useJobCaptureStore } from "../store/jobCaptureStore";
import { importFileInto } from "../lib/importFile";
import { humanizeFilename } from "../lib/humanizeFilename";
import { buildTemplateStarter, uniqueTemplateFilename } from "../lib/newTemplate";
import { ProfileEditor } from "./ProfileEditor";
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

function QuickTool({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Table;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1 rounded-md border border-[var(--color-border)] py-2 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]"
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function Section({
  title,
  icon: Icon,
  items,
  emptyText,
  onOpen,
  actions,
}: {
  title: string;
  icon: typeof Files;
  items: Item[];
  emptyText: string;
  onOpen: (path: string) => void;
  actions?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          <Icon size={12} />
          {title}
        </h3>
        <div className="flex items-center gap-1">{actions}</div>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--color-border)] px-2.5 py-3 text-center text-[11px] text-[var(--color-text-muted)]">
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

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
      <div className="flex gap-1.5">
        <QuickTool icon={Table} label="Tracker" onClick={openTrackerTab} />
        <QuickTool icon={FileSearch} label="ATS Check" onClick={openAtsTab} />
        <QuickTool icon={Sparkles} label="Snippets" onClick={openSnippetsTab} />
        <QuickTool icon={Search} label="Search" onClick={openSearchTab} />
      </div>

      <SlashCommandGuide />

      <ProfileEditor rootPath={rootPath} />

      <Section
        title="My CVs & Resumes"
        icon={Files}
        items={cvResumes}
        emptyText="No CVs or resumes yet — import your current one to get started."
        onOpen={openAt}
        actions={
          <>
            <button
              title="Import CV"
              onClick={() => doImport("my-current-cvs")}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
            >
              <Plus size={11} /> CV
            </button>
            <button
              title="Import Resume"
              onClick={() => doImport("my-current-resumes")}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
            >
              <Plus size={11} /> Resume
            </button>
          </>
        }
      />

      <Section
        title="Tailored Applications"
        icon={FileText}
        items={generated}
        emptyText="Nothing generated yet. Use ⌘K → Tailor CV or Draft Cover Letter."
        onOpen={openAt}
      />

      <Section
        title="Captured Jobs"
        icon={Briefcase}
        items={jobs}
        emptyText="No job postings captured yet."
        onOpen={openAt}
        actions={
          <button
            title="Capture Job Posting"
            onClick={() => openJobCapture(true)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
          >
            <Plus size={11} /> Capture
          </button>
        }
      />

      <Section
        title="Cover Letter Templates"
        icon={FileText}
        items={templates}
        emptyText="No templates yet — create one to reuse across applications."
        onOpen={openAt}
        actions={
          <button
            title="New Template"
            onClick={() => setShowNewTemplate(true)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]"
          >
            <Plus size={11} /> New
          </button>
        }
      />

      {showNewTemplate && (
        <PromptModal
          title="New Cover Letter Template"
          placeholder='e.g. "Startup / Founder-led"'
          confirmLabel="Create"
          onSubmit={createTemplate}
          onCancel={() => setShowNewTemplate(false)}
        />
      )}
    </div>
  );
}
