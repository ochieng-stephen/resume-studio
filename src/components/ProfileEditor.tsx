import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { UserCircleIcon } from "@phosphor-icons/react";
import { Profile, emptyProfile, normalizeProfile } from "../lib/profile";
import { DrawerPull } from "./DrawerPull";
import { TagListInput } from "./TagListInput";
import { Field } from "./FormField";

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
    <div className="rounded-md border border-[var(--color-cabinet-border)] bg-[var(--color-cabinet)] shadow-[var(--shadow-cabinet)]">
      <button
        className="group flex w-full items-center gap-2 px-3 py-2.5 text-left transition-transform active:scale-[0.99]"
        onClick={() => setExpanded((v) => !v)}
      >
        <UserCircleIcon size={14} className="shrink-0 text-[var(--icon-sage)]" />
        {/* Deliberately NOT the uppercase/tracking-wide label style the other sidebar section
            headers use (Slash Commands, Portfolio, etc.) — this shows the user's own name, and
            shouting someone's name in small caps reads cold, not affirming. */}
        <span className="flex-1 truncate text-xs font-medium text-[var(--color-text)]">
          {summary}
        </span>
        <DrawerPull expanded={expanded} />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
        <div className="flex flex-col gap-3.5 border-t border-[var(--color-cabinet-border)] p-3">
          <div className="grid grid-cols-2 gap-x-2 gap-y-3">
            <Field
              label="Name"
              placeholder="e.g. Jordan Rivera"
              value={profile.name}
              onChange={(e) => persist({ ...profile, name: e.target.value }, true)}
            />
            <Field
              label="Current role"
              placeholder="e.g. Senior Product Designer"
              value={profile.role}
              onChange={(e) => persist({ ...profile, role: e.target.value }, true)}
            />
            <Field
              label="Location"
              placeholder="e.g. Austin, TX"
              value={profile.location}
              onChange={(e) => persist({ ...profile, location: e.target.value }, true)}
            />
            <Field
              label="Email"
              placeholder="e.g. you@example.com"
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

          <div className="grid grid-cols-2 gap-x-2 gap-y-3">
            <Field
              label="Location preference"
              placeholder="e.g. Remote or Hybrid (NYC)"
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
            <Field
              label="Seniority"
              placeholder="e.g. Senior / Staff"
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
        </div>
      </div>
    </div>
  );
}
