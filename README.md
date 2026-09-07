# Résumé Studio

A native macOS app for writing, tailoring, and shipping résumés and cover letters —
with an AI coding agent (like Claude Code) built directly into the editor via an
embedded terminal, so the agent can read, edit, and version-control your documents
in place.

**[Download for macOS](https://github.com/ochieng-stephen/resume-studio/releases/latest) ·
[resume-studio landing page](https://ochieng-stephen.github.io/resume-studio/)**

## What it does

- IDE-style workspace: file sidebar, multi-tab Markdown editor, live preview, and an
  embedded terminal, all in one resizable layout.
- A dual-mode file explorer — a guided "Simple" view for non-technical use, and an
  "Advanced" view for browsing the raw workspace like a normal file tree.
- A real terminal (PTY-backed) wired into the workspace, with one-click presets for
  launching an AI agent and a slash-command guide for structured tasks (search,
  tailor, cover letter, strategy, tracker).
- Markdown authoring with live preview and PDF/DOCX export, plus git-backed version
  history.

## Install

Grab the latest `.dmg` from the [Releases page](https://github.com/ochieng-stephen/resume-studio/releases/latest).

This build isn't notarized (no Apple Developer Program membership), so macOS
Gatekeeper will flag it as being from an unidentified developer. See the
[landing page](https://ochieng-stephen.github.io/resume-studio/) for the exact steps
to open it anyway — it's a couple of clicks, not a workaround you need to be
technical for.

Requires Apple Silicon (M1 or later). No Intel/universal build yet.

## Development

```bash
npm install
npm run tauri dev
```

Built with Tauri (Rust) + React/TypeScript/Vite.
