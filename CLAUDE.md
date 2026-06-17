# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

KlipCode is a local-first code snippet manager. Snippets and folders are persisted immediately to IndexedDB (Dexie) and optionally synced to Supabase (PostgreSQL + GitHub Auth) when configured. The app works fully offline/anonymously; Supabase is opt-in.

Stack: Next.js 16 (App Router) · React 19 (React Compiler) · Tailwind CSS v4 · CodeMirror 6 · Dexie · TanStack Query · deployed to Cloudflare Workers via OpenNext.

## Commands

```bash
pnpm dev              # dev server (localhost:3000)
pnpm build            # next build
pnpm lint             # eslint
pnpm test             # vitest run (one-shot)
pnpm test:watch       # vitest watch
pnpm test src/__tests__/sync.test.ts   # run a single test file
pnpm preview          # opennextjs-cloudflare build + local Workers preview
pnpm deploy           # build + deploy to Cloudflare
pnpm cf-typegen       # regenerate cloudflare-env.d.ts from wrangler bindings
```

Use **pnpm** (not npm). Husky runs on commit via the `prepare` script.

Tests run in the `node` environment with `fake-indexeddb/auto` as a setup file, so Dexie code is testable without a browser. Path alias `@/*` → `src/*` (wired into vitest via `vite-tsconfig-paths`).

## Architecture

### Local-first data model + sync

The source of truth on each device is IndexedDB. `FolderRecord`/`SnippetRecord` (`src/lib/types.ts`) carry sync bookkeeping fields that drive the entire sync engine — understand these before touching sync logic:

- `ownerId: string | null` — `null` means anonymous/seeded (shared, never synced or deleted by reconciliation); a user id means owned by that account.
- `dirty: boolean` — has unsynced local changes; cleared only after a successful upload.
- `lastSyncedAt: string | null` — `null` means never uploaded to the cloud (a placeholder); set once a cloud row exists.
- `updatedAt` — ISO string, used both for ordering and as an optimistic-concurrency guard.

`src/lib/db.ts` owns the Dexie schema (currently **version 4** — add a new `this.version(n).upgrade(...)` block for any schema/field migration, never mutate existing ones) and read helpers (`readWorkspace`, `getDirtyWorkspace`) that filter by owner and sort pinned-first.

`src/lib/sync.ts` is the sync engine:
- `syncDirtyWorkspace` uploads dirty records (folders ordered parent-before-child by depth; snippets oldest-first). After each upsert it re-reads the record and only clears `dirty` if `updatedAt` still matches — so a concurrent edit during upload is not lost.
- A still-empty snippet that was never uploaded (`!code.trim() && lastSyncedAt === null`) is *settled locally* (clears `dirty`, keeps `lastSyncedAt: null`) instead of creating a cloud row. Once uploaded, an empty body becomes an intentional clear and IS uploaded.
- `fetchCloudWorkspace` pulls cloud rows, skipping any local record that is dirty and newer, then calls `reconcileDeletions` — a local owned record that is clean, has `lastSyncedAt`, and is now absent from the cloud was deleted on another device, so it is removed locally.
- `reconcileWorkspace` = push then pull; used on sign-in/session migration.

When editing sync code, preserve the invariants encoded in the inline comments of these two files — the `dirty` / `lastSyncedAt === null` / `ownerId === null` distinctions are load-bearing and were the subject of prior data-integrity fixes.

### React composition

`KlipCodeApp.tsx` (the client root) wires together four hooks; data flows down as props, callbacks flow up:

- `useAuth` — Supabase session, GitHub OAuth, and session migration (runs `reconcileWorkspace` on login so anonymous local data is claimed by the account).
- `useCloudSync` — debounced background sync loop and per-snippet `SyncStatus` (`idle`→`editing`→`saving`→`saved-cloud`/`saved-local`/`error`). Stops auto-retry after `MAX_SYNC_ERRORS` (5) consecutive failures.
- `useWorkspaceMutations` — all create/update/delete/move/pin/paste actions; writes IndexedDB then schedules a cloud sync.
- `useResponsiveSidebar` — sidebar open/mobile state.

There is **no Save button**: edits debounce at `DEBOUNCE_MS` (800ms, `src/lib/constants/timing.ts`) to local storage, then a second debounce pushes to the cloud. Navigation state (selected snippet/folder) lives in URL search params (`?snippet=` / `?folder=`), not React state.

### Routing & i18n

App Router under `src/app/[locale]/` with `[locale]` ∈ `{en, es}`, but **English (the default) is served prefix-less**: the canonical URLs are `/` + `/app` (English) and `/es` + `/es/app` (Spanish). `src/proxy.ts` (the Next.js 16 `proxy` convention, formerly `middleware`) makes this work: it rewrites clean paths internally to `/en/*` (URL stays clean), permanently (308) redirects legacy `/en/*` URLs to the clean form, and lets `/es/*` through. Locale preference is `NEXT_LOCALE` cookie → `Accept-Language` → `en`; a Spanish preference 307-redirects clean paths to `/es`. Build locale-aware URLs with `localeHref`/`localePrefix` from `src/lib/locale.ts` (never hardcode `/en`). The app shell is `/[locale]/app`; `/[locale]` is the marketing landing page.

All user-facing text must come from the i18n dictionaries (`src/i18n/en.ts`, `src/i18n/es.ts`) via `getDictionary(locale)` — never hardcode strings. The dictionary shape is the `Dictionary` type; both locale files must stay structurally identical (there's a test for this).

### Supabase

`getSupabaseBrowserClient()` returns `null` when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` are unset; every sync/auth path must tolerate that null and degrade to local-only. The DB schema and RLS policies live in `db-structure.sql` (cloud columns are snake_case; `src/lib/sync.ts` maps to/from the camelCase local records).

## Conventions

- Custom UI primitives only (`src/ui/`) — avoid native HTML selects/menus.
- Dark theme by default; palette and fonts (Cascadia Code for code, VS Code Dark theme) are documented in `AGENTS.md`.
- This is Next.js 16 — APIs differ from older versions. When unsure, consult `node_modules/next/dist/docs/` rather than assuming.
