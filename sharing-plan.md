# Sharing: folders & snippets across accounts (and publicly)

Goal: share folders and snippets with other accounts (read or read/write) and
publicly via links. This document captures the architectural constraints found
in the current codebase and the phased plan to get there without risking user
data.

## Why this is not a single feature

Sharing touches the three most delicate parts of the app at once:

1. **Encryption is per user.** Cloud rows are encrypted with the owner's DEK
   (`src/lib/sync.ts`, `src/app/api/crypto/dek/route.ts`). Another user cannot
   decrypt shared content. Encryption is server-mediated, not true E2E — the
   master key (KEK) lives as a Worker secret and the server can decrypt
   anything — so key sharing is solvable server-side, but handing out the
   owner's DEK would grant access to their *entire* workspace. Sharing
   requires per-resource keys (or server-mediated decryption for public
   read-only pages).

2. **The tree is strictly single-owner at the schema level.** The composite
   FKs `(owner_id, parent_id)` and `(owner_id, folder_id)` in
   `db-structure.sql` guarantee a snippet lives in a folder of the same owner.
   A collaborator creating a snippet inside a shared folder means inserting a
   row with `owner_id` = the folder owner, which conflicts with the
   `default auth.uid()` and every RLS policy (`with check (auth.uid() = owner_id)`).

3. **Sync is owner-keyed everywhere.** The pull does `eq("owner_id", userId)`,
   and `reconcileDeletions` interprets "my row absent from the cloud" as "was
   deleted on another device". Shared rows entering that flow naively would
   confuse losing access to a share with deletion (or vice versa). The
   conflict model is last-write-wins on client clocks — fine for one person
   across devices, silent-overwrite-prone between two people editing the same
   snippet.

Minor but real: `profiles` RLS only lets you read yourself (inviting by email
needs a `security definer` lookup RPC), and the pull downloads the full
workspace on every focus — no incremental cursor — so shared folders from
other users multiply that cost.

## Prerequisites

- **e2e sync suite (tier 2) green in CI.** Done (pending first CI run). Any
  RLS/sync change without that net is gambling with user data.
- **Key architecture decided before encrypting more content under the
  personal DEK.** Every snippet encrypted today with the per-user DEK must be
  re-encrypted when first shared. Nothing needs migrating now, but the
  per-resource key scheme below must be designed/agreed before Phase 2 so we
  don't build the crypto twice.

## Phase 1 — Public read-only snippet link (gist-style)

Highest product value for the least effort, and the best distribution lever:
every shared snippet is an indexable page linking back to KlipCode. Touches
the sync engine not at all.

- Table `public_links (id uuid pk, slug text unique, snippet_id, owner_id,
  created_at, revoked_at)`. Revoking = setting `revoked_at` (or deleting the
  row).
- Server-rendered page `/s/:slug` (locale-aware), plus OG image. Snippet
  content is decrypted server-side: a route handler/worker unwraps the owner's
  DEK with the master key — exactly the trust model `/api/crypto/dek` already
  uses — and renders the content. No key material reaches the anonymous
  viewer.
- UI: "Share" action on a snippet → creates link, copies URL; list + revoke in
  a small management surface.
- Later in this phase: public read-only *folders* (same mechanism, renders a
  tree).

Non-goals: no accounts involved, no writes, no sync integration.

## Phase 2 — Read-only sharing between accounts

- Table `shares (id, resource_type folder|snippet, resource_id, owner_id,
  grantee_id, role read|write, created_at)`. Invitations by email need a
  `security definer` RPC to look up a profile (profiles RLS stays own-only).
- RLS: additional `select` policies via a `security definer` membership
  function (never a direct subquery inside the policy — performance and
  recursion). Membership on a folder covers its whole subtree.
- **Keys:** introduce per-resource keys (`crypto_version: 2`): each shared
  folder/snippet subtree gets its own key, wrapped by the master key like the
  DEKs, stored in a `resource_keys` table. Generalize the key endpoint to
  `/api/crypto/keys?resource=…` authorizing by membership. Sharing an item
  re-encrypts its subtree from the personal DEK to the resource key.
- **Client/sync:** a second pull for "shared with me" resources, kept separate
  from the own-workspace pull, with its own reconciliation rules: losing a
  share removes local copies without touching tombstones; shared records are
  read-only in the UI (no dirty flag paths).

## Phase 3 — Read/write collaboration

The expensive one; highest data-loss risk. Scope deliberately excludes
realtime co-editing.

- **Schema:** keep `owner_id` = workspace owner; add `created_by`. Rework
  insert/update RLS policies to consult membership with role `write`. The
  composite FKs keep guaranteeing tree consistency because collaborators write
  rows with the folder owner's `owner_id` (so drop/replace the
  `default auth.uid()` assumption in policies, not the FKs).
- **Sync push:** extend `syncDirtyWorkspace` to upsert rows the user can write
  but doesn't own; `updated_at` stays client-authoritative. Document and
  accept last-write-wins between collaborators for v1 (whole-record), or gate
  simultaneous editing at the UX level.
- **Deletions:** tombstones and `reconcileDeletions` must distinguish "row
  deleted" from "access revoked" — the shares table is the source of truth
  for the latter.
- **Conflict UX:** at minimum, surface "this snippet changed remotely while
  you edited" instead of silently overwriting.

## Open questions

- Per-resource keys: one key per shared *root* (folder subtree shares one key)
  vs per item. Per-root is simpler and re-encrypts less; moving an item out of
  a shared folder must re-encrypt it back to the personal DEK.
- Incremental sync (an `updated_at` cursor) — not a blocker, but worth doing
  alongside Phase 2 when pull volume grows with shared content.
- Whether Phase 1 public pages should render markdown snippets as rich HTML
  (probably yes — that's the SEO surface).
