# Changelog

All notable changes to Résumé Studio are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-09-25

### Added
- **Portfolio** — a private, structured record of your real projects and outcomes
  (`portfolio/index.json`) that the built-in AI agent draws on when tailoring CVs and cover
  letters, so documents stay relevant *and* truthful.
- **Build from your CV** — one-click "Build from my CV" (and `/portfolio import`) extracts
  structured portfolio entries from your existing résumé for you to confirm.
- **Role matching** — captured jobs show which of your portfolio projects best match the role.
- **Confidential entries** — mark sensitive work so the agent uses the outcome without exposing
  the client or links.
- **`/portfolio` command** — `import · add · list · match · sync`, plus a Portfolio panel in the
  Simple view.

### Changed
- The `tailor`, `cover-letter`, and `strategy` agent skills are now portfolio-aware, surfacing
  real evidence and noting which entries they drew from.
- The Windows installer workflow now builds from the released tag (`ref: inputs.tag`) so the
  binary always matches the tagged commit.

### Notes
- Existing workspaces gain the `portfolio/` folder automatically on next open; edited files are
  never overwritten.

## [0.1.0] — 2026-09-07

### Added
- Initial release: IDE-style workspace with a file sidebar, multi-tab Markdown editor, live
  preview, and an embedded PTY terminal wired to an AI agent.
- Dual-mode file explorer (guided Simple view and raw Advanced view).
- Slash-command guide for structured tasks (search, tailor, cover letter, strategy, tracker).
- Markdown authoring with PDF/DOCX export and git-backed version history.
- Universal macOS build (Apple Silicon + Intel) and Windows (x64) installer.

[0.2.0]: https://github.com/ochieng-stephen/resume-studio/releases/tag/v0.2.0
[0.1.0]: https://github.com/ochieng-stephen/resume-studio/releases/tag/v0.1.0
