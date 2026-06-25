"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";

import { readTrash, readWorkspace } from "@/lib/db";
import { seedWelcomeContent } from "@/lib/seed";
import type { ClipboardEntry, SnippetRecord, WorkspaceSnapshot } from "@/lib/types";
import { getDictionary } from "@/i18n";
import { localeHref } from "@/lib/locale";
import { SPACE_ROOT_ID, TRASH_ROOT_ID } from "@/lib/navigation";
import { Tooltip } from "@/ui/Tooltip";
import { Spinner } from "@/ui/Spinner";

import { useResponsiveSidebar } from "@/hooks/useResponsiveSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useWorkspaceMutations } from "@/hooks/useWorkspaceMutations";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";

import { AccountToast } from "@/components/AccountToast/AccountToast";
import { CopyToast } from "@/components/CopyToast/CopyToast";
import { Aside } from "@/components/Aside/Aside";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { DragProvider } from "@/components/DragContext";
import { NewSnippet } from "@/components/NewSnippet/NewSnippet";
import { SnippetCards } from "@/components/SnippetCards/SnippetCards";
import { SnippetEditor } from "@/components/SnippetEditor/SnippetEditor";
import { FolderView } from "@/components/FolderView/FolderView";
import { TrashView } from "@/components/TrashView/TrashView";
import { SearchPalette } from "@/components/SearchPalette/SearchPalette";
import { ShortcutsDialog } from "@/components/ShortcutsDialog/ShortcutsDialog";

export default function KlipCodeApp({ locale }: { locale: "en" | "es" }) {
  const copy = getDictionary(locale);
  const queryClient = useQueryClient();
  const { sidebarOpen, setSidebarOpen, isMobile } = useResponsiveSidebar();

  function refreshWorkspace() {
    startTransition(() => {
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "workspace" || q.queryKey[0] === "trash",
      });
    });
  }

  /**
   * Patch a single snippet in the cached workspace instead of invalidating the
   * whole query. The hot path — every debounced keystroke — would otherwise
   * re-read and re-sort the entire IndexedDB workspace; this touches only the one
   * record. Order is left untouched until the next full refresh (re-sorting on
   * each keystroke would make cards jump around mid-edit anyway).
   */
  function patchSnippetInCache(id: string, changes: Partial<SnippetRecord>) {
    startTransition(() => {
      queryClient.setQueryData<WorkspaceSnapshot>(
        ["workspace", auth.user?.id ?? "guest"],
        (old) =>
          old
            ? {
                ...old,
                snippets: old.snippets.map((s) => (s.id === id ? { ...s, ...changes } : s)),
              }
            : old
      );
    });
  }

  // onReconciled callback references sync.setSnippetStatus — safe because it's
  // only invoked asynchronously from effects, well after all hooks initialise.
  const auth = useAuth({
    copy,
    refreshWorkspace,
    onReconciled: (ids) => {
      for (const id of ids) sync.setSnippetStatus(id, "saved-cloud");
    },
  });

  const sync = useCloudSync({
    user: auth.user,
    supabaseConfigured: auth.supabaseConfigured,
    copy,
    refreshWorkspace,
    setAccountMessage: auth.setAccountMessage,
  });

  /* ── URL-based navigation ─────────────────────────────────────────────── */

  const searchParams = useSearchParams();
  const base = localeHref(locale, "/app");

  /**
   * View switches (?snippet= / ?folder=) only change the URL search params, which
   * are client-side state — the /app route never reads searchParams on the server.
   * Using router.push for them runs a full Next navigation and refetches the RSC
   * payload on every click (a network round-trip in production — the lag). The
   * native History API updates the URL and stays in sync with useSearchParams
   * without any server work, so view switches are instant. This is Next.js'
   * documented "shallow routing on the client".
   */
  const navigate = useCallback((url: string) => {
    window.history.pushState(null, "", url);
  }, []);
  const navigateReplace = useCallback((url: string) => {
    window.history.replaceState(null, "", url);
  }, []);

  const selectedSnippetId = searchParams.get("snippet");
  const selectedFolderId = searchParams.get("folder");

  /** Used by useWorkspaceMutations which needs a (id: string | null) => void setter. */
  function setSelectedSnippetId(id: string | null) {
    if (id !== null) navigate(`${base}?snippet=${id}`);
    else navigate(base);
  }

  /* ── Clipboard state ──────────────────────────────────────────────────── */

  const [clipboard, setClipboard] = useState<ClipboardEntry | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [copyNonce, setCopyNonce] = useState(0);
  const [newSnippetFocusNonce, setNewSnippetFocusNonce] = useState(0);
  const [defaultNewSnippetFolderId, setDefaultNewSnippetFolderId] = useState<string | null>(null);
  const [pendingEmptyTrash, setPendingEmptyTrash] = useState(false);

  /* ── Workspace data ───────────────────────────────────────────────────── */

  const workspaceQuery = useQuery({
    queryKey: ["workspace", auth.user?.id ?? "guest"],
    queryFn: () => readWorkspace(auth.user?.id ?? null),
  });

  const folders = useMemo(() => workspaceQuery.data?.folders ?? [], [workspaceQuery.data]);
  const snippets = useMemo(() => workspaceQuery.data?.snippets ?? [], [workspaceQuery.data]);

  const trashQuery = useQuery({
    queryKey: ["trash", auth.user?.id ?? "guest"],
    queryFn: () => readTrash(auth.user?.id ?? null),
  });

  const trashedFolders = useMemo(() => trashQuery.data?.folders ?? [], [trashQuery.data]);
  const trashedSnippets = useMemo(() => trashQuery.data?.snippets ?? [], [trashQuery.data]);
  const trashCount = trashedFolders.length + trashedSnippets.length;

  // The trash reuses the `?folder=` param: the root sentinel, or a trashed folder
  // id when drilling into a deleted subtree.
  const isTrashView =
    !!selectedFolderId &&
    (selectedFolderId === TRASH_ROOT_ID || trashedFolders.some((f) => f.id === selectedFolderId));

  /* ── Mutations ────────────────────────────────────────────────────────── */

  const mutations = useWorkspaceMutations({
    copy,
    user: auth.user,
    supabaseConfigured: auth.supabaseConfigured,
    folders,
    snippets,
    clipboard,
    setClipboard,
    selectedSnippetId,
    setSelectedSnippetId,
    refreshWorkspace,
    patchSnippetInCache,
    scheduleCloudSync: sync.scheduleCloudSync,
    settleLocally: sync.settleLocally,
    setSnippetStatus: sync.setSnippetStatus,
  });

  /* ── First-visit seeding ────────────────────────────────────────────────── */

  useEffect(() => {
    if (!auth.authReady || auth.user) return;
    void seedWelcomeContent(copy).then((seeded) => {
      if (seeded) refreshWorkspace();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authReady, auth.user]);

  /* ── Derived state & side-effects ─────────────────────────────────────── */

  useEffect(() => {
    if (!workspaceQuery.isSuccess || !trashQuery.isSuccess) return;
    if (!selectedFolderId || selectedFolderId === SPACE_ROOT_ID || selectedFolderId === TRASH_ROOT_ID) return;
    const exists =
      folders.some((f) => f.id === selectedFolderId) || trashedFolders.some((f) => f.id === selectedFolderId);
    if (!exists) navigateReplace(base);
  }, [folders, trashedFolders, selectedFolderId, workspaceQuery.isSuccess, trashQuery.isSuccess, navigateReplace, base]);

  const selectedSnippet = selectedSnippetId
    ? (snippets.find((s) => s.id === selectedSnippetId) ??
        trashedSnippets.find((s) => s.id === selectedSnippetId) ??
        null)
    : null;
  // A trashed snippet opens read-only with restore / delete-permanently actions.
  const selectedSnippetTrashed = !!selectedSnippet?.deletedAt;

  function handleNewSnippetAt(folderId: string | null) {
    navigate(base);
    setDefaultNewSnippetFolderId(folderId);
  }

  /* ── Global keyboard shortcuts ────────────────────────────────────────── */

  useGlobalShortcuts({
    onToggleSearch: () => setSearchOpen((v) => !v),
    onToggleHelp: () => setHelpOpen((v) => !v),
    onNewSnippet: () => {
      handleNewSnippetAt(selectedFolderId ?? null);
      setNewSnippetFocusNonce((n) => n + 1);
    },
    onCopyCurrent: () => {
      if (!selectedSnippet) return;
      void navigator.clipboard
        .writeText(selectedSnippet.code)
        .then(() => setCopyNonce((n) => n + 1));
    },
    onToggleSidebar: () => setSidebarOpen((v) => !v),
    onCloseEditor: () => navigate(base),
    hasOpenSnippet: !!selectedSnippet,
    overlayOpen: searchOpen || helpOpen || pendingEmptyTrash,
  });

  const menuButton = !sidebarOpen ? (
    <Tooltip content={copy.aside.open} placement="bottom">
      <button
        type="button"
        aria-label={copy.aside.open}
        onClick={() => setSidebarOpen(true)}
        className="shrink-0 rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/6 hover:text-white/70"
      >
        <Menu size={16} />
      </button>
    </Tooltip>
  ) : null;

  /* ── Render ───────────────────────────────────────────────────────────── */

  // IndexedDB can be unavailable (Safari private mode, storage pressure). Surface
  // it instead of silently showing an empty workspace.
  if (workspaceQuery.isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-white/60">{copy.workspace.loadError}</p>
        <button
          type="button"
          onClick={() => void workspaceQuery.refetch()}
          className="rounded-md bg-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/15"
        >
          {copy.error.retry}
        </button>
      </div>
    );
  }

  // First read of the local workspace from IndexedDB. Show a spinner instead of a
  // blank shell so a cold start (or a large workspace) doesn't look frozen.
  if (workspaceQuery.isPending) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-white/45">
        <Spinner size={22} label={copy.workspace.loading} />
        <p className="text-sm">{copy.workspace.loading}</p>
      </div>
    );
  }

  return (
    <DragProvider
      folders={folders}
      onMoveFolder={mutations.handleMoveFolder}
      onMoveSnippet={mutations.handleMoveSnippet}
      onTrashItem={(item) => {
        if (item.type === "folder") void mutations.handleDeleteFolder(item.id);
        else void mutations.handleDeleteSnippet(item.id);
      }}
      onRestoreItem={(item, targetFolderId) => {
        if (item.type === "folder") void mutations.handleRestoreFolder(item.id, targetFolderId);
        else void mutations.handleRestoreSnippet(item.id, targetFolderId);
      }}
    >
    <div className="flex h-screen overflow-hidden">
      <Aside
        user={auth.user}
        folders={folders}
        snippets={snippets}
        copy={copy}
        clipboard={clipboard}
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onSetOpen={setSidebarOpen}
        onSelectSnippet={(id) => navigate(`${base}?snippet=${id}`)}
        onGoHome={() => navigate(base)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenShortcuts={() => setHelpOpen(true)}
        onGoSpace={() => navigate(`${base}?folder=${SPACE_ROOT_ID}`)}
        onNewSnippetAt={handleNewSnippetAt}
        onCreateSnippetInline={mutations.handleCreateSnippetInline}
        onCreateFolder={mutations.handleCreateFolder}
        onDeleteFolder={mutations.handleDeleteFolder}
        onDeleteSnippet={mutations.handleDeleteSnippet}
        onRenameFolder={mutations.handleRenameFolder}
        onRenameSnippet={mutations.handleRenameSnippet}
        onPinFolder={mutations.handlePinFolder}
        onPinSnippet={mutations.handlePinSnippet}
        onCut={setClipboard}
        onCopy={(entry) => setClipboard({ ...entry, type: "copy" })}
        onPaste={mutations.handlePaste}
        onMoveFolder={mutations.handleMoveFolder}
        onMoveSnippet={mutations.handleMoveSnippet}
        onSignIn={auth.handleGitHubSignIn}
        onSignOut={auth.handleSignOut}
        signingIn={auth.signingIn}
        signingOut={auth.signingOut}
        onSelectFolder={(folderId) => navigate(`${base}?folder=${folderId}`)}
        onOpenTrash={() => navigate(`${base}?folder=${TRASH_ROOT_ID}`)}
        onRestoreAll={() => void mutations.handleRestoreAll()}
        onEmptyTrash={() => setPendingEmptyTrash(true)}
        trashCount={trashCount}
        selectedSnippetId={selectedSnippetId}
        selectedFolderId={selectedFolderId}
      />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <AccountToast message={auth.accountMessage} />

        {selectedSnippet ? (
          <div className="flex-1 overflow-hidden">
            <SnippetEditor
              key={selectedSnippet.id}
              snippet={selectedSnippet}
              // A trashed snippet's ancestors live only in the trashed set; pass
              // those so its breadcrumb resolves the (also trashed) folder path.
              folders={selectedSnippetTrashed ? trashedFolders : folders}
              copy={copy}
              syncStatus={sync.snippetStatuses[selectedSnippet.id] ?? "idle"}
              onClose={() => navigate(selectedSnippetTrashed ? `${base}?folder=${TRASH_ROOT_ID}` : base)}
              onNavigateFolder={(folderId) => navigate(`${base}?folder=${folderId}`)}
              onNavigateHome={() =>
                navigate(`${base}?folder=${selectedSnippetTrashed ? TRASH_ROOT_ID : SPACE_ROOT_ID}`)
              }
              onUpdate={mutations.handleUpdateSnippet}
              menuButton={menuButton}
              readOnly={selectedSnippetTrashed}
              trashActions={
                selectedSnippetTrashed
                  ? {
                      onRestore: () => void mutations.handleRestoreSnippet(selectedSnippet.id),
                      onDeletePermanently: () =>
                        void mutations.handlePermanentlyDeleteSnippet(selectedSnippet.id),
                    }
                  : undefined
              }
            />
          </div>
        ) : isTrashView ? (
          <TrashView
            folderId={selectedFolderId!}
            folders={trashedFolders}
            snippets={trashedSnippets}
            copy={copy}
            onNavigateFolder={(folderId) => navigate(`${base}?folder=${folderId}`)}
            onNavigateTrashRoot={() => navigate(`${base}?folder=${TRASH_ROOT_ID}`)}
            onSelectSnippet={(id) => navigate(`${base}?snippet=${id}`)}
            onRestoreSnippet={(id) => void mutations.handleRestoreSnippet(id)}
            onPermanentlyDeleteSnippet={(id) => void mutations.handlePermanentlyDeleteSnippet(id)}
            onRestoreFolder={(id) => void mutations.handleRestoreFolder(id)}
            onPermanentlyDeleteFolder={(id) => void mutations.handlePermanentlyDeleteFolder(id)}
            onRestoreAll={() => void mutations.handleRestoreAll()}
            onEmptyTrash={() => setPendingEmptyTrash(true)}
            menuButton={menuButton}
          />
        ) : selectedFolderId ? (
          <FolderView
            folderId={selectedFolderId}
            folders={folders}
            snippets={snippets}
            copy={copy}
            clipboard={clipboard}
            onSelectSnippet={(id) => navigate(`${base}?snippet=${id}`)}
            onNavigateFolder={(folderId) => navigate(`${base}?folder=${folderId}`)}
            onNavigateHome={() => navigate(`${base}?folder=${SPACE_ROOT_ID}`)}
            onPinSnippet={mutations.handlePinSnippet}
            onPinFolder={mutations.handlePinFolder}
            onDeleteSnippet={mutations.handleDeleteSnippet}
            onRenameSnippet={mutations.handleRenameSnippet}
            onCutSnippet={(id) => setClipboard({ type: "cut", itemType: "snippet", id })}
            onCopySnippet={(id) => setClipboard({ type: "copy", itemType: "snippet", id })}
            onDeleteFolder={mutations.handleDeleteFolder}
            onRenameFolder={mutations.handleRenameFolder}
            onCutFolder={(id) => setClipboard({ type: "cut", itemType: "folder", id })}
            onCopyFolder={(id) => setClipboard({ type: "copy", itemType: "folder", id })}
            onPaste={mutations.handlePaste}
            menuButton={menuButton}
          />
        ) : (
          <main className="flex-1 overflow-y-auto">
            {menuButton && (
              <div className="sticky top-0 z-10 flex h-11 items-center border-b border-transparent px-3">
                {menuButton}
              </div>
            )}
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-8">
              <NewSnippet
                copy={copy}
                folders={folders}
                defaultFolderId={defaultNewSnippetFolderId}
                focusNonce={newSnippetFocusNonce}
                onCreateSnippet={mutations.handleCreateSnippet}
              />

              <SnippetCards
                snippets={snippets}
                folders={folders}
                copy={copy}
                clipboard={clipboard}
                onSelectSnippet={(id) => navigate(`${base}?snippet=${id}`)}
                onNavigateFolder={(folderId) => navigate(`${base}?folder=${folderId}`)}
                onPinSnippet={mutations.handlePinSnippet}
                onDeleteSnippet={mutations.handleDeleteSnippet}
                onRenameSnippet={mutations.handleRenameSnippet}
                onCutSnippet={(id) => setClipboard({ type: "cut", itemType: "snippet", id })}
                onCopySnippet={(id) => setClipboard({ type: "copy", itemType: "snippet", id })}
                onPaste={mutations.handlePaste}
              />
            </div>
          </main>
        )}
      </div>
    </div>

    {searchOpen && (
      <SearchPalette
        snippets={snippets}
        folders={folders}
        copy={copy}
        onSelectSnippet={(id) => navigate(`${base}?snippet=${id}`)}
        onClose={() => setSearchOpen(false)}
      />
    )}

    {helpOpen && <ShortcutsDialog copy={copy} onClose={() => setHelpOpen(false)} />}

    <CopyToast nonce={copyNonce} message={copy.snippetEditor.codeCopied} />

    {pendingEmptyTrash && (
      <ConfirmDialog
        title={copy.trash.emptyTitle}
        warning={copy.trash.emptyWarning}
        confirmLabel={copy.trash.emptyTrash}
        cancelLabel={copy.trash.cancel}
        folderCount={trashedFolders.length}
        snippetCount={trashedSnippets.length}
        folderCountLabel={copy.trash.folderCount}
        snippetCountLabel={copy.trash.snippetCount}
        onCancel={() => setPendingEmptyTrash(false)}
        onConfirm={() => {
          void mutations.handleEmptyTrash();
          setPendingEmptyTrash(false);
          if (isTrashView) navigate(`${base}?folder=${TRASH_ROOT_ID}`);
        }}
      />
    )}
    </DragProvider>
  );
}