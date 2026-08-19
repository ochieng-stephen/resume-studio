import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, ChevronRight, UserRound } from "lucide-react";
import { Profile, emptyProfile, normalizeProfile } from "../lib/profile";
import { TagListInput } from "./TagListInput";

export function ProfileEditor({ rootPath }: { rootPath: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expanded, setExpanded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const path = `${rootPath}/profile.json`;

  useEffect(() => {
    invoke<string>("read_text_file", { path })
      .then((raw) => setProfile(normalizeProfile(JSON.parse(raw))))
      .catch(() => setProfile(emptyProfile()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const persist = (next: Profile, debounce = false) => {
    setProfile(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const write = () => invoke("write_text_file", { path, contents: JSON.stringify(next, null, 2) });
    if (debounce) {
      saveTimer.current = setTimeout(write, 500);
    } else {
      write();
    }
  };

  if (!profile) return null;

  const summary = profile.name
    ? `${profile.name}${profile.role ? ` · ${profile.role}` : ""}`
    : "Set up your profile";

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <button
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <UserRound size={14} className="shrink-0 text-[var(--color-text-muted)]" />
        <span className="flex-1 truncate text-xs font-medium text-[var(--color-text)]">
          {summary}
        </span>
        {expanded ? (
          <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-[var(--color-border)] p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
              placeholder="Name"
              value={profile.name}
              onChange={(e) => persist({ ...profile, name: e.target.value }, true)}
            />
            <input
              className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
              placeholder="Current role"
              value={profile.role}
              onChange={(e) => persist({ ...profile, role: e.target.value }, true)}
            />
            <input
              className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
              placeholder="Location"
              value={profile.location}
              onChange={(e) => persist({ ...profile, location: e.target.value }, true)}
            />
            <input
              className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
              placeholder="Email"
              value={profile.email}
              onChange={(e) => persist({ ...profile, email: e.target.value }, true)}
            />
          </div>

          <TagListInput
            label="Target Roles"
            values={profile.targetRoles}
            onChange={(v) => persist({ ...profile, targetRoles: v })}
            placeholder="e.g. Backend Engineer"
          />
          <TagListInput
            label="Core Stack"
            values={profile.coreStack}
            onChange={(v) => persist({ ...profile, coreStack: v })}
            placeholder="e.g. TypeScript"
          />
          <TagListInput
            label="Differentiators"
            values={profile.differentiators}
            onChange={(v) => persist({ ...profile, differentiators: v })}
            placeholder="What sets you apart"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
              placeholder="Location preference"
              value={profile.searchParameters.locationPreference}
              onChange={(e) =>
                persist(
                  {
                    ...profile,
                    searchParameters: { ...profile.searchParameters, locationPreference: e.target.value },
                  },
                  true,
                )
              }
            />
            <input
              className="rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none"
              placeholder="Seniority"
              value={profile.searchParameters.seniority}
              onChange={(e) =>
                persist(
                  { ...profile, searchParameters: { ...profile.searchParameters, seniority: e.target.value } },
                  true,
                )
              }
            />
          </div>
          <TagListInput
            label="Employment Type"
            values={profile.searchParameters.employmentType}
            onChange={(v) =>
              persist({ ...profile, searchParameters: { ...profile.searchParameters, employmentType: v } })
            }
            placeholder="e.g. full-time"
          />
          <TagListInput
            label="Platforms"
            values={profile.searchParameters.platforms}
            onChange={(v) =>
              persist({ ...profile, searchParameters: { ...profile.searchParameters, platforms: v } })
            }
            placeholder="e.g. LinkedIn"
          />
        </div>
      )}
    </div>
  );
}
