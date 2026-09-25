# Résumé Studio

A native macOS and Windows app for writing, tailoring, and shipping résumés and cover
letters. An embedded terminal in the editor runs your AI coding agent (like Claude Code,
Codex, or Aider), so it can read, edit, and version-control your documents in place.
You bring the agent; the app gives it a workspace built for the job.

**[Download](https://github.com/ochieng-stephen/resume-studio/releases/latest) ·
[resume-studio landing page](https://ochieng-stephen.github.io/resume-studio/)**

## What it does

- IDE-style workspace: file sidebar, multi-tab Markdown editor, live preview, and an
  embedded terminal, all in one resizable layout.
- A dual-mode file explorer with a guided "Simple" view for non-technical use, and an
  "Advanced" view for browsing the raw workspace like a normal file tree.
- A real terminal (PTY-backed) wired into the workspace, with one-click presets for
  launching your AI coding agent (Claude Code, Codex, Aider) and a slash-command guide
  for structured tasks (search, tailor, cover letter, portfolio, strategy, tracker).
- A private **portfolio**: a structured, tagged record of your real projects and
  outcomes that the agent draws on when tailoring, so career docs stay both relevant
  and truthful. Build it in one click from your existing CV (`/portfolio import`), and
  see which projects match a role the moment you capture a job.
- Markdown authoring with live preview and PDF/DOCX export, plus git-backed version
  history.

## Install

Grab the latest build from the [Releases page](https://github.com/ochieng-stephen/resume-studio/releases/latest):
the `.dmg` for macOS (universal, runs natively on Apple Silicon and Intel), or the `.exe` for
Windows (x64).

Neither build is signed by a paid certificate (no Apple Developer Program membership,
no Windows code-signing cert), so macOS Gatekeeper and Windows SmartScreen will both
flag it as unrecognized on first launch. See the
[landing page](https://ochieng-stephen.github.io/resume-studio/) for the exact steps
to open it anyway on each platform. It's a couple of clicks, not something you need to be
technical for.

## Development

```bash
npm install
npm run tauri dev
```

Built with Tauri (Rust) + React/TypeScript/Vite.
