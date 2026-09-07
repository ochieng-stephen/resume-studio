# Résumé Studio

A native macOS and Windows app for writing, tailoring, and shipping résumés and cover
letters — with an AI coding agent (like Claude Code) built directly into the editor
via an embedded terminal, so the agent can read, edit, and version-control your
documents in place.

**[Download](https://github.com/ochieng-stephen/resume-studio/releases/latest) ·
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

Grab the latest build from the [Releases page](https://github.com/ochieng-stephen/resume-studio/releases/latest)
— `.dmg` for macOS (universal, runs natively on Apple Silicon and Intel), `.exe` for
Windows (x64).

Neither build is signed by a paid certificate (no Apple Developer Program membership,
no Windows code-signing cert), so macOS Gatekeeper and Windows SmartScreen will both
flag it as unrecognized on first launch. See the
[landing page](https://ochieng-stephen.github.io/resume-studio/) for the exact steps
to open it anyway on each platform — a couple of clicks, not something you need to be
technical for.

## Development

```bash
npm install
npm run tauri dev
```

Built with Tauri (Rust) + React/TypeScript/Vite.
