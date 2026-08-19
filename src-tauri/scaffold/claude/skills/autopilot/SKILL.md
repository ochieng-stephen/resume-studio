---
name: autopilot
description: Fully autonomous job search mode. Searches, evaluates, tailors CVs, generates cover letters, and applies to matching roles. Pass optional scope/filters.
argument-hint: "[scope or filters, e.g., '5 backend roles' or 'AI training gigs']"
allowed-tools: "WebSearch WebFetch Read Write Edit Bash"
---

# Autopilot Mode

Fully autonomous job search, evaluation, tailoring, and application pipeline.

## Current profile
!`cat profile.json 2>/dev/null || echo "No profile.json yet — ask the user for target roles and preferences"`

## Pipeline

### Phase 1: Search
- Parse `$ARGUMENTS` for scope (number of roles, filters, platform preferences)
- Default: find 5-10 strong matches across all configured platforms
- Use web search across: LinkedIn, remote job boards, AI training platforms, company career pages
- Filter for: remote-friendly, matching seniority, matching tech stack

### Phase 2: Evaluate
- Score each role against the candidate's profile (Strong/Good/Moderate/Weak)
- Filter out Weak matches
- Rank remaining by: match strength, company quality, growth potential, compensation (when visible)
- Check `strategy/learnings.md` for patterns — avoid repeating unsuccessful strategies

### Phase 3: Tailor
For each role rated Good or Strong:
- Generate a tailored CV matching the job description keywords and priorities
- Save to `generated/tailored-cvs/`
- Generate a cover letter if the platform supports it or if it improves chances
- Save to `generated/cover-letters/`

### Phase 4: Apply
For each prepared application:
- Navigate to the application page via browser
- Fill in application details
- Upload/paste tailored CV and cover letter
- Submit the application
- Log to `tracker/applications.json`

### Phase 5: Report
After completing the pipeline, present a summary:
- Number of roles found vs. evaluated vs. applied
- Table of all applications submitted (company, role, match rating, platform)
- Any roles flagged for manual review (ambiguous fit, unusual requirements)
- Any issues encountered (application errors, missing fields, account requirements)

## Guardrails
- **Never apply to roles rated Weak** — skip and note why
- **Never fabricate credentials** in any application
- **Log everything** — every search, evaluation, tailoring decision, and application
- **Flag uncertainty** — if unsure about a role's legitimacy or fit, flag for human review
  rather than applying
- **Check tracker** before applying — don't duplicate applications to the same company+role
- **Respect rate limits** — don't spam platforms. Space out applications naturally.
- **Review strategy** — check `strategy/learnings.md` before starting for latest insights

## After completion
- Update `tracker/dashboard.md`
- Note any new platform insights in `strategy/platform-notes.md`
- If this batch reveals patterns, update `strategy/learnings.md`
