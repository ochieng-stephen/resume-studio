---
name: search
description: Search for matching job opportunities across platforms. Pass optional filters as arguments (e.g., /search backend python, /search AI training roles, /search react senior remote).
argument-hint: "[role keywords or filters]"
allowed-tools: "WebSearch WebFetch Bash Read Write Edit"
---

# Job Search

Search for job opportunities matching the candidate's profile and the provided filters.

## Current profile
!`cat profile.json 2>/dev/null || echo "No profile.json yet — ask the user for target roles and preferences"`

## Steps

1. **Parse filters**: Extract role type, keywords, platform preferences, or other constraints
   from `$ARGUMENTS`. If no arguments, use default target roles from `profile.json`.

2. **Search across platforms**: Use web search to find current openings on:
   - LinkedIn Jobs
   - Remote job boards (RemoteOK, We Work Remotely, Arc.dev, Wellfound, Turing)
   - Company career pages (if specified)
   - AI training platforms (Remotasks, Scale AI, Outlier, Alignerr) — if searching AI roles
   - Any platform relevant to the search terms

3. **Evaluate each role** against the candidate's profile:
   - Skills match (core stack overlap)
   - Seniority fit
   - Remote compatibility
   - Rate the match: Strong / Good / Moderate / Weak

4. **Present results** using the Job Listing Format from the output style. Sort by match strength.

5. **Recommend next steps**: Which roles to apply to, which to skip, which need more info.

6. **If the user approves roles**: Offer to proceed with `/tailor` for CV optimization or
   `/cover-letter` for cover letter generation.

## Important
- Search for currently open positions — filter out old/expired listings when possible
- Prefer roles that explicitly mention remote or have a global hiring policy
- Note salary ranges when visible
- Flag any roles that are ambiguously scoped or look like scams
- Check `strategy/platform-notes.md` for platform-specific tips before searching
