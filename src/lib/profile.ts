export interface Profile {
  name: string;
  role: string;
  location: string;
  email: string;
  targetRoles: string[];
  searchParameters: {
    locationPreference: string;
    employmentType: string[];
    seniority: string;
    platforms: string[];
  };
  coreStack: string[];
  differentiators: string[];
}

export function emptyProfile(): Profile {
  return {
    name: "",
    role: "",
    location: "",
    email: "",
    targetRoles: [],
    searchParameters: { locationPreference: "", employmentType: [], seniority: "", platforms: [] },
    coreStack: [],
    differentiators: [],
  };
}

/** Merges parsed JSON with the schema defaults so older/partial profile.json files don't crash the form. */
export function normalizeProfile(raw: unknown): Profile {
  const base = emptyProfile();
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Record<string, unknown>;
  return {
    name: typeof r.name === "string" ? r.name : base.name,
    role: typeof r.role === "string" ? r.role : base.role,
    location: typeof r.location === "string" ? r.location : base.location,
    email: typeof r.email === "string" ? r.email : base.email,
    targetRoles: Array.isArray(r.targetRoles) ? r.targetRoles : base.targetRoles,
    coreStack: Array.isArray(r.coreStack) ? r.coreStack : base.coreStack,
    differentiators: Array.isArray(r.differentiators) ? r.differentiators : base.differentiators,
    searchParameters: {
      ...base.searchParameters,
      ...(typeof r.searchParameters === "object" && r.searchParameters !== null
        ? (r.searchParameters as Record<string, unknown>)
        : {}),
    } as Profile["searchParameters"],
  };
}
