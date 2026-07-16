---
name: verify
description: Build/launch/drive recipe to verify KlipCode changes in the running app (headless browser against the dev server).
---

# Verifying KlipCode in the running app

## Dev server

- The user often already has `pnpm dev` running on port 3000 — check with
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/app` before
  starting your own (a second `next dev` in the same dir exits with
  "Another next dev server is already running"). HMR picks up edits, so the
  running server is fine to test against.
- The watcher can miss an edit (served CSS one version behind). `touch` is
  NOT enough to nudge it — append/remove a real byte and watch for a fresh
  `✓ Compiled` line in `.next/dev/logs/next-development.log` before
  re-checking in the browser.

## Headless browser

- No Playwright in the project, but browsers are cached at
  `~/.cache/ms-playwright/` (chromium_headless_shell-1228 as of 2026-07).
  Install `playwright-core` in the scratchpad and launch with
  `executablePath` pointing at the cached `chrome-headless-shell`.
- The system is missing `libnspr4.so` / `libnss3.so` / `libnssutil3.so`.
  Fix without root: download `libnspr4` + `libnss3` .deb from
  `deb.debian.org` (Debian 12 ones are xz, Ubuntu ones are zstd and there is
  no `zstd` binary), extract with `ar x` + `tar -xf data.tar.xz`, then run
  node with `LD_LIBRARY_PATH=<dir>/usr/lib/x86_64-linux-gnu`.
- The headless profile is ephemeral → fresh IndexedDB, so the app self-seeds
  the welcome workspace; the user's real data is never touched.

## Driving the app

- Entry: `http://localhost:3000/app` (English is prefix-less). Wait for
  `networkidle`.
- The seeded markdown snippet shows as **`klipcode.md`** in the home cards
  (not "klipcode"); clicking it navigates to `?snippet=<id>`.
- Snippets open in **source view** (`.cm-editor`, CodeMirror). To reach the
  rich Markdown view (TipTap, `.klipcode-md`), click the button with
  aria-label **"Rich text view"** (`editorCopy.previewMarkdown` in i18n).
- Typing into the TipTap editor works with normal `keyboard.type` after
  clicking into a node; edits autosave (watch for the "Saved locally" toast).
