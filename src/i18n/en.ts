const WELCOME_SNIPPET_CONTENT = `# Welcome to KlipCode!

KlipCode is a tool designed to keep your favorite code snippets always at hand,
quickly and easily, across all your devices.

## What can you do?

- **Quick save:** Save a *snippet* in a couple of clicks without needing to sign in.
- **Instant copy:** Copy the content of your snippets to the clipboard instantly.
- **Hierarchical organization:** Create folders with multiple depth levels to organize your code.
- **Intuitive management:** Move your *snippets* and folders by dragging them to fit your workflow.
- **GitHub sync:** Sign in to have your data automatically synced to the cloud.
- **Advanced editor:** Edit your snippets comfortably with an auto-save system.
- **Priority access:** Pin your most important *snippets* both in folders and on the home page.

## Getting started

1. **Create your first snippet:** Use the creator on the home page or the button
   in the sidebar to add this JSX code at the root level with the title \`Component\`:

\`\`\`jsx
const Greet = ({ name }) => {
  return (
    <div className="user-card">
      <h1>{name}</h1>
      <button onClick={() => console.log(\`Hello \${name}\`)}>
        Click
      </button>
    </div>
  );
};
\`\`\`

2. **Open the editor:** Click on the file you created in the sidebar.
3. **Organize the content:** Create a folder called \`my-components\` from the sidebar
   and drag your new component into it.
4. **Done!:** You can now start exploring KlipCode to boost your productivity.
   You can delete all the example snippets and folders if you want — just right-click on
   them in the sidebar and select "Delete".`;

const WELCOME_NOTE_CONTENT = (snippetId: string) => `# Notes that link to your code

Notes are markdown documents that live alongside your snippets. You can attach
any snippet inline by typing \`[[snippet:<id>]]\` — it renders as a clickable
card. Click the card to open the snippet in the right pane while you keep
reading the note.

For example, here is the welcome snippet attached:

[[snippet:${snippetId}]]

Try writing your own note from the sidebar (the **note** button next to the
snippet and folder buttons), or press **Cmd/Ctrl + K** to search across
everything you have stored.`;

export const en = {
  app: {
    title: "KlipCode",
    subtitle: "Multi-device snippet manager.",
  },
  common: {
    close: "Close",
  },
  auth: {
    statusLabel: "Session status",
    signedIn: "Signed in",
    signedOut: "Signed out",
    signIn: "Sign In",
    signOut: "Sign Out",
    localMode: "Local mode active. Changes are saved to IndexedDB.",
    notConfigured:
      "Supabase is not configured. The app works in local mode only until you set the NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY variables.",
    syncingSession:
      "Syncing IndexedDB data with Supabase and downloading account content.",
    syncedSession: "Session synced with the cloud.",
    cloudSyncRunning: "Syncing changes to the cloud.",
    syncFailed: "Could not sync with the cloud.",
    signedInAs: "User",
    signingIn: "Signing in…",
    signingOut: "Signing out…",
  },
  forms: {
    folderTitle: "New folder",
    folderName: "Folder name or path",
    snippetNamePlaceholder: "Name or path, e.g. scripts/index.js",
    noteNamePlaceholder: "Note name",
    folderParent: "Parent folder",
    folderPinned: "Pinned",
    snippetTitle: "New snippet",
    snippetTitlePlaceholder: "Snippet title",
    snippetName: "Title",
    snippetLanguage: "Language",
    snippetFolder: "Folder",
    snippetPinned: "Pinned",
    snippetCode: "Code",
    codeEditor: "Code editor",
    snippetCodePlaceholder: "Write or paste your code here...",
    submitFolder: "Create folder",
    submitSnippet: "Create snippet",
    noteTitlePlaceholder: "Note title",
    noteBodyPlaceholder: "Write your note in markdown…",
    submitNote: "Create note",
    folderNamePlaceholder: "Folder name",
    snippetCreated: "Snippet created",
    open: "Open",
  },
  workspace: {
    loading: "Loading local content...",
    loadError: "Could not load local content.",
    rootSnippets: "Snippets at root",
    folders: "Folders",
    noFolders: "No folders created.",
    noRootSnippets: "No snippets at root.",
    emptyFolder: "This folder has no content.",
    rootOption: "Root",
    pinnedBadge: "Pinned",
    snippetNotFoundTitle: "Snippet not found",
    snippetNotFoundDescription: "This snippet doesn't exist or has been deleted.",
  },
  snippetCard: {
    title: "Title",
    language: "Language",
    folder: "Folder",
    code: "Code",
    status: "Status",
    untitled: "Untitled",
    generatingTitle: "Naming snippet…",
  },
  noteCard: {
    untitled: "Untitled note",
    empty: "Empty note",
  },
  sync: {
    editing: "Editing...",
    saving: "Saving...",
    savedLocal: "Saved locally",
    savedCloud: "Saved to the cloud",
    error: "Sync error",
    idle: "No pending changes",
  },
  aside: {
    collapse: "Collapse panel",
    open: "Open panel",
    home: "Home",
    search: "Search",
    searchShortcut: "⌘K",
    mySpace: "My Space",
    expandFolder: "Expand folder",
    collapseFolder: "Collapse folder",
    addSnippet: "New snippet",
    addNote: "New note",
    addFolder: "New folder",
    emptySpace: "No files yet.",
    root: "Root",
    dropToRoot: "Move to root",
    dropToTrash: "Move to trash",
    unpin: "Unpin",
    pinned: "Pinned",
    shortcuts: "Keyboard shortcuts",
    preferences: "Preferences",
    trash: "Trash",
  },
  contextMenu: {
    newFolder: "New folder…",
    newSnippet: "New snippet…",
    newNote: "New note…",
    pin: "Pin",
    unpin: "Unpin",
    pinHome: "Pin to Home",
    unpinHome: "Unpin from Home",
    pinAside: "Pin",
    unpinAside: "Unpin",
    rename: "Rename",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    delete: "Delete",
    copyContent: "Copy content",
    openInNewTab: "Open in new tab",
    moreOptions: "More options",
    restore: "Restore",
    deletePermanently: "Delete permanently",
  },
  languageSelect: {
    searchPlaceholder: "Search language...",
    noResults: "No results",
  },
  folderSelect: {
    noFolders: "No folders",
  },
  pinnedToHome: {
    title: "Pinned to home",
    emptyHint: "Pin snippets and notes here from the right-click menu — they'll show up on home.",
  },
  themeToggle: {
    toLight: "Switch to light theme",
    toDark: "Switch to dark theme",
  },
  homeCreate: {
    snippetTitle: "New snippet",
    noteTitle: "New note",
    folderTitle: "New folder",
    snippetSubtitle: "Save a piece of code with syntax highlighting.",
    noteSubtitle: "Write a markdown note alongside your snippets.",
  },
  recentSnippets: {
    title: "Recently edited",
    empty: "You don't have any snippets yet. Create your first one above.",
  },
  folderView: {
    breadcrumbLabel: "Folder navigation",
    subFolders: "Folders",
    snippets: "Snippets",
    notes: "Notes",
    snippetLabel: "snippets",
    noteLabel: "notes",
    subFolderLabel: "folders",
    folderCount: (n: number) => (n === 1 ? "1 folder" : `${n} folders`),
    snippetCount: (n: number) => (n === 1 ? "1 snippet" : `${n} snippets`),
    emptyFolder: "Empty",
    empty: "This folder is empty.",
  },
  snippetEditor: {
    back: "Back",
    titlePlaceholder: "Untitled",
    generatingTitle: "Naming snippet…",
    syncEditing: "Editing...",
    syncSaving: "Saving...",
    syncSavedLocal: "Saved locally",
    syncSavedCloud: "Saved to the cloud",
    syncError: "Error saving",
    syncIdle: "No changes",
    folderRoot: "Root",
    copyCode: "Copy code",
    codeCopied: "Copied!",
    formatCode: "Format code",
    formatNotSupported: "Formatting not available for this language",
    sourceUrl: "Source URL",
    sourceUrlPlaceholder: "Add source URL (https://…)",
    formatError: "Couldn't format — check for syntax errors",
    mdCodeBlockOptions: "Code block options",
    mdCodeBlockDelete: "Delete block",
    previewMarkdown: "Rich text view",
    editMarkdown: "Markdown source",
    mdPlaceholder: "Write something… Markdown shortcuts work here.",
    trashedNotice: "This snippet is in the trash — restore it to edit.",
    linkDialog: {
      title: "Insert link",
      editTitle: "Edit link",
      label: "URL",
      placeholder: "https://",
      apply: "Apply",
      cancel: "Cancel",
      remove: "Remove link",
      invalid: "Enter a valid URL",
    },
    mdToolbar: {
      bold: "Bold",
      italic: "Italic",
      strike: "Strikethrough",
      code: "Inline code",
      heading1: "Heading 1",
      heading2: "Heading 2",
      heading3: "Heading 3",
      bulletList: "Bullet list",
      orderedList: "Numbered list",
      taskList: "Task list",
      codeBlock: "Code block",
      quote: "Quote",
      link: "Link",
    },
    mdSlash: {
      group: "Basic blocks",
      noResults: "No blocks found",
      heading1Title: "Heading 1",
      heading1Desc: "Big section heading",
      heading2Title: "Heading 2",
      heading2Desc: "Medium section heading",
      heading3Title: "Heading 3",
      heading3Desc: "Small section heading",
      bulletListTitle: "Bullet list",
      bulletListDesc: "A simple bulleted list",
      orderedListTitle: "Numbered list",
      orderedListDesc: "A list with numbering",
      taskListTitle: "Task list",
      taskListDesc: "Track tasks with checkboxes",
      blockquoteTitle: "Quote",
      blockquoteDesc: "Capture a quotation",
      codeBlockTitle: "Code block",
      codeBlockDesc: "Code with syntax highlighting",
      tableTitle: "Table",
      tableDesc: "Insert a 3×3 table",
      dividerTitle: "Divider",
      dividerDesc: "Visually separate sections",
    },
    mdTable: {
      addColumnBefore: "Add column before",
      addColumnAfter: "Add column after",
      deleteColumn: "Delete column",
      addRowBefore: "Add row above",
      addRowAfter: "Add row below",
      deleteRow: "Delete row",
      toggleHeaderRow: "Toggle header row",
      deleteTable: "Delete table",
    },
  },
  noteEditor: {
    titlePlaceholder: "Untitled note",
    bodyPlaceholder: "Write in markdown… use [[snippet:id]] to attach a snippet.",
    attachSnippet: "Attach snippet",
    attachSearchPlaceholder: "Search snippets…",
    attachNoResults: "No snippets found",
    deletedReference: "Snippet not found",
    previewEmpty: "Switch to edit to start writing — your rendered note will appear here.",
    editMarkdown: "Edit markdown",
    viewMarkdown: "View rendered",
    closeSnippetPane: "Close snippet pane",
    attachments: "Attached snippets",
    noAttachments: "No snippets attached yet. Use the paperclip to attach one — or type [[snippet:id]] in the markdown.",
    backToAttachments: "Back",
    openInEditor: "Open in editor",
    editSnippet: "Edit snippet",
    viewSnippet: "View snippet",
    copySourceUrl: "Copy source URL",
  },
  search: {
    title: "Search",
    placeholder: "Search snippets by title or code…",
    empty: "Type to search your snippets",
    noResults: "No snippets found",
    rootFolder: "Root",
    navigateHint: "to navigate",
    selectHint: "to open",
    closeHint: "to close",
    snippets: "Snippets",
    notes: "Notes",
    folders: "Folders",
  },
  confirmDeleteFolder: {
    title: "Delete folder",
    permanentWarning: "This action is permanent and cannot be undone.",
    containsFolders: (n: number) =>
      n === 1 ? "1 inner folder" : `${n} inner folders`,
    containsSnippets: (n: number) =>
      n === 1 ? "1 snippet" : `${n} snippets`,
    containsNotes: (n: number) =>
      n === 1 ? "1 note" : `${n} notes`,
    cancel: "Cancel",
    confirm: "Delete permanently",
  },
  shortcuts: {
    title: "Keyboard shortcuts",
    sections: {
      general: "General",
      editor: "Editor",
      navigation: "Navigation",
    },
    items: {
      search: "Open search",
      newSnippet: "New snippet",
      createSnippet: "Create snippet",
      toggleSidebar: "Toggle sidebar",
      help: "Show keyboard shortcuts",
      copyCurrent: "Copy current snippet code",
      closeEditor: "Close editor",
      undoDelete: "Undo last delete",
      navigateList: "Move between cards",
    },
  },
  preferences: {
    title: "Preferences",
    appearance: {
      label: "Appearance",
      description: "Light or dark theme",
      light: "Light",
      dark: "Dark",
      toLight: "Switch to light theme",
      toDark: "Switch to dark theme",
    },
    language: {
      label: "Language",
      description: "Interface language",
      en: "English",
      es: "Español",
    },
    defaultFolder: {
      label: "Default folder",
      description: "Pre-selected folder when creating a snippet",
    },
    defaultLanguage: {
      label: "Default language",
      description: "Pre-selected language when creating a snippet",
    },
    autoGenerateTitle: {
      label: "Auto-generate names",
      description: "Name untitled snippets automatically with AI",
      lockedHint: "Sign in to name snippets automatically with AI",
    },
    codeWrap: {
      label: "Long lines",
      description: "Scroll horizontally or wrap onto the next line",
      scroll: "Scroll",
      wrap: "Wrap",
    },
  },
  trash: {
    title: "Trash",
    empty: "The trash is empty.",
    restore: "Restore",
    deletePermanently: "Delete permanently",
    restoreAll: "Restore all",
    emptyTrash: "Empty trash",
    emptyTitle: "Empty trash",
    emptyWarning: "This permanently deletes everything in the trash. This action cannot be undone.",
    cancel: "Cancel",
    undoRestored: "Deletion undone",
    folderCount: (n: number) => (n === 1 ? "1 folder" : `${n} folders`),
    snippetCount: (n: number) => (n === 1 ? "1 snippet" : `${n} snippets`),
  },
  landing: {
    nav: {
      openApp: "Open App",
      noSignUp: "No sign-up required",
      features: "Features",
      faq: "FAQ",
    },
    hero: {
      badge: "Free · Open source · No sign-up",
      title: "The code snippet manager\nthat stays out of your way.",
      titleBefore: "The ",
      titleHighlight: "code snippet manager",
      titleAfter: "that stays out of your way.",
      subtitle:
        "Save, organize, and copy your code snippets from any device. Local-first and free: it works offline, needs no account, and syncs through GitHub when you want it to.",
      cta: "Start now — free",
      ctaHint: "No account needed to begin",
    },
    trust: {
      offline: "Works 100% offline",
      local: "Your snippets live on your device",
      openSource: "Open source on GitHub",
    },
    appPreview:
      "KlipCode snippet manager interface: folder sidebar and code editor with syntax highlighting",
    features: {
      eyebrow: "Features",
      title: "Everything you need, nothing you don't",
      subtitle: "Built for developers who value speed and simplicity.",
      quickSave: {
        title: "Instant Save",
        description:
          "Save a code snippet in two clicks. No sign-up walls, no friction.",
      },
      instantCopy: {
        title: "One-click Copy",
        description:
          "Copy any snippet to your clipboard instantly — no more digging through old projects and gists.",
      },
      folders: {
        title: "Nested Folders",
        description:
          "Organize your snippet library with hierarchical folders that match your mental model.",
      },
      dragAndDrop: {
        title: "Drag & Drop",
        description:
          "Rearrange snippets and folders by dragging them where you want.",
      },
      cloudSync: {
        title: "GitHub Cloud Sync",
        description:
          "Sign in with GitHub and your snippets sync across all your devices automatically.",
      },
      editor: {
        title: "Advanced Code Editor",
        description:
          "Syntax highlighting for 25+ languages, auto-save, and code formatting — all built in.",
      },
    },
    demos: {
      eyebrow: "How it works",
      title: "From paste to copy in seconds",
      subtitle:
        "No setup, no configuration. Open the app and start saving code snippets.",
      create: {
        title: "Create snippets in seconds",
        description:
          "Pick a language, paste your code — done. Syntax highlighting and auto-save are built in.",
      },
      copy: {
        title: "Copy with one click",
        description:
          "Every snippet is one click away from your clipboard, on every device.",
      },
      move: {
        title: "Organize intuitively",
        description:
          "Drag and drop snippets and folders to arrange your workspace the way you think.",
      },
    },
    faq: {
      eyebrow: "FAQ",
      title: "Frequently asked questions",
      subtitle: "Everything you might want to know before you start.",
      items: [
        {
          q: "Is KlipCode free?",
          a: "Yes — KlipCode is completely free and open source. There are no paid plans, no snippet limits, and no account required to use it.",
        },
        {
          q: "Do I need an account to use KlipCode?",
          a: "No. KlipCode is local-first: your snippets are stored in your browser and everything works without signing up. An optional GitHub sign-in enables cloud sync.",
        },
        {
          q: "Does KlipCode work offline?",
          a: "Yes. Snippets are saved on your device, so you can create, edit, and copy them with no internet connection. Changes sync automatically the next time you're online.",
        },
        {
          q: "How do I sync snippets across devices?",
          a: "Sign in with GitHub on each device. Your snippet library is backed up to the cloud and kept in sync automatically — edits on one device appear on the others.",
        },
        {
          q: "Is my code private?",
          a: "Your snippets stay on your device unless you enable cloud sync. With sync on, they're stored in a private database only your account can access — and the entire codebase is open source, so you can verify it.",
        },
        {
          q: "Which programming languages are supported?",
          a: "KlipCode highlights more than 25 languages — JavaScript, TypeScript, Python, Go, Rust, SQL, HTML, CSS, and more — plus a rich Markdown mode for notes and docs.",
        },
      ],
    },
    cta: {
      title: "Ready to organize your code?",
      subtitle:
        "Free, open source, and ready in seconds. No account, no setup, no limits.",
      button: "Launch KlipCode",
    },
    footer: {
      tagline: "The local-first snippet manager for developers.",
      description:
        "KlipCode is a free, open-source code snippet manager. Save, organize, and sync code snippets across all your devices — it works offline and requires no account.",
      source: "Source",
      product: "Product",
      language: "Language",
      github: "GitHub",
    },
  },
  error: {
    title: "Something went wrong",
    description: "An unexpected error occurred. You can try again.",
    retry: "Try again",
  },
  notFound: {
    title: "Page not found",
    description: "The page you're looking for doesn't exist or has been moved.",
    backHome: "Back to home",
  },
  meta: {
    home: {
      title: "KlipCode — Free Open-Source Code Snippet Manager",
      description:
        "Free, open-source code snippet manager. Save, organize, and copy snippets across all your devices — local-first, works offline, no sign-up, optional GitHub cloud sync.",
    },
    app: {
      title: "Snippet Manager App",
      description:
        "Your KlipCode workspace: create, organize, and copy code snippets instantly. Works fully offline, with optional GitHub cloud sync across devices.",
    },
  },
  seed: {
    folderName: "welcome",
    snippetName: "klipcode",
    snippetContent: WELCOME_SNIPPET_CONTENT,
    noteName: "Notes",
    noteContent: WELCOME_NOTE_CONTENT,
  },
} as const;
