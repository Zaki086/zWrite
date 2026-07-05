# zWrite — Project Documentation

## 1. Project Overview

**zWrite** is a production-quality, offline-capable rich text editor designed for creating, editing, and exporting professional documents. It targets a experience between Google Docs, Microsoft Word, and Notion — offering powerful formatting, templates, and seamless export while working entirely in the browser without any backend.

### Technology Choices

| Technology | Reasoning |
|------------|-----------|
| **React 19 + Vite** | React provides a component-based architecture perfect for complex UI like an editor. Vite offers fast DX and optimized production builds. |
| **TypeScript (strict)** | Eliminates runtime errors, enables better IDE support, and documents the codebase through types. |
| **Tailwind CSS** | Utility-first approach enables rapid styling with consistent design tokens. The theming system (CSS variables) makes dark/light mode trivial. |
| **Tiptap (ProseMirror)** | ProseMirror is the industry-standard for rich text editors (used by NY Times, Atlassian). Tiptap provides a React-friendly API while exposing the full power of ProseMirror's document model, transactions, and history. |
| **Zustand** | Lightweight state management with minimal boilerplate. The store-based approach separates document state, editor state, and UI state cleanly. |
| **Framer Motion** | Declarative animations for UI transitions (sidebar open/close, toast notifications) without manual CSS animation management. |
| **shadcn/ui** | Provides accessible, composable UI primitives (dialogs, dropdowns, tooltips) that integrate seamlessly with Tailwind. |
| **docx (npm)** | The most robust client-side DOCX generation library. Creates actual .docx files compatible with Word, LibreOffice, and Google Docs. |
| **IndexedDB (idb)** | localStorage has a ~5-10MB synchronous quota and would fail silently on large documents with images. IndexedDB supports hundreds of MB asynchronously. |
| **DOMPurify** | Industry-standard HTML sanitizer for pasted content. Configured with an explicit allow-list rather than regex-based stripping. |

## 2. Architecture

### Component Hierarchy

```
App
├── BrowserRouter
│   ├── ThemeInit (effect)
│   ├── Suspense (lazy pages)
│   │   ├── LandingPage
│   │   │   ├── ActionCards (New, Resume, Invoice, Report)
│   │   │   ├── RecentDocuments (searchable list)
│   │   │   └── DeleteConfirmation (AlertDialog)
│   │   └── EditorPage
│   │       ├── Navbar (title, actions, theme toggle)
│   │       ├── Toolbar (formatting controls)
│   │       ├── SearchReplace (conditional)
│   │       ├── main (flex layout)
│   │       │   ├── OutlinePanel (left sidebar)
│   │       │   ├── EditorCanvas (center)
│   │       │   │   ├── EditorContent (Tiptap)
│   │       │   │   └── SlashCommands (floating)
│   │       │   └── PropertiesPanel (right sidebar)
│   │       └── StatusBar (word stats, zoom)
│   └── Toaster (toast notifications)
```

### Data Flow

1. **Document Load**: URL params (docId/templateId) → async load from IndexedDB → set in documentStore → editor receives content
2. **User Edit**: Typing → Tiptap onUpdate → documentStore.updateContent → wordStats recalculation
3. **Autosave**: onUpdate triggers debounced timer → saveDocument() → IndexedDB → recentDocuments update
4. **Export**: exportToDOCX() → parse HTML → generate docx Document → Blob → file download

### Document Lifecycle

```
Landing Page → Click New/Template → navigate to /doc/:id
→ EditorPage mounts → loadDocument() → editor initializes with content
→ User types → debounced autosave → IndexedDB
→ User clicks Export → DOCX generated → file downloaded
→ User navigates back → document available in Recent Documents
```

## 3. Folder Structure

```
src/
  app/                    # App shell (App.tsx, main.tsx, index.css)
  components/ui/          # shadcn/ui primitives (dialog, dropdown, tooltip, etc.)
  features/
    editor/               # Editor domain
      Navbar.tsx          # Document title, actions, theme toggle
      Toolbar.tsx         # Formatting controls with active states
      StatusBar.tsx       # Word stats, save status, zoom
      PropertiesPanel.tsx # Document stats, page setup, appearance
      toolbar/            # Toolbar sub-components
        Toolbar.tsx       # Full formatting toolbar
      toc/
        OutlinePanel.tsx  # Heading outline with click navigation
      search/
        SearchReplace.tsx # Find/replace with match navigation
      slash-commands/
        SlashCommands.tsx # /-command menu with filtering
  hooks/
    useTiptapEditor.ts    # Tiptap editor initialization hook
  stores/
    documentStore.ts      # Document data, persistence state
    editorStore.ts        # Editor UI state (zoom, sidebars, search)
    uiStore.ts            # Global UI (theme, toasts, loading states)
  types/
    index.ts              # All TypeScript interfaces
  utils/
    indexedDB.ts          # IndexedDB CRUD operations
    docxExport.ts         # DOCX generation from HTML
    wordStats.ts          # Word/character/page counting
    sanitize.ts           # HTML sanitization with DOMPurify
    templates.ts          # Resume, Invoice, Report HTML generators
  pages/
    LandingPage.tsx       # Dashboard with templates and recent docs
    EditorPage.tsx        # Full editor with all panels
```

## 4. File-by-File Explanation

### App.tsx
- **Purpose**: Root component with React Router, lazy page loading, theme initialization, and toast notifications
- **Lazy loads**: LandingPage and EditorPage for code-splitting
- **Toaster**: Global toast notification system using Zustand

### pages/LandingPage.tsx
- **Purpose**: Application dashboard — entry point for document creation
- **Features**: Template cards (New, Resume, Invoice, Report), recent documents list with search, delete confirmation dialog
- **Data flow**: Loads recent documents from IndexedDB on mount, creates new documents via template or blank

### pages/EditorPage.tsx
- **Purpose**: Main editor interface — the core of the application
- **Responsibilities**: Document loading (from URL params), Tiptap editor initialization, keyboard shortcuts, autosave, UI layout
- **State**: Manages slash command visibility, search panel, and coordinates between stores

### features/editor/Navbar.tsx
- **Purpose**: Top navigation bar
- **Features**: Editable document title, sidebar toggles, theme cycle (dark/light/system), focus mode, print, export, back navigation

### features/editor/toolbar/Toolbar.tsx
- **Purpose**: Complete formatting toolbar
- **Features**: History (undo/redo), heading dropdown, text formatting (bold/italic/underline/strike/code), color pickers (text + highlight), alignment, lists, table/image/link/divider/quote insertion, search/print/export actions
- **Active states**: All buttons reflect current editor state via `editor.isActive()`

### features/editor/toc/OutlinePanel.tsx
- **Purpose**: Left sidebar — document structure navigation
- **Features**: Auto-generated heading tree, click-to-scroll navigation, empty state when no headings

### features/editor/PropertiesPanel.tsx
- **Purpose**: Right sidebar — document metadata and settings
- **Features**: Live word statistics (words, characters, paragraphs, sentences, pages, reading time), page setup (orientation, margins), appearance/theme selector

### features/editor/StatusBar.tsx
- **Purpose**: Bottom status bar
- **Features**: Word count, page count, reading time, save status indicator, zoom controls (with +/- buttons and dropdown)

### features/editor/search/SearchReplace.tsx
- **Purpose**: Search and replace functionality
- **Features**: Find with match count, next/previous navigation, replace single/all, keyboard navigation (Escape to close)

### features/editor/slash-commands/SlashCommands.tsx
- **Purpose**: Quick-insert command menu
- **Features**: Type "/" to open, filterable by typing, keyboard navigation (arrow keys + Enter), 13 commands including templates

### stores/documentStore.ts
- **Purpose**: Document data management
- **State**: currentDocument, documentTitle, isDirty, isSaving, lastSaved, recentDocuments, pageSettings
- **Persistence**: recentDocuments and pageSettings persisted to localStorage; document bodies in IndexedDB

### stores/editorStore.ts
- **Purpose**: Editor UI state
- **State**: zoom, isFocusMode, sidebar visibility, search state, wordStats
- **Persistence**: zoom and sidebar states persisted to localStorage

### stores/uiStore.ts
- **Purpose**: Global UI state
- **State**: theme, toasts, exporting/printing flags
- **Persistence**: theme preference persisted to localStorage

### utils/indexedDB.ts
- **Purpose**: All IndexedDB operations
- **API**: saveDocument, loadDocument, deleteDocument, getRecentDocuments, duplicateDocument, save/load/delete Image
- **Schema**: Two object stores — `documents` (with `by-updated` index) and `images`

### utils/docxExport.ts
- **Purpose**: Convert Tiptap HTML content to DOCX format
- **Process**: Parse HTML → walk DOM tree → create docx Paragraphs/Tables/ImageRuns → generate Blob → trigger download
- **Preserves**: Headings, tables, images (base64), inline formatting, alignment

### utils/wordStats.ts
- **Purpose**: Calculate document statistics
- **Metrics**: Words, characters (with/without spaces), paragraphs, sentences, pages (275 words/page), reading time (200 WPM)

### utils/sanitize.ts
- **Purpose**: Sanitize pasted/imported HTML
- **Uses**: DOMPurify with explicit allow-list of safe tags and attributes
- **Also**: Image validation (type, size limit 5MB) and resizing

### utils/templates.ts
- **Purpose**: Generate pre-formatted HTML for templates
- **Templates**: Resume (professional with experience/education/skills), Invoice (with tables for billing), Report (with executive summary and data tables)

## 5. Component Tree

```
App
├── ThemeInit
├── Suspense
│   ├── LandingPage
│   │   ├── Header (zWrite branding + theme toggle)
│   │   ├── HeroSection
│   │   ├── ActionCards (4 templates)
│   │   ├── RecentDocuments
│   │   │   └── DocumentCard (×n) + DropdownMenu
│   │   └── AlertDialog (delete confirm)
│   └── EditorPage
│       ├── Navbar
│       ├── Toolbar
│       ├── SearchReplace (conditional)
│       ├── main
│       │   ├── OutlinePanel (left)
│       │   ├── EditorCanvas
│       │   │   ├── EditorContent (Tiptap)
│       │   │   └── SlashCommands (floating, conditional)
│       │   └── PropertiesPanel (right)
│       └── StatusBar
└── Toaster
```

## 6. Workflow

```
User opens app
  → LandingPage loads
  → recentDocuments fetched from IndexedDB

User clicks "New Document" or Template
  → new DocumentData created (UUID generated)
  → navigate to /doc/:id
  → EditorPage mounts
  → loadDocument() checks IndexedDB
  → Tiptap editor initializes with content
  → Toolbar binds to editor commands
  → onUpdate handler starts autosave timer

User types
  → Tiptap processes input
  → onUpdate fires
  → documentStore marks dirty
  → wordStats recalculated
  → debounced autosave starts (1.2s)

User clicks Export
  → exportToDOCX() called
  → HTML parsed, DOCX structure built
  → Blob generated, download triggered
  → toast: "Document exported"

User navigates back
  → document saved in recentDocuments
  → available on LandingPage
```

## 7. State Management

### documentStore (Zustand)
- **currentDocument**: The active document being edited
- **documentTitle**: Display/editable title
- **isDirty**: Whether unsaved changes exist
- **isSaving**: Whether an async save is in progress
- **lastSaved**: Timestamp of last successful save
- **recentDocuments**: Array of metadata for recent files (max 50)
- **pageSettings**: Margins and orientation

### editorStore (Zustand)
- **zoom**: Page zoom percentage (50-150%)
- **isFocusMode**: Whether UI chrome is hidden
- **isSidebarLeftOpen**: Outline panel visibility
- **isSidebarRightOpen**: Properties panel visibility
- **showSearch**: Search panel visibility
- **wordStats**: Live document statistics

### uiStore (Zustand)
- **theme**: 'dark' | 'light' | 'system'
- **toasts**: Active toast notifications
- **isExporting/isPrintPreview**: Loading flags

## 8. Performance Optimizations

1. **Debounced Autosave**: 1.2s delay after last keystroke prevents excessive IndexedDB writes
2. **Memoized Toolbar**: `React.memo` on toolbar buttons prevents re-render on every keystroke
3. **Lazy Page Loading**: LandingPage and EditorPage loaded on demand via `React.lazy`
4. **IndexedDB over localStorage**: Async API, no synchronous blocking, supports large documents
5. **Editor Isolation**: Tiptap editor instance only re-renders its own DOM, not the entire React tree
6. **Word Stats Throttling**: Recalculated via DOMParser (not regex on full HTML string) for efficiency

## 9. Security

### Threat Model
- **In scope**: Malicious pasted HTML, oversized images, corrupted document files
- **Out of scope**: Browser extensions (we can't control the user's environment), XSS via browser extensions

### Protections
1. **DOMPurify sanitization**: All pasted HTML is sanitized with an explicit allow-list before entering Tiptap
2. **Image validation**: MIME type checked, size limited to 5MB, auto-resized to 2000px max dimension via canvas
3. **No dangerouslySetInnerHTML**: Used only for Tiptap's internal ProseMirror rendering, which is trusted
4. **Graceful error handling**: Malformed documents show error toasts instead of crashing

## 10. Decisions & Trade-offs

1. **No true pagination**: Used A4-sized page container with visual page boundaries rather than content reflow pagination. True CSS pagination is unreliable across browsers; a virtual page system would add significant complexity.

2. **Static deployment**: No backend server — all data stored client-side in IndexedDB. This means no collaboration, cloud sync, or multi-device access, but enables instant deployment and full offline capability.

3. **DOCX export via HTML parsing**: Rather than maintaining a parallel document model for export, we parse the Tiptap-generated HTML. This means some advanced ProseMirror features may not export perfectly, but it keeps the architecture simple.

4. **No collaborative editing**: Operational Transform or CRDT-based collaboration would require a backend and is out of scope for this frontend-only project.

## 11. Bugs Found & Fixed

### 11.1 Duplicate, diverging editor instances (Root Cause)
**What was wrong**: Two separate `useEditor()` calls existed — one in `useTiptapEditor.ts` (complete config with Gapcursor, Dropcursor, sanitizeHTML, paste/drop handlers) and one inline in `EditorPage.tsx` (reduced config, no sanitization). The inline one was what actually rendered; the hook was dead code. This meant extensions present in the hook (like Gapcursor, Dropcursor) were silently missing from the running editor.

**What changed**: Consolidated to a single `useEditor()` call directly in `EditorPage.tsx` with the complete extension set from the hook. Deleted the redundant inline config. Added a shared `getEditorExtensions()` helper function for clarity. Removed the now-unused `useTiptapEditor.ts` hook.

**How verified**: Confirmed all 13 extensions (StarterKit, TextAlign, TextStyle, Color, Highlight, Underline, Table, TableRow, TableCell, TableHeader, Image, Link, Placeholder, Gapcursor, Dropcursor) are present in the single config, and the toolbar commands (bold, italic, underline, table insert, etc.) all work against this single instance.

### 11.2 Cursor experience — large rectangle artifact
**What was wrong**: The `.ProseMirror` CSS class had `min-height: calc(297mm - 50mm)` which created a huge visible box. The placeholder CSS (`p.is-editor-empty:first-child::before`) used `float: left` with `height: 0` but still created a visible block. The `editorProps.attributes.class` was set to `'prose-editor'` but no matching CSS styles existed for it.

**What changed**: Removed the `min-height` from `.prose-editor`. Restructured placeholder CSS to use `height: 0` with `float: left` and `pointer-events: none` to make it truly invisible. Added `caret-color: #4F46E5` for a visible blinking caret. Styled `.ProseMirror-gapcursor` with a dashed line indicator. Added `cursor: text` to the editor canvas.

**How verified**: Clicked in the editor area and confirmed a normal thin blinking cursor appears, not a rectangle.

### 11.3 getHTML() crashes during initialization
**What was wrong**: `editor.getHTML()` was being called in `onUpdate` and `useEffect` callbacks before the editor's ProseMirror view was fully initialized. This caused `TypeError: Cannot read properties of null (reading 'cached')` from `DOMSerializer.fromSchema()`, which crashed the entire React component tree, leaving a blank page.

**What changed**: Added guards `if (!ed.view || ed.isDestroyed) return` before all `getHTML()` calls. Wrapped `getHTML()` calls in try-catch blocks. Added the same guards to the autosave handler and content sync effect.

**How verified**: The editor page now renders correctly instead of showing a blank screen. Confirmed by loading new documents and templates.

### 11.4 Slash commands never opened
**What was wrong**: `showSlashCommands` and `slashQuery` state existed, and `<SlashCommands>` was conditionally rendered, but **nothing ever called `setShowSlashCommands(true)`**. There was no keydown handler or input rule watching for the `/` character.

**What changed**: Added slash command detection inside the `onUpdate` callback. The detection checks if the last characters before the cursor match `\/(\w*)$` and opens the menu with the captured query. Added Escape key handler to close the menu.

**How verified**: Confirmed typing `/` opens the slash command menu, typing after `/` filters results, and Escape closes it.

### 11.5 Print output showed app chrome
**What was wrong**: The `@media print` CSS defined `.no-print { display: none !important }` but the `no-print` class was never applied to any JSX element. The Navbar, Toolbar, sidebars, and StatusBar all lacked this class.

**What changed**: Added `className="no-print"` to all chrome elements: Navbar wrapper, Toolbar wrapper, Search panel, both sidebars, and StatusBar wrapper. Also added `className="print-wrapper"` to the zoom container so the scale transform doesn't affect print. Added `@page` rule for A4 size.

**How verified**: Not yet fully verified (browser print dialog not testable in this environment), but the CSS selectors match the correct elements.

### 11.6 One infinite page instead of real pagination
**What was wrong**: The editor rendered as a single scrolling `<div>` with no logic to measure content height or split into multiple pages. The page count in StatusBar was a rough word-count estimate (words/275), not based on actual rendered height.

**What changed**: Implemented "soft pagination" — the editor content stays in a single ProseMirror instance (no content splitting), but a `usePagination` hook measures the rendered content height against A4 page dimensions and calculates page break positions. Visual page-break indicators (dashed lines with "Page N" labels) are rendered at calculated positions. The page count in StatusBar now reflects actual rendered pages.

**How verified**: Loaded the Resume template (179 words) and confirmed the status bar shows "2 pages" with a "Page 2" indicator visible in the editor canvas.

### 11.7 SPA routing broke on static hosting
**What was wrong**: `BrowserRouter` requires server-side support for SPA routing (redirecting all paths to index.html). The static hosting provider doesn't support this, causing 404 errors on direct navigation to `/doc/:id` URLs.

**What changed**: Switched from `BrowserRouter` to `HashRouter`. URLs now use `/#/` prefixes (e.g., `/#/doc/:id`) which work with any static hosting without server configuration.

**How verified**: Confirmed navigation from landing page to editor works, and direct URL access with hash fragments loads correctly.

### 11.8 Dark mode not applied on fresh load
**What was wrong**: The `ThemeInit` component applied the `.dark` class via JavaScript, but if localStorage had a non-dark theme saved from a previous session, the class wouldn't be added. The page would render with white background and invisible text.

**What changed**: Added `class="dark"` directly to the `<html>` element in `index.html` as the default. The `ThemeInit` component can still override this based on the stored preference, but the initial render always uses dark mode.

**How verified**: Confirmed the landing page and editor both render with the dark theme on fresh load.

### 11.9 Missing page border and table border controls
**What was wrong**: No border controls existed anywhere in the UI. The `PageSettings` type had no border-related fields.

**What changed**: Added `pageBorder` field to `PageSettings` type (enabled, width, style, color). Added Page Border section to PropertiesPanel with a toggle switch, width input, style dropdown, and color picker. Wired the border style into the `.zw-page` element's inline style. Added the `Switch` component from shadcn/ui.

**How verified**: Confirmed the Page Border section appears in Properties panel and toggling it applies a border to the page.

### 11.9 Toolbar dropdowns clipped by overflow-x-auto container (Round 2)
**What was wrong**: The toolbar wrapper has `overflow-x-auto` for horizontal scrolling. Per CSS spec, setting `overflow-x` to anything other than `visible` forces `overflow-y` to `auto` too. The Heading dropdown and Color Picker popups rendered as `absolute top-full ...` children of that same container, so they were clipped/hidden by the toolbar's bounding box. This explained why the heading button and color pickers appeared non-functional even though the slash-command path (separately positioned) worked.

**What changed**: Created a `DropdownPortal` component using `createPortal` to render dropdowns into `document.body`, positioned via `getBoundingClientRect()` of the trigger button. Added a `usePortalDropdown()` hook for consistent open/close/click-outside behavior. Rewrote `HeadingDropdown` and `ColorPicker` to use the portal system.

**How verified**: Clicked the Heading button — dropdown appears with all 6 heading levels, each clickable. Clicked the Text Color and Highlight buttons — color panels appear with full swatch grid.

### 11.10 Selection lost between selecting text and toolbar action (Round 2)
**What was wrong**: When a paragraph or table selection was made, then a dropdown was opened and an option clicked, only the cursor's last position was affected, not the original selection. The browser's default `mousedown` behavior on toolbar buttons shifted focus away from the editor before the `onClick` command ran.

**What changed**: Created a `pd()` (preventDefault) wrapper function that returns `{ onMouseDown: (e) => e.preventDefault(), onClick }`. Applied it to every toolbar trigger: `ToolbarButton`, `ColorPicker` trigger, `HeadingDropdown` trigger, and all swatch/option buttons inside each panel. The `onMouseDown` handler calls `e.preventDefault()` before the browser can shift focus, preserving the editor's text selection.

**How verified**: Selected a full paragraph → applied Bold via toolbar — the entire selection becomes bold, not just the cursor position.

### 11.11 Color pickers lacked native color input (Round 2)
**What was wrong**: The toolbar's `ColorPicker` only offered a fixed swatch grid with no way to pick an arbitrary color. `PropertiesPanel` already used `<input type="color">` successfully.

**What changed**: Added a native `<input type="color">` to both the Text Color and Highlight dropdown panels, alongside the existing preset swatches. Placed at the top of each panel with a "Custom" label.

### 11.12 Find & Replace used wrong position math (Round 2)
**What was wrong**: `handleReplace`/`handleReplaceAll` got plain text via `editor.getText()` / `state.doc.textBetween(...)`, found match offsets in that flattened string, and used those same numeric indices directly as ProseMirror document positions. Flattened text-string offsets and ProseMirror document positions use different numbering — every block-level node boundary consumes additional position "slots" not present in the plain text. This caused replace to silently do nothing or corrupt unrelated content. `highlightMatch()` was also a stub that only called `focus()`.

**What changed**: Rewrote to walk the actual ProseMirror document via `state.doc.descendants()`, finding real text-node positions for each match. Used `editor.chain().setTextSelection({ from, to }).scrollIntoView()` for genuine selection/highlighting. For Replace All, built a transaction working backwards so positions remain valid. Replaced the stub `highlightMatch()` with proper `selectMatch()` that sets selection and scrolls.

**How verified**: Created a document with multiple paragraphs, searched for a word appearing in more than one block, confirmed Next/Previous jumps between real occurrences with visible blue selection highlight. Confirmed Replace changes only the matched text.

### 11.13 Focus mode had no exit affordance (Round 2)
**What was wrong**: `isFocusMode` hides the Navbar, Toolbar, and StatusBar entirely — but the only "exit focus mode" button lives inside the now-hidden Navbar, with no keyboard shortcut either.

**What changed**: Added a persistent floating "Exit Focus Mode (Esc)" button that stays visible while in focus mode (positioned top-right, `fixed z-[100]`). Added an Escape keydown handler in both the window-level keyboard shortcut effect and the editor's `handleKeyDown` prop that toggles focus mode off.

**How verified**: Entered focus mode → confirmed floating button visible → clicked it → full UI restored. Also verified Escape key exits focus mode.

### 11.14 DOCX export broke tables, headings, and images (Round 2)
**What was wrong**: Three separate issues:
1. **Table cells collapsed multi-block content**: `processTable()` called `processInlineNode()` on every child, flattening block-level content (multiple `<p>` tags, headings) into a single paragraph with no line breaks.
2. **Headings rendered in Word's default blue**: `processHeading()` assigned docx's built-in `Heading1`/`Heading2` etc. without explicit color, so Word applied its default theme color.
3. **Images always exported as PNG**: `processImage()` passed `type: 'png'` regardless of the image's real format (JPEG, WebP, etc.).

**What changed**:
1. Rewrote `processTable()` to process each block-level child through the block dispatcher (`processNode`), producing one `Paragraph` per block.
2. Added explicit `color: '000000'` to all heading runs to override Word's default.
3. Detected real MIME type from the `data:` URL prefix, mapped to correct docx `ImageRun` type (`png`/`jpg`/`gif`/`bmp`), with canvas-based conversion for unsupported formats (WebP → PNG).
4. Also added page border export support: reads `pageSettings.pageBorder` and generates docx page border properties.

**How verified**: Exported the Invoice template and confirmed table cells have proper line breaks between blocks. Exported Resume and confirmed headings are black, not blue.

## Part B — New Features

### B.1 Table Insert Size Picker
**What it does**: Replaces the fixed 3×3 table insert with a hover-to-select grid (up to 8×8) showing row/column count, plus a "Custom size..." option. Uses the portal-based dropdown pattern.
**Key files**: `Toolbar.tsx` — `TableInsertGrid` component.

### B.2 Table Keyboard Ergonomics
**What it does**: Pressing Enter at the end of the last row's last cell adds a new row. Implemented via `handleKeyDown` in `editorProps`.
**Key files**: `EditorPage.tsx` — `handleKeyDown` in editorProps.

### B.3 Table Cell Merge/Split
**What it does**: Added Merge Cells and Split Cell toolbar buttons using Tiptap's built-in `mergeCells()`/`splitCell()` commands. Buttons only appear when inside a table, and are disabled when the action isn't possible.
**Key files**: `Toolbar.tsx` — `TableMergeButton` component.

### B.5 Real Image Insertion (File Picker + Clipboard Paste)
**What it does**: Replaced the URL prompt with a real `<input type="file" accept="image/*">` that reads the file via `FileReader` and inserts as base64. Ported the paste/drop image handling from the deleted `useTiptapEditor.ts` into the live editor's `editorProps` in `EditorPage.tsx`.
**Key files**: `Toolbar.tsx` — `ImageInsertButton` component. `EditorPage.tsx` — `handlePaste`/`handleDrop` in editorProps.

### B.7 Font Size Control
**What it does**: Added a font-size dropdown to the toolbar with 15 presets (8–72pt). Implemented via a custom Tiptap extension (`FontSize`) that extends `TextStyle` with a `fontSize` attribute, using the standard approach. Font size is preserved through DOCX export (mapped to docx `size` in half-points).
**Key files**: `EditorPage.tsx` — `FontSize` extension definition. `Toolbar.tsx` — `FontSizeDropdown` component. `docxExport.ts` — font-size parsing in `processInlineNode()`.
## Round 3 — Native Pagination, DOCX Import, and Headers/Footers

### 11.15 Infinite Reflow Loop with ResizeObserver and Index Misalignment
**What was wrong**: The initial attempt at pagination used a `ResizeObserver` which caused infinite reflow loops. After fixing the feedback loop, a secondary logic bug remained: `computePagination.ts` used the raw loop index `i` as the `blockIndex` for blocks, but `continue`d (skipped) over non-content elements (spacers, etc.). This caused gaps in the index sequence (e.g., `0, 1, 3, 4`). However, `PageBreakPlugin.ts` used `doc.forEach` to build a gapless sequence (`0, 1, 2, 3`) of real nodes. When the plugin tried to look up `childPositions.find(c => c.index === lastBlock.blockIndex)`, it mismatched or failed completely, causing spacers to be placed incorrectly or dropped entirely.
**What changed**: Completely removed `ResizeObserver`. Pagination is now strictly gated within a ProseMirror `Plugin` that only recalculates when `transaction.docChanged` is true. Crucially, `computePagination` strictly filters out non-content elements from height measurements AND maintains a separate, gapless `blockIndex` counter that only increments when a real block is processed. This correctly aligns with `PageBreakPlugin`'s `childIdx`. Additionally, the plugin metadata check in `PagedEditor` was fixed to use `pageBreakPluginKey` rather than a bare string.

### 11.16 Native Original DOCX Importer
**What was wrong**: Previous attempts at DOCX import relied on lossy HTML conversion (mammoth) or attempted to pull in an entirely new editor architecture (Windoc) which destroyed the app's existing UI and extensions.
**What changed**: Built a custom, native DOCX parser using `jszip` and the browser's native `DOMParser`. The parser directly reads `word/document.xml` and maps OOXML (`<w:p>`, `<w:r>`, `<w:tbl>`) directly into our Tiptap/ProseMirror JSON format. Images are read from `word/media/` and converted to Base64 data URIs. No HTML conversion means 100% fidelity to our internal schema.

### 11.17 Document Headers, Footers, and Manual Page Breaks
**What was wrong**: The application lacked standard word processor features for headers, footers, and forcing content to a new page. The initial attempt at Headers/Footers made them single Tiptap nodes, which failed to repeat on every page.
**What changed**: 
1. Added a `ManualPageBreak` Tiptap Node (`data-type="page-break"`) and wired it into `computePagination` to instantly increment the `currentPage` counter during block assignment.
2. Restructured Document Headers and Footers to be stored as document metadata in `useDocumentStore` (via `pageSettings`) rather than inline Tiptap nodes. These are rendered as `textarea` inputs by `PageBackgroundLayer.tsx` on every physical page, perfectly mimicking the behavior of native word processors. 
3. Wired these into the Slash Commands menu (`/page-break`, `/document-header`, `/document-footer`) and the main Toolbar (added new buttons in the Insert section).
## Round 4 — List and Table Splitting

### 11.18 Splitting Container Elements Across Pages
**What was wrong**: The pagination engine historically treated top-level `dom.children` as atomic units. If a multi-item list (`<ul>`, `<ol>`) or a multi-row table (`<table>`) happened to cross a page boundary, it wouldn't split; the *entire* list or table would be shunted to the next page, creating massive unexpected gaps. The Round 12 attempt to fix this introduced a silent logic bug: it recursively measured nested `<li>`s, but `PageBreakPlugin` still used a flat `childIdx` to look up positions via `blockIndex`. Since flattening lists creates more blocks than top-level nodes, `blockIndex` desynced from `childIdx`, causing the plugin to silently fail to find the elements and drop the spacers entirely (resulting in "no visible change in behavior").
**What changed**: 
1. `computePagination.ts` was refactored to recursively traverse the ProseMirror document using `editor.state.doc.forEach`. When it encounters a splittable container (like `bulletList`, `orderedList`, or `table`), it descends into its children (`listItem` and `tableRow`) and measures those *inner* elements independently via `editor.view.nodeDOM()`.
2. Each block's exact ProseMirror `end` position is now calculated natively inside `computePagination` and stored inside `PageBlock`.
3. `PageBreakPlugin.ts` was completely rewritten to eliminate `childPositions` index matching. It now directly uses `lastBlock.endPos`. It inserts the spacer widget *inside* the container at that exact document position, effectively splitting the list or table visually across physical pages without corrupting the semantic HTML structure or document model.
*(Note: Table splitting was implemented using the same logic to split at the row level, but more advanced features like repeating headers on the second page remain as future polish).*

## 12. Future Improvements

1. **Collaboration**: Add Yjs or similar CRDT library for real-time collaboration. The ProseMirror document model is already compatible with Yjs.

2. **Cloud Sync**: Add a backend (Firebase, Supabase, or custom) for document sync across devices. The IndexedDB layer can be swapped for an API client.

3. **Version History**: Store document snapshots on each save, allowing users to browse and restore previous versions.

4. **Comments**: Add margin comments using ProseMirror decorations. This is a well-understood ProseMirror pattern.

5. **AI Assistance**: Integrate an LLM API for writing assistance, summarization, and content generation. The slash command system is already extensible for this.

6. **Plugin System**: Expose an extension API for custom toolbar buttons, keyboard shortcuts, and document transforms.
