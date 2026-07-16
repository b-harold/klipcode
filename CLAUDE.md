# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Important: Next.js version

This project is on **Next.js 16 + React 19 + Tailwind v4**, which has breaking changes vs. older versions in your training data. Before writing non-trivial Next-specific code (routing, metadata, `params`, server/client boundaries, etc.), consult `node_modules/next/dist/docs/` and heed deprecation notices. See `AGENTS.md` for the project's product spec (auto-save behavior, sync states, style guide).

## Commands

Package manager is **pnpm** (committed lockfile). Node 20+.

```bash
pnpm dev          # next dev (Turbopack)
pnpm build        # next build (React Compiler enabled only in production — see next.config.ts)
pnpm lint         # eslint (uses eslint-config-next core-web-vitals + typescript)
pnpm test         # vitest run
pnpm test:watch   # vitest watch mode
```

Run a single test file: `pnpm vitest run src/__tests__/db.test.ts`. Vitest is configured for the `node` environment with `fake-indexeddb/auto` as a setup file (so Dexie code is testable without jsdom).

A husky `pre-commit` hook runs `pnpm test` — fix failing tests rather than skipping the hook.

Cloudflare deploy via OpenNext: `pnpm preview`, `pnpm deploy`, `pnpm upload`. `pnpm cf-typegen` regenerates `cloudflare-env.d.ts`. Worker config is in `wrangler.jsonc`.

Path alias: `@/*` → `src/*`.

## Architecture

KlipCode is a **local-first** snippet manager. Dexie/IndexedDB is the source of truth on the client; Supabase is an optional sync target. The whole app is functional with `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` unset — guard cloud calls with `isSupabaseConfigured()` from `src/lib/supabase.ts`.

### Routing & i18n

- Locale-prefixed App Router: every user-facing route lives under `src/app/[locale]/...` for `en` and `es`.
- `src/middleware.ts` redirects unprefixed paths to the user's preferred locale (its matcher excludes `api`, `_next`, `landing`, and any path with a file extension — keep new asset paths in mind).
- All user-visible strings must come from `getDictionary(locale)` in `src/i18n/`. Never hardcode UI text — add keys to both `en.ts` and `es.ts` (`es.ts` is checked with `satisfies Dictionary`).

### Data model & local DB (`src/lib/db.ts`)

- Dexie schema is versioned (currently **v6**) with explicit `upgrade` callbacks. **When adding/changing indexed fields, bump the version and write a migration** — do not edit existing version blocks. Note the fork-specific version line: v5 added the `notes` store (this fork), v6 folded in upstream's `tombstones` store and soft-delete `deletedAt` field.
- Records carry `ownerId` (null = guest), `dirty` (needs cloud upsert), and `lastSyncedAt`. `readWorkspace(currentUserId)` returns records where `ownerId === currentUserId || ownerId === null` — guest-created records remain visible to a signed-in user, which is what enables the post-login migration described in `AGENTS.md`.
- Folders/snippets soft-delete into a device-local trash (`deletedAt`); **notes hard-delete** and never appear in the trash.

### Sync engine (`src/lib/sync.ts` + `src/hooks/useCloudSync.ts`)

- `syncDirtyWorkspace(userId)` upserts dirty folders (batched by depth so parents land first), then snippets, then notes. `fetchCloudWorkspace` pulls remote rows and skips locally-dirty records that have a newer `updatedAt`. `reconcileWorkspace` claims anonymous records, pushes, flushes tombstones, then pulls.
- Folder names and snippet titles/code are **encrypted client-side** before upload when a workspace key is available (`src/lib/crypto.ts`, `crypto_version` column). Notes currently sync **plaintext** (no `crypto_version` on the notes table) — extending encryption to notes is a pending follow-up.
- Permanent deletions queue `tombstones` rows that retry the cloud delete; note deletions call Supabase directly (best-effort).
- `useCloudSync` debounces cloud writes by `DEBOUNCE_MS` (800 ms, `src/lib/constants/timing.ts`) and surfaces per-record `SyncStatus` (`editing` → `saving` → `saved-cloud`/`saved-local`/`error`) used by the editors' status indicators. There is no explicit Save button.
- Editor mutations (`useWorkspaceMutations`) write to Dexie immediately, then call `scheduleCloudSync()` if signed-in or `settleLocally()` otherwise.

### State & wiring

- `KlipCodeApp.tsx` is the orchestrator: `useAuth`, `useCloudSync`, and `useWorkspaceMutations` are composed there with shared `refreshWorkspace` and status setters.
- TanStack Query owns the workspace cache under key `["workspace", userId ?? "guest"]` (plus `["trash", ...]`); mutations invalidate via predicate. Default `staleTime: 0`, `refetchOnWindowFocus: false` (`src/components/AppProviders.tsx`).
- Selection (`?snippet=` / `?folder=` / `?note=`) is URL-driven via `useSearchParams` + shallow History-API pushes. Sentinels `SPACE_ROOT_ID` / `TRASH_ROOT_ID` from `src/lib/navigation.ts` represent the virtual root and trash views. `?note=` + `?snippet=` together open the note/snippet split pane.

### Database schema

`db-structure.sql` is the canonical Supabase schema (profiles, folders, snippets, notes) with RLS policies and a `validate_folder_hierarchy` trigger that prevents cycles. The `handle_new_user` trigger auto-creates a `profiles` row from `auth.users` on insert/update. Keep both Postgres and Dexie schemas in lockstep when extending records.

### Editor

CodeMirror 6 (`@uiw/react-codemirror`). The home view renders read-only previews — only the open snippet view spins up a full editor instance (performance requirement from `AGENTS.md`). Markdown snippets get a Notion-like WYSIWYG preview; notes (`src/components/NoteEditor/`) are markdown documents that can attach snippets inline via `[[snippet:id]]`.

## Pending future migrations

- **`middleware.ts` → `proxy.ts`**: Next.js 16 deprecates the `middleware` file convention in favor of `proxy`. `src/middleware.ts` still works but should be migrated before the convention is removed in a future major. See https://nextjs.org/docs/messages/middleware-to-proxy.
- **Notes encryption**: bring the notes table into the client-side encryption scheme (`crypto_version` column + encrypt title/markdown in `src/lib/sync.ts`).
