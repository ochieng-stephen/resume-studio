---
name: tracker
description: View and manage the application tracker. Use with no args for dashboard, or pass a command (e.g., /tracker update Stripe interview, /tracker add, /tracker stats).
argument-hint: "[view | add | update | stats | export]"
allowed-tools: "Read Write Edit Bash"
---

# Application Tracker

Manage and view the application tracking system.

## Current state
!`cat tracker/applications.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"applications\"])} applications tracked')" 2>/dev/null || echo "No applications tracked yet"`

## Commands

### No arguments or "view"
Display the full dashboard from `tracker/dashboard.md`. If stale, regenerate from
`tracker/applications.json`.

### "add"
Prompt for or extract application details and add a new entry to `tracker/applications.json`:
- company (required)
- role (required)
- platform (where found/applied)
- dateApplied (ISO date)
- cvVersion (which tailored CV was used)
- coverLetter (boolean)
- status: "applied"
- keywords (array of key terms used in application)
- notes (any relevant context)
Then regenerate `tracker/dashboard.md`.

### "update [company] [status]"
Update the status of an existing application. Valid statuses:
`applied` | `viewed` | `interview` | `rejected` | `offered` | `accepted` | `ghosted`
Add responseDate when status changes from "applied". Then regenerate dashboard.

### "stats"
Analyze tracker data and report:
- Total applications, by status breakdown
- Response rate (non-ghosted responses / total)
- Average time to response
- Most successful platforms
- Most successful keywords
- CV version performance comparison

### "export"
Export a clean summary to markdown for sharing or reference.

## After every update
- Regenerate `tracker/dashboard.md` from the JSON data
- If enough data has accumulated (10+ applications), suggest running `/strategy`
