# KlipCode — Review TODO

Findings from a full project review (2026-06-11). Organized by area; file references point to the relevant code.

## 🐛 Bugs

- [x] **Cloud delete errors are silently lost.** `supabase.from(...).delete()` never throws — it returns `{ error }`, which is never checked, so the `try/catch` blocks in `src/hooks/useWorkspaceMutations.ts:152-159` and `:232-244` are dead code. A failed delete (offline, expired session) is dropped with no retry and no user feedback. _(Fixed: the `{ error }` result is now inspected and logged in both delete paths.)_
- [ ] **Deleted items can resurrect.** There are no tombstones: deletes are local-first plus a single best-effort cloud call. If the cloud delete fails, the next `fetchCloudWorkspace` re-downloads the row and the "deleted" item reappears. Consider a `deleted_at` column (soft delete) or a local pending-deletions queue that retries with the dirty sync.
- [x] **Deletes never propagate to other devices.** `fetchCloudWorkspace` (`src/lib/sync.ts:182`) only upserts incoming rows; it never removes local rows that no longer exist in the cloud. Device B keeps showing items deleted on device A forever. After fetching, reconcile: remove local non-dirty records (owned by the user) whose IDs are absent from the cloud result. _(Fixed: `reconcileDeletions` drops owned, clean, previously-synced records absent from the cloud — dirty edits, never-uploaded placeholders, and shared seed records are preserved.)_
- [x] **Clearing a snippet's code resurrects the old content.** In `src/lib/sync.ts:158-164`, snippets with empty code are skipped on upload but still marked `dirty: false`. The subsequent `fetchCloudWorkspace` then pulls the stale cloud row and overwrites the local record — the user's intentional emptying is undone. Either upload empty code too, or keep the record dirty/excluded from pull overwrite. _(Fixed: an emptied snippet that was previously synced now uploads its empty body; only brand-new never-synced placeholders are settled locally without an upload.)_
- [x] **Paste does nothing for copied folders.** `handlePaste` (`src/hooks/useWorkspaceMutations.ts:302-307`) only handles `cut` for folders, but the UI offers "Copy" on folders (`onCopyFolder` in `KlipCodeApp.tsx`). Either implement deep folder duplication or hide the Copy action for folders. _(Fixed: `duplicateFolderTree` deep-copies the folder and all descendants with fresh ids.)_
- [ ] **Clock-based conflict resolution is fragile.** Local `updatedAt` comes from the client clock, while the `set_updated_at` trigger (`db-structure.sql:127-137`) overwrites `updated_at = now()` on every cloud update. The last-write-wins comparisons in `sync.ts:215,226` therefore compare client time vs. server time; clock skew between devices can silently drop newer edits. Pick one source of truth (e.g. drop the trigger for folders/snippets and trust client timestamps, or use server timestamps everywhere).
- [ ] **Seeded welcome content never syncs.** Seed records are created with `dirty: false, ownerId: null` (`src/lib/seed.ts`), so after sign-in they are visible (`matchesOwner` in `src/lib/db.ts:101`) but never migrated to the account — they exist on device A and not device B. Decide: migrate on login, or hide them once signed in.
- [x] **Deleting a snippet doesn't cancel its pending debounced update timer** (`updateTimersRef` in `useWorkspaceMutations.ts`). Harmless today (Dexie `update` on a missing key is a no-op) but it still triggers a pointless cloud sync; clear the timer in `handleDeleteSnippet`. _(Fixed: the pending timer is cleared at the top of `handleDeleteSnippet`.)_

## 🔒 Security

- [ ] **Add security headers.** `public/_headers` only sets caching. Add at minimum: `Content-Security-Policy` (script/style/connect-src limited to self + Supabase), `X-Frame-Options: DENY` (or `frame-ancestors`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- [ ] **Sign-out leaves personal data in IndexedDB.** Synced records (`ownerId = user.id`) stay on disk after `handleSignOut` (`src/hooks/useAuth.ts:112`). On a shared machine, anyone can read them via devtools. Offer/perform local-data wipe on sign-out (at least for owned records).
- [ ] **Supabase session is persisted in `localStorage`** (default with `persistSession: true`, `src/lib/supabase.ts`). Any future XSS gives token theft. Low priority (no XSS vectors found — no `dangerouslySetInnerHTML` anywhere, good), but worth knowing the trade-off.
- [ ] **Add `.claude/` to `.gitignore`** — it's currently untracked-but-visible in `git status` and easy to commit by accident.
- [x] RLS reviewed: policies in `db-structure.sql` are owner-scoped, `force row level security` is on, grants limited to `authenticated`. Solid — no action needed.

## ⚡ Performance

- [ ] **Batch the sync round trips.** `syncDirtyWorkspace` (`src/lib/sync.ts:144-177`) does one network upsert per record, awaited sequentially — N dirty snippets = N round trips. Supabase `upsert` accepts arrays; folders can be batched per depth level, snippets in one call. Same for `fetchCloudWorkspace`: replace the per-row `get` + `put` loops with one in-memory diff plus `bulkPut`.
- [ ] **Every debounced keystroke re-reads the whole database.** `handleUpdateSnippet` → `refreshWorkspace` → query invalidation → `readWorkspace` loads *all* folders and snippets with `toArray()`, filters and sorts in JS (`src/lib/db.ts:129`). Fine at 100 snippets, painful at 5,000. Options: update the React Query cache in place for single-record edits, and/or use the Dexie indexes (`ownerId`) with `where()` instead of full scans.
- [ ] **No backoff or reconnect handling for sync retries.** `useCloudSync` retries every 800 ms up to `MAX_SYNC_ERRORS`, then stops until the next edit. Add exponential backoff, and listen for the `online` event (and/or visibility change) to resume automatically when the connection returns.
- [ ] **Remote changes only arrive on login or after a local edit.** With `refetchOnWindowFocus: false` (`src/components/AppProviders.tsx:13`) there is no pull path for edits made on another device during a session. Consider Supabase Realtime subscriptions, or at least a periodic / on-focus `fetchCloudWorkspace`.

## 🧹 Best practices / code quality

- [ ] **`src/lib/sync.ts` has zero test coverage** — it's the most fragile logic in the app (conflict resolution, dirty flags, the bugs above). Add Vitest tests with a mocked Supabase client; the `fake-indexeddb` setup already exists.
- [ ] **Pre-commit only runs tests** (`.husky/pre-commit`). Add `pnpm lint` and `tsc --noEmit`. Also there is no CI — add a GitHub Actions workflow (lint + typecheck + test + build) so main stays green.
- [ ] **Remove `any` from Dexie migrations** v3/v4 (`src/lib/db.ts:51,60,79,87`) — type the legacy shape explicitly like v2 does.
- [ ] **`workspaceQuery` error state is never rendered.** If IndexedDB is unavailable (Safari private mode, storage pressure) the app silently shows an empty workspace. Render an error/empty-storage state in `KlipCodeApp.tsx`.
- [ ] **No `error.tsx` boundary** in the app router — an uncaught render error white-screens the app. Add a global (and `[locale]`-level) error boundary.
- [ ] **Surface cloud-delete failures to the user** instead of `console.error` (`useWorkspaceMutations.ts:157,242`) — reuse the `AccountToast` channel.
- [ ] **Locale dictionaries aren't type-checked against each other.** `en.ts`/`es.ts` — derive `Dictionary` from `typeof en` and type `es` as `Dictionary` so a missing key fails compilation (verify this is already the case in `src/i18n/index.ts`; the i18n test suggests partial coverage).

## ✨ Features

- [ ] **Global search** — the biggest gap for a snippet manager. Search titles + code (+ language filter), ideally a ⌘K command palette. The only search today is inside the language dropdown.
- [ ] **Keyboard shortcuts**: new snippet, copy current snippet, navigate list, close editor. The audience is developers; this is high-leverage.
- [ ] **Export / import** (JSON download/restore). Cheap insurance for users and a migration path; could later extend to GitHub Gist sync.
- [ ] **Tags** in addition to folders (a snippet often belongs to multiple topics).
- [ ] **Trash / undo for deletions.** Snippet deletes are instant, permanent, and pushed to the cloud. Pairs with the soft-delete/tombstone work in Bugs.
- [ ] **Public share links** for individual snippets (read-only page).
- [ ] **Snippet duplication** action ("Duplicate" in the context menu — copy/paste already half-implements this).
- [ ] **More OAuth providers** — GitHub-only today; Google would widen the audience.
- [ ] **PWA manifest + installability.** The app is already offline-capable thanks to IndexedDB; a manifest and basic service worker would make it installable.

## 🎨 UI / UX

- [ ] **No confirmation or undo when deleting a snippet** — folders get a `ConfirmDialog`, snippets vanish instantly. Add confirm or (better) toast-with-undo.
- [ ] **Card previews have no syntax highlighting** — they render dimmed plain text (`SnippetCard.tsx:326`). The spec in `AGENTS.md` calls for static highlighting on home previews; a lightweight highlighter (e.g. Lezer-based, reusing already-shipped CodeMirror parsers) would do it without loading full editors.
- [ ] **`SnippetCard` accessibility: nested interactive elements.** The card is an `<article role="button" tabIndex={0}>` containing real `<button>`s (`SnippetCard.tsx:224`). Interactive descendants inside a `role="button"` are invalid and confuse screen readers/keyboard users. Restructure (e.g. card title as the actionable element, actions outside the button semantics).
- [ ] **Language choice isn't persisted.** The middleware (`src/middleware.ts`) redirects `/` purely by `Accept-Language`; a user who manually switches to `/es` gets bounced back to English on their next visit. Set a `NEXT_LOCALE` cookie on manual switch and prefer it in the middleware.
- [ ] **Sync status is only visible per-snippet inside the editor** plus a transient toast. A small persistent indicator (cloud icon: synced / pending / error) in the sidebar footer would make "invisible sync" trustworthy, especially after the retry limit stops syncing silently.
- [ ] **Empty states**: home and folder views could guide new users better once the seed snippet is deleted (call-to-action to create a snippet / folder).
