---
name: tailor
description: Tailor CV or resume for a specific job role. Pass a job URL, description, or company+role as argument.
argument-hint: "[job URL or role description]"
allowed-tools: "WebFetch Read Write Edit Bash"
---

# Tailor CV/Resume

Optimize the candidate's CV or resume for a specific role.

## Source CVs
!`ls -la my-current-cvs/ my-current-resumes/ 2>/dev/null`

## Steps

1. **Get the job details**: If `$ARGUMENTS` is a URL, fetch the job description. If it's text,
   use it directly. Extract:
   - Required skills and technologies
   - Preferred qualifications
   - Key responsibilities
   - Company context and values
   - Keywords that appear frequently

2. **Select base CV**: If multiple CV versions exist, choose based on which best matches the
   role's length/depth expectations.

3. **Analyze gaps and strengths**:
   - Which of the candidate's skills directly match requirements?
   - Which transferable skills map to their needs?
   - What keywords from the JD should be mirrored?
   - What should be reordered to front-load relevance?

4. **Generate tailored version**:
   - Follow CV Tailoring Guidelines from CLAUDE.md
   - Mirror job description language naturally (not keyword stuffing)
   - Reorder sections to prioritize what the role values most
   - Quantify achievements where possible

5. **Present changes**: Show a summary of what was changed and why, with before/after for
   significant edits.

6. **Save**: Write to `generated/tailored-cvs/{company}-{role}-{date}.md` or
   `generated/tailored-resumes/{company}-{role}-{date}.md`

7. **Offer next steps**: Suggest `/cover-letter` if one would help this application.

## Rules
- Never fabricate experience or skills
- Only reframe and emphasize what genuinely exists
- Log keyword choices to `strategy/keyword-performance.md` for tracking
