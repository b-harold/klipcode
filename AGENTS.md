# KlipCode | Project Specification & Agent Instructions

KlipCode is a local-first code snippet manager. Snippets and folders are persisted immediately to IndexedDB (Dexie) and optionally synced to Supabase (PostgreSQL + GitHub Auth). The app works fully offline/anonymously; Supabase is opt-in.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4 (dark mode by default)
- **Editor:** CodeMirror 6 (`@uiw/react-codemirror`)
- **Database:** Supabase (PostgreSQL + GitHub Auth)
- **Local Persistence:** IndexedDB via Dexie.js
- **Sync/State:** TanStack Query (React Query)
- **Deployment:** Cloudflare Workers via OpenNext
- **Package Manager:** pnpm

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

Tests run in the `node` environment with `fake-indexeddb/auto`; Dexie code is testable without a browser. Path alias `@/*` → `src/*`.

## Architecture

### Local-first data model + sync

The source of truth on each device is IndexedDB. `FolderRecord`/`SnippetRecord` (`src/lib/types.ts`) carry sync bookkeeping fields — understand these before touching sync logic:

- `ownerId: string | null` — `null` means anonymous/seeded (shared, never synced or deleted by reconciliation); a user id means owned by that account.
- `dirty: boolean` — has unsynced local changes; cleared only after a successful upload.
- `lastSyncedAt: string | null` — `null` means never uploaded to the cloud (a placeholder); set once a cloud row exists.
- `updatedAt` — ISO string, used both for ordering and as an optimistic-concurrency guard.

`src/lib/db.ts` owns the Dexie schema (currently **version 4** — add a new `this.version(n).upgrade(...)` block for any schema/field migration, never mutate existing ones).

`src/lib/sync.ts` is the sync engine:
- `syncDirtyWorkspace` uploads dirty records (folders parent-before-child by depth; snippets oldest-first). After each upsert it re-reads the record and only clears `dirty` if `updatedAt` still matches — so a concurrent edit during upload is not lost.
- A still-empty snippet never uploaded (`!code.trim() && lastSyncedAt === null`) is *settled locally* instead of creating a cloud row. Once uploaded, an empty body IS uploaded.
- `fetchCloudWorkspace` pulls cloud rows, skipping dirty newer local records, then calls `reconcileDeletions` — a clean owned record with `lastSyncedAt` absent from the cloud was deleted on another device and is removed locally.
- `reconcileWorkspace` = push then pull; used on sign-in/session migration.

Preserve the invariants in the inline comments — the `dirty` / `lastSyncedAt === null` / `ownerId === null` distinctions are load-bearing.

### React composition

`KlipCodeApp.tsx` (the client root) wires together four hooks:

- `useAuth` — Supabase session, GitHub OAuth, and session migration (runs `reconcileWorkspace` on login so anonymous local data is claimed by the account).
- `useCloudSync` — debounced background sync loop and per-snippet `SyncStatus` (`idle`→`editing`→`saving`→`saved-cloud`/`saved-local`/`error`). Stops auto-retry after `MAX_SYNC_ERRORS` (5) consecutive failures.
- `useWorkspaceMutations` — all create/update/delete/move/pin/paste actions; writes IndexedDB then schedules a cloud sync.
- `useResponsiveSidebar` — sidebar open/mobile state.

**No Save button:** edits debounce at `DEBOUNCE_MS` (800ms, `src/lib/constants/timing.ts`) to local storage, then a second debounce pushes to the cloud. Navigation state lives in URL search params (`?snippet=` / `?folder=`).

### Routing & i18n

App Router under `src/app/[locale]/` with `[locale]` ∈ `{en, es}`, but **English is served prefix-less**: canonical URLs are `/` + `/app` (English) and `/es` + `/es/app` (Spanish). `src/middleware.ts` rewrites clean paths internally to `/en/*`, permanently (308) redirects legacy `/en/*` URLs, and lets `/es/*` through. (`proxy.ts` is forced onto Node.js runtime which OpenNext/Cloudflare doesn't support — only Edge `middleware.ts` deploys.)

Build locale-aware URLs with `localeHref`/`localePrefix` from `src/lib/locale.ts` — never hardcode `/en`. All user-facing text must come from `src/i18n/en.ts` / `src/i18n/es.ts` via `getDictionary(locale)` — never hardcode strings. Both locale files must stay structurally identical.

### Supabase

`getSupabaseBrowserClient()` returns `null` when env vars are unset; every sync/auth path must tolerate null and degrade to local-only. The DB schema and RLS policies live in `db-structure.sql` (cloud columns are snake_case; `src/lib/sync.ts` maps to/from camelCase local records).

### Cloud encryption

Sensitive fields (`snippets.title`, `snippets.code`, `folders.name`) are encrypted client-side at the sync boundary in `src/lib/sync.ts` — **IndexedDB stays plaintext**; only what crosses to Supabase is ciphertext. Each row's `crypto_version` says how it is encoded: `0` = plaintext (legacy rows, or encryption unavailable), `1` = AES-256-GCM (`src/lib/crypto.ts`). Rows migrate progressively: every upload writes the current version, so records re-encrypt when created or edited; readers must keep handling version `0` forever. `language` is intentionally plaintext (indexed cloud-side, not sensitive).

Keys: a random per-user DEK encrypts the data. It lives in `public.user_keys` wrapped by the master key (KEK), which exists only as the `ENCRYPTION_MASTER_KEY` Worker secret (base64, 32 bytes; `wrangler secret put` in prod, `.env` for `pnpm dev` / `.dev.vars` for `pnpm preview` locally — see `.env.example`). The client fetches its unwrapped DEK from `/api/crypto/dek` via `src/lib/encryptionKey.ts` and holds it in memory only. Key-availability contract: a `CryptoKey` → encrypt; `null` → encryption unconfigured, sync in plaintext; a thrown error → transient, fail the sync so the retry loop handles it — **never fall back to plaintext on a transient error**. Fetched rows that can't be decoded (unknown version, missing key, failed decryption) are skipped, never written locally as garbage and never treated as remote deletions.

## Style Guide

- **Aesthetics:** Minimalist, professional, dark theme. Inspired by Vercel/Linear.
- **Palette:** Background `#0a0a0a`, borders `#262626` (or `white/10`), accents in pure white or soft gray.
- **Fonts:** Cascadia Code (with ligatures) for code blocks.
- **Code theme:** VS Code Dark.
- **Components:** Custom UI primitives only (`src/ui/`) — avoid native HTML selects/menus.
- **Next.js 16:** APIs differ from older versions. When unsure, consult `node_modules/next/dist/docs/`.
