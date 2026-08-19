---
name: strategy
description: Review job search performance, analyze patterns, update strategy and configuration. The self-improvement engine.
argument-hint: "[review | update | keywords | platforms]"
allowed-tools: "Read Write Edit Bash WebSearch"
---

# Strategy Review & Self-Improvement

Analyze accumulated data and improve the job search system.

## Current data
!`cat tracker/applications.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); apps=d['applications']; print(f'Applications: {len(apps)}'); statuses={s: len([a for a in apps if a[\"status\"]==s]) for s in set(a['status'] for a in apps)}; print(f'Statuses: {statuses}')" 2>/dev/null || echo "No application data yet"`

## Commands

### "review" (default)
Full strategy review:
1. Read `tracker/applications.json` — analyze response rates, timelines, patterns
2. Read `strategy/keyword-performance.md` — which keywords correlate with callbacks
3. Read `strategy/platform-notes.md` — which platforms yield best results
4. Read `strategy/learnings.md` — review accumulated insights
5. Cross-reference: What's working? What's not? What should change?
6. Present findings with data-backed recommendations
7. Propose specific updates to CLAUDE.md search parameters, target roles, or guidelines

### "update"
Apply approved strategy changes:
- Update CLAUDE.md sections (target roles, search parameters, guidelines)
- Update `profile.json` if profile emphasis should shift
- Update templates if cover letter approach should change
- Log the update to `strategy/learnings.md` with date and rationale

### "keywords"
Deep-dive into keyword performance:
- Which technical keywords appear in successful applications?
- Which soft skills/phrases correlate with responses?
- Current market trends — web search for in-demand skills in target roles
- Recommend keyword adjustments for CVs and cover letters

### "platforms"
Platform effectiveness review:
- Response rates by platform
- Time-to-response by platform
- Quality of roles found per platform
- Recommend platform priority adjustments

## Self-Improvement Actions
When data supports it, this skill should:
1. **Update CLAUDE.md** — modify search parameters, add/remove target roles, adjust guidelines
2. **Update profile.json** — save new strategic insights
3. **Update templates** — refine cover letter templates based on what converts
4. **Update keyword tracking** — add newly discovered high-value keywords
5. **Flag skill updates** — if a skill's workflow needs adjustment, recommend the change

## When to run
- After every 10 new applications
- After receiving 3+ responses (positive or negative)
- When the user asks for a strategy check
- Monthly at minimum if actively searching
