# Plan: Ship Résumé Studio as a downloadable app

Decision (confirmed): make the repo public; landing page + unsigned DMG + documented
Gatekeeper workaround (no paid notarization).

## Todo

- [x] Make the `resume-studio` GitHub repo public
- [x] Rewrite `README.md` (currently still the default Tauri template) with a real
      project description, screenshot, download link, and install instructions
- [x] Rebuild the app (`npx tauri build`) — the DMG on disk predates the resizable-panels
      commit, so it's stale
- [x] Tag a release (`v0.1.0`) and create a GitHub Release, uploading the DMG as a
      release asset (binary lives in Releases, not committed to git)
- [x] Build a static landing page (`docs/index.html`, no framework/build step) covering:
  - App name, one-line pitch, 3-4 feature highlights
  - Download button linking to the GitHub Release asset (stable `/releases/latest/download/...` URL)
  - "This app isn't notarized" section with the actual working workaround steps
    (System Settings → Privacy & Security → "Open Anyway", plus the right-click → Open
    fallback) so it doesn't just say "right-click Open" and leave people stuck
  - System requirement note: Apple Silicon only for now (build is aarch64-only;
    no universal/Intel binary in this pass — flagging as a scope cut, not an oversight)
- [x] Enable GitHub Pages on the repo (serve `main` branch `/docs` folder)
- [x] Verify end-to-end: repo is public, Pages site loads, download link resolves to
      the real DMG, and the documented workaround actually opens the app on a clean
      test (simulate the quarantine flag with `xattr -w com.apple.quarantine`)

## Review

**Repo**: made public — https://github.com/ochieng-stephen/resume-studio

**Unplanned but necessary fix**: while verifying the Gatekeeper workaround, found that
Tauri's default macOS bundling only ad-hoc-signs the raw executable (`Contents/MacOS/resume-studio`),
never the full `.app` bundle. That leaves no `_CodeSignature/CodeResources` seal over
`Info.plist`/`Resources`, so Gatekeeper rejected the app outright as "damaged" —
a harder failure than the expected "unidentified developer" warning, and one the
documented workaround can't fix (System Settings → Open Anyway only helps with the
unidentified-developer case, not a broken seal). Root-caused via `codesign --verify`
and fixed by setting `bundle.macOS.signingIdentity: "-"` in `tauri.conf.json`, which
makes `tauri-bundler` itself sign the whole bundle after packaging — verified with
`codesign --verify --deep` (now valid) and `spctl -a --type execute` before/after a
simulated quarantine flag (now rejects only for the expected unnotarized-developer
reason, not a broken seal). This is a permanent config fix, not a manual step to
remember on future builds.

**Release**: `v0.1.0` — https://github.com/ochieng-stephen/resume-studio/releases/tag/v0.1.0
DMG asset verified downloadable (302 → 200, correct content-length).

**Landing page**: https://ochieng-stephen.github.io/resume-studio/ — served from
`main` branch `/docs`, confirmed live (HTTP 200).

**Scope cuts, called out on the landing page itself**:
- Apple Silicon only (aarch64) — no Intel/universal build.
- Not notarized — one-time "Open Anyway" step required on first launch, documented
  on the landing page and in the README.
- No screenshot embedded yet — automated capture kept grabbing the wrong window
  (the app appears to open on a different Space than what's on-screen); skipped
  rather than keep burning time on capture automation. Easy to add later.

**Follow-up requested by user, not yet started**: a Windows build via GitHub Actions
(`windows-latest` runner → NSIS installer → attached to the same GitHub Release).
Not done in this pass.
