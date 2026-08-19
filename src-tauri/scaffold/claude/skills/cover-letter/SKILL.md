---
name: cover-letter
description: Generate a targeted cover letter for a specific role. Pass job URL, description, or company+role as argument.
argument-hint: "[job URL or company + role]"
allowed-tools: "WebFetch Read Write Edit"
---

# Cover Letter Generator

Create a targeted cover letter for a specific role.

## Available templates
!`ls templates/cover-letter-templates/ 2>/dev/null || echo "No templates yet — will use base guidelines"`

## Steps

1. **Get the job details**: If `$ARGUMENTS` is a URL, fetch the job description. If text, use
   directly. Extract company name, role, key requirements, company values/mission.

2. **Select template**: Choose the appropriate base template from
   `templates/cover-letter-templates/`:
   - `fulltime-swe.md` — for full-time software engineering roles
   - `contract-freelance.md` — for contract/freelance gigs
   - `ai-training.md` — for AI training, annotation, evaluation roles
   If no template fits, compose from guidelines.

3. **Draft the cover letter**:
   - Lead with what the candidate brings to this specific role (value-first)
   - Reference 1-2 specific projects that demonstrate relevant capability
   - Mirror the company's language and priorities
   - Show genuine understanding of what they're building/solving
   - Keep under 300 words unless the application requests more
   - Close with a clear, confident call to action

4. **Present for review**: Show the draft with annotations on key choices made.

5. **Save**: Write to `generated/cover-letters/{company}-{role}-{date}.md`

## Tone Guidelines
- Professional but human — not corporate boilerplate
- Confident without arrogance
- Specific, not generic — every sentence should be non-transferable to another company
- Show systems thinking and ownership mindset
