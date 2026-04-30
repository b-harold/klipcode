"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";

import { readWorkspace } from "@/lib/db";
import { seedWelcomeContent } from "@/lib/seed";
import type { ClipboardEntry } from "@/lib/types";
import { getDictionary } from "@/i18n";
import { SPACE_ROOT_ID } from "@/lib/navigation";
import { Tooltip } from "@/ui/Tooltip";

import { useResponsiveSidebar } from "@/hooks/useResponsiveSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useWorkspaceMutations } from "@/hooks/useWorkspaceMutations";

import { AccountToast } from "@/components/AccountToast/AccountToast";
import { Aside } from "@/components/Aside/Aside";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { DragProvider } from "@/components/DragContext";
import { NewSnippet } from "@/components/NewSnippet/NewSnippet";
import { SnippetCards } from "@/components/SnippetCards/SnippetCards";
import { SnippetEditor } from "@/components/SnippetEditor/SnippetEditor";
import { NoteEditor } from "@/components/NoteEditor/NoteEditor";
import { FolderView } from "@/components/FolderView/FolderView";
import { SearchOverlay } from "@/components/Search/SearchOverlay";

export default function KlipCodeApp({ locale }: { locale: "en" | "es" }) {
  const copy = getDictionary(locale);
  const queryClient = useQueryClient();
  const { sidebarOpen, setSidebarOpen, isMobile } = useResponsiveSidebar();

  function refreshWorkspace() {
    startTransition(() => {
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "workspace",
      });
    });
  }

  // onReconciled callback references sync.setSnippetStatus / setNoteStatus — safe
  // because it's only invoked asynchronously after all hooks initialise.
  const auth = useAuth({
    copy,
    refreshWorkspace,
    onReconciled: ({ snippetIds, noteIds }) => {
      for (const id of snippetIds) sync.setSnippetStatus(id, "saved-cloud");
      for (const id of noteIds) sync.setNoteStatus(id, "saved-cloud");
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

  const router = useRouter();
  const searchParams = useSearchParams();
  const base = `/${locale}/app`;

  const selectedSnippetId = searchParams.get("snippet");
  const selectedFolderId = searchParams.get("folder");
  const selectedNoteId = searchParams.get("note");

  function setSelectedSnippetId(id: string | null) {
    const next = new URLSearchParams();
    if (selectedNoteId) next.set("note", selectedNoteId);
    if (id) next.set("snippet", id);
    const qs = next.toString();
    router.push(qs ? `${base}?${qs}` : base);
  }

  function setSelectedNoteId(id: string | null) {
    if (id !== null) router.push(`${base}?note=${id}`);
    else router.push(base);
  }

  /* ── Clipboard / dialog / search state ─────────────────────────────────── */

  const [clipboard, setClipboard] = useState<ClipboardEntry | null>(null);
  const [defaultNewSnippetFolderId, setDefaultNewSnippetFolderId] = useState<string | null>(null);
  const [pendingDeleteFolder, setPendingDeleteFolder] = useState<{
    id: string;
    name: string;
    nestedFolderCount: number;
    snippetCount: number;
    noteCount: number;
  } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  /* ── Workspace data ───────────────────────────────────────────────────── */

  const workspaceQuery = useQuery({
    queryKey: ["workspace", auth.user?.id ?? "guest"],
    queryFn: () => readWorkspace(auth.user?.id ?? null),
  });

  const folders = workspaceQuery.data?.folders ?? [];
  const snippets = workspaceQuery.data?.snippets ?? [];
  const notes = workspaceQuery.data?.notes ?? [];

  /* ── Mutations ────────────────────────────────────────────────────────── */

  const mutations = useWorkspaceMutations({
    copy,
    user: auth.user,
    supabase: auth.supabase,
    supabaseConfigured: auth.supabaseConfigured,
    folders,
    snippets,
    notes,
    clipboard,
    setClipboard,
    selectedSnippetId,
    selectedNoteId,
    setSelectedSnippetId,
    setSelectedNoteId,
    refreshWorkspace,
    scheduleCloudSync: sync.scheduleCloudSync,
    settleLocally: sync.settleLocally,
    setSnippetStatus: sync.setSnippetStatus,
    setNoteStatus: sync.setNoteStatus,
  });

  /* ── First-visit seeding ────────────────────────────────────────────────── */

  useEffect(() => {
    if (!auth.authReady || auth.user) return;
    void seedWelcomeContent(copy).then((seeded) => {
      if (seeded) refreshWorkspace();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authReady, auth.user]);

  /* ── Cmd/Ctrl+K to open search ─────────────────────────────────────────── */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ── Derived state & side-effects ─────────────────────────────────────── */

  useEffect(() => {
    if (!workspaceQuery.isSuccess) return;
    if (selectedFolderId && selectedFolderId !== SPACE_ROOT_ID && !folders.find((f) => f.id === selectedFolderId)) {
      router.replace(base);
    }
  }, [folders, selectedFolderId, workspaceQuery.isSuccess, router, base]);

  const selectedSnippet = selectedSnippetId
    ? (snippets.find((s) => s.id === selectedSnippetId) ?? null)
    : null;
  const selectedNote = selectedNoteId
    ? (notes.find((n) => n.id === selectedNoteId) ?? null)
    : null;

  const splitPaneOpen = Boolean(selectedNote && selectedSnippet);

  function handleNewSnippetAt(folderId: string | null) {
    router.push(base);
    setDefaultNewSnippetFolderId(folderId);
  }

  async function handleDeleteFolderWithConfirm(id: string): Promise<void> {
    const folder = folders.find((f) => f.id === id);
    if (!folder) return;

    const folderSet = new Set<string>([id]);
    const queue = [id];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const f of folders) {
        if (f.parentId === cur && !folderSet.has(f.id)) {
          folderSet.add(f.id);
          queue.push(f.id);
        }
      }
    }

    const nestedFolderCount = folderSet.size - 1;
    const snippetCount = snippets.filter((s) => s.folderId && folderSet.has(s.folderId)).length;
    const noteCount = notes.filter((n) => n.folderId && folderSet.has(n.folderId)).length;

    if (nestedFolderCount === 0 && snippetCount === 0 && noteCount === 0) {
      await mutations.handleDeleteFolder(id);
      return;
    }

    setPendingDeleteFolder({ id, name: folder.name, nestedFolderCount, snippetCount, noteCount });
  }

  function openSnippetSplit(snippetId: string) {
    if (selectedNoteId) {
      router.push(`${base}?note=${selectedNoteId}&snippet=${snippetId}`);
    } else {
      router.push(`${base}?snippet=${snippetId}`);
    }
  }

  function closeSplitSnippet() {
    if (selectedNoteId) {
      router.push(`${base}?note=${selectedNoteId}`);
    } else {
      router.push(base);
    }
  }

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

  return (
    <DragProvider
      folders={folders}
      onMoveFolder={mutations.handleMoveFolder}
      onMoveSnippet={mutations.handleMoveSnippet}
      onMoveNote={mutations.handleMoveNote}
    >
    <div className="flex h-screen overflow-hidden">
      <Aside
        user={auth.user}
        folders={folders}
        snippets={snippets}
        notes={notes}
        copy={copy}
        clipboard={clipboard}
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onSetOpen={setSidebarOpen}
        onSelectSnippet={(id) => router.push(`${base}?snippet=${id}`)}
        onSelectNote={(id) => router.push(`${base}?note=${id}`)}
        onGoHome={() => router.push(base)}
        onGoSpace={() => router.push(`${base}?folder=${SPACE_ROOT_ID}`)}
        onOpenSearch={() => setSearchOpen(true)}
        onNewSnippetAt={handleNewSnippetAt}
        onCreateSnippetInline={mutations.handleCreateSnippetInline}
        onCreateNoteInline={mutations.handleCreateNoteInline}
        onCreateFolder={mutations.handleCreateFolder}
        onDeleteFolder={handleDeleteFolderWithConfirm}
        onDeleteSnippet={mutations.handleDeleteSnippet}
        onDeleteNote={mutations.handleDeleteNote}
        onRenameFolder={mutations.handleRenameFolder}
        onRenameSnippet={mutations.handleRenameSnippet}
        onRenameNote={mutations.handleRenameNote}
        onPinFolder={mutations.handlePinFolder}
        onPinSnippet={mutations.handlePinSnippet}
        onPinNote={mutations.handlePinNote}
        onCut={setClipboard}
        onCopy={(entry) => setClipboard({ ...entry, type: "copy" })}
        onPaste={mutations.handlePaste}
        onMoveFolder={mutations.handleMoveFolder}
        onMoveSnippet={mutations.handleMoveSnippet}
        onMoveNote={mutations.handleMoveNote}
        onSignIn={auth.handleGitHubSignIn}
        onSignOut={auth.handleSignOut}
        onSelectFolder={(folderId) => router.push(`${base}?folder=${folderId}`)}
      />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <AccountToast message={auth.accountMessage} />

        {selectedNote ? (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className={splitPaneOpen ? "hidden flex-1 min-w-0 md:flex md:flex-col" : "flex flex-1 min-w-0 flex-col"}>
              <NoteEditor
                key={selectedNote.id}
                note={selectedNote}
                folders={folders}
                snippets={snippets}
                copy={copy}
                syncStatus={sync.noteStatuses[selectedNote.id] ?? "idle"}
                splitPaneOpen={splitPaneOpen}
                onClose={() => router.push(base)}
                onNavigateFolder={(folderId) => router.push(`${base}?folder=${folderId}`)}
                onNavigateHome={() => router.push(`${base}?folder=${SPACE_ROOT_ID}`)}
                onUpdate={mutations.handleUpdateNote}
                onOpenSnippet={openSnippetSplit}
                menuButton={menuButton}
              />
            </div>
            {splitPaneOpen && selectedSnippet && (
              <div className="relative flex flex-1 min-w-0 flex-col border-l border-white/[0.06]">
                <button
                  type="button"
                  aria-label={copy.noteEditor.closeSnippetPane}
                  onClick={closeSplitSnippet}
                  className="absolute right-3 top-2.5 z-20 rounded-md p-1 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-foreground"
                >
                  <X size={14} />
                </button>
                <SnippetEditor
                  key={selectedSnippet.id}
                  snippet={selectedSnippet}
                  folders={folders}
                  copy={copy}
                  syncStatus={sync.snippetStatuses[selectedSnippet.id] ?? "idle"}
                  onClose={closeSplitSnippet}
                  onNavigateFolder={(folderId) => router.push(`${base}?folder=${folderId}`)}
                  onNavigateHome={() => router.push(`${base}?folder=${SPACE_ROOT_ID}`)}
                  onUpdate={mutations.handleUpdateSnippet}
                />
              </div>
            )}
          </div>
        ) : selectedSnippet ? (
          <div className="flex-1 overflow-hidden">
            <SnippetEditor
              key={selectedSnippet.id}
              snippet={selectedSnippet}
              folders={folders}
              copy={copy}
              syncStatus={sync.snippetStatuses[selectedSnippet.id] ?? "idle"}
              onClose={() => router.push(base)}
              onNavigateFolder={(folderId) => router.push(`${base}?folder=${folderId}`)}
              onNavigateHome={() => router.push(`${base}?folder=${SPACE_ROOT_ID}`)}
              onUpdate={mutations.handleUpdateSnippet}
              menuButton={menuButton}
            />
          </div>
        ) : selectedFolderId ? (
          <FolderView
            folderId={selectedFolderId}
            folders={folders}
            snippets={snippets}
            notes={notes}
            copy={copy}
            clipboard={clipboard}
            onSelectSnippet={(id) => router.push(`${base}?snippet=${id}`)}
            onSelectNote={(id) => router.push(`${base}?note=${id}`)}
            onNavigateFolder={(folderId) => router.push(`${base}?folder=${folderId}`)}
            onNavigateHome={() => router.push(`${base}?folder=${SPACE_ROOT_ID}`)}
            onPinSnippet={mutations.handlePinSnippet}
            onPinNote={mutations.handlePinNote}
            onPinFolder={mutations.handlePinFolder}
            onDeleteSnippet={mutations.handleDeleteSnippet}
            onDeleteNote={mutations.handleDeleteNote}
            onRenameSnippet={mutations.handleRenameSnippet}
            onRenameNote={mutations.handleRenameNote}
            onCutSnippet={(id) => setClipboard({ type: "cut", itemType: "snippet", id })}
            onCopySnippet={(id) => setClipboard({ type: "copy", itemType: "snippet", id })}
            onCutNote={(id) => setClipboard({ type: "cut", itemType: "note", id })}
            onCopyNote={(id) => setClipboard({ type: "copy", itemType: "note", id })}
            onDeleteFolder={handleDeleteFolderWithConfirm}
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
                onCreateSnippet={mutations.handleCreateSnippet}
              />

              <SnippetCards
                snippets={snippets}
                folders={folders}
                copy={copy}
                clipboard={clipboard}
                onSelectSnippet={(id) => router.push(`${base}?snippet=${id}`)}
                onNavigateFolder={(folderId) => router.push(`${base}?folder=${folderId}`)}
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

    {pendingDeleteFolder && (
      <ConfirmDialog
        copy={copy.confirmDeleteFolder}
        folderName={pendingDeleteFolder.name}
        nestedFolderCount={pendingDeleteFolder.nestedFolderCount}
        snippetCount={pendingDeleteFolder.snippetCount}
        noteCount={pendingDeleteFolder.noteCount}
        onCancel={() => setPendingDeleteFolder(null)}
        onConfirm={() => {
          void mutations.handleDeleteFolder(pendingDeleteFolder.id);
          setPendingDeleteFolder(null);
        }}
      />
    )}

    {searchOpen && (
      <SearchOverlay
        snippets={snippets}
        notes={notes}
        folders={folders}
        copy={copy}
        onClose={() => setSearchOpen(false)}
        onSelectSnippet={(id) => {
          setSearchOpen(false);
          router.push(`${base}?snippet=${id}`);
        }}
        onSelectNote={(id) => {
          setSearchOpen(false);
          router.push(`${base}?note=${id}`);
        }}
        onSelectFolder={(id) => {
          setSearchOpen(false);
          router.push(`${base}?folder=${id}`);
        }}
      />
    )}
    </DragProvider>
  );
}
