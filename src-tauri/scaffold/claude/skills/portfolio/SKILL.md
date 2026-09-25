---
name: portfolio
description: Build and maintain the candidate's private evidence corpus (portfolio/index.json) — the source of truth of real projects, outcomes, and work samples that career docs draw from. Subcommands: import, add, list, match, sync.
argument-hint: "[import | add | list | match [job] | sync]"
allowed-tools: "Read Write Edit Glob Grep Bash WebFetch"
---

# Portfolio

Maintain `portfolio/index.json` — the candidate's structured, private record of real work.
Every entry is *evidence* that tailoring and cover letters draw from, so the résumé can be
relevant AND truthful. **Never invent projects, skills, or outcomes** — only capture, restructure,
and confirm what genuinely exists.

## Current portfolio
!`cat portfolio/index.json 2>/dev/null || echo "No portfolio yet."`

## Source CVs (for import)
!`ls -la my-current-cvs/ my-current-resumes/ 2>/dev/null`

## Entry schema
Each object in `items[]`:
- `id` — stable slug (e.g. `checkout-redesign`); used to reference case studies/artifacts.
- `title` — short, ideally outcome-led ("Checkout redesign, -22% cart abandonment").
- `role`, `org` — the candidate's role and the employer/client.
- `summary` — 1-3 sentences of what they did.
- `skills`, `keywords` — arrays used to match entries against job descriptions.
- `outcomes` — quantified results ("-22% abandonment", "+$1.4M revenue").
- `artifacts` — portfolio-relative paths (`case-studies/…`, `artifacts/…`).
- `links` — live URLs (repo, demo, article).
- `date` — e.g. "2024-03".
- `confidential` — if true, use outcomes/skills but NEVER expose `org` or `links` in generated docs.

Also `profileLinks[]` at the top level: header links (GitHub, personal site) for career docs.

## Subcommands (from `$ARGUMENTS`)

### `import` (default when portfolio is empty)
Bootstrap the portfolio from the candidate's existing CVs — the fastest path to value.
1. Read every file in `my-current-cvs/` and `my-current-resumes/`.
2. Extract each distinct project/role/accomplishment into a **draft** entry, inferring
   `skills`/`keywords` from the text and pulling any quantified `outcomes`.
3. Present the drafts as a numbered list and ask the user to confirm, edit, or drop each one,
   and to add metrics where missing. Only reframe what the CV already states — never fabricate.
4. On approval, write confirmed entries to `portfolio/index.json`.

### `add`
Capture one new item. If `$ARGUMENTS` holds a URL, `WebFetch` it and summarize into a draft.
Otherwise interview the user, always asking **"what changed because of this work?"** to push
toward a quantified outcome. Confirm the draft, then append to `items[]` with a unique `id`.

### `list`
Print a compact table of current items: title, role, top skills, headline outcome, confidential flag.

### `match [job]`
Rank items by relevance to a job. If `$ARGUMENTS` is a URL, fetch it; else treat it as the JD text
(fall back to the most recent capture in the workspace if empty). Score each item by overlap of its
`skills`/`keywords` with the JD's language, and present the top matches with a one-line "why it fits".
This is what `/tailor` and `/cover-letter` consult to decide which evidence to surface.

### `sync`
Reconcile the index with the folder. List files in `portfolio/case-studies/` and
`portfolio/artifacts/` (`ls -R portfolio/`), flag any not referenced by an item's `artifacts`,
and offer to create entries for the orphans. Also flag entries whose referenced files are missing.

## Rules
- Never fabricate or inflate. Draft, then get explicit user confirmation before writing.
- Keep `index.json` compact — summaries, not full text. Full write-ups live in `case-studies/`.
- Respect `confidential`: such entries feed relevance and outcomes but never leak org names or links.
- When an item is genuinely reusable prose, offer to also save it as a tagged snippet the user can
  drop into documents.
