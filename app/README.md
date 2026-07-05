# zWrite

A production-quality, offline-capable rich text editor built for document creation, editing, and professional export. Engineered with React 19, Tiptap/ProseMirror, and Tailwind CSS.

zWrite stands out by introducing **True-to-Life A4 Continuous Pagination** inside a web-based `contenteditable` environment. It perfectly bridges the gap between modern block editors and traditional word processors like Microsoft Word or Google Docs.

## 🌟 Key Features

### True-to-Life A4 Pagination (Single-Pass Architecture)
Unlike standard web editors that flow endlessly, zWrite gives you a real page-by-page writing experience:
- **Continuous A4 Rendering**: Visually distinct pages with margins and drop shadows that dynamically spawn as you type.
- **Deterministic Single-Pass Math**: Our custom algorithm calculates element heights, margin collapses, and page capacities in real-time, injecting `Page Break Spacers` precisely where needed to perfectly align content onto fixed visual pages.
- **Flawless Multi-Item Splits**: Lists and tables automatically break across pages instead of jumping as a single block.
- **Native Header & Footer Support**: Add headers and footers that repeat across pages and map directly into DOCX exports.
- **Manual Page Breaks**: Force content to the next page with a dedicated shortcut or toolbar button.

### Robust DOCX Export
We don't rely on basic HTML-to-DOCX libraries. zWrite uses a custom AST-walker that translates ProseMirror JSON directly into native Word OpenXML:
- Preserves Headings, Tables, Lists, and Inline Formatting perfectly.
- **Intelligent Image Export**: Resolves all images (including data URIs, WebP, and blobs) via an offscreen HTML5 `<canvas>` before safely embedding them into the DOCX as native PNG runs.
- Maps your zWrite Headers, Footers, and Page Breaks directly into native Word `<w:hdr>` and `<w:ftr>` components.
- Sets exact A4 margins, strict body fonts, and paragraph line spacing (without relying on Word's unpredictable defaults).

### Print-Ready
- Seamlessly integrates with the browser's native Print dialog.
- Perfectly synced page counts (WYSIWYG print preview).
- Automatically strips out UI chrome (sidebars, toolbars) during printing.

### Rich Text Editing
- Paragraph, Heading 1–6, Bold, Italic, Underline, Strikethrough, Inline Code.
- Text color and highlight color pickers.
- Left, Center, Right, Justify alignment.
- Bullet and numbered lists with deep nesting.
- Blockquotes, horizontal rules, and Tables (with resize support, headers, and cell formatting).
- Images with drag-drop, paste, and URL insertion.
- Links with autolinking.

### Document Management
- **Offline First**: All documents autosave to IndexedDB (debounced 1.2s after last edit).
- Document persistence across browser sessions.
- Create, open, rename, duplicate, and delete documents.
- Searchable recent documents list.

### UI / UX
- **Stunning Design**: Beautifully curated colors, smooth micro-animations, and a highly responsive Tailwind UI.
- Dark mode (default) and light mode with system preference support.
- Focus mode — hides all UI for distraction-free writing.
- Zoom control (50%, 75%, 100%, 125%, 150%).
- Collapsible Outline (left sidebar) and Properties (right sidebar).
- Slash commands (`/`) for rapid insertion.
- Search & Replace with match navigation.
- Live telemetry: Words, characters, paragraphs, sentences, pages, and reading time.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+S` | Export DOCX |
| `Ctrl+P` | Print |
| `Ctrl+F` | Search |
| `Ctrl+H` | Search & Replace |
| `Ctrl+K` | Insert Link |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 + Vite | UI framework and build tool |
| TypeScript (strict) | Type safety |
| Tailwind CSS | Styling and animations |
| Tiptap (ProseMirror) | Core editor engine |
| Zustand | Global state management |
| Framer Motion | Smooth UI transitions |
| React Router | Client-side routing |
| shadcn/ui | Beautiful UI component primitives |
| docx | Native Word OpenXML generation |
| IndexedDB (idb) | Large document persistence |
| DOMPurify | HTML sanitization |

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## ⚡ Performance

- **Typing Latency**: Target <16ms per keystroke.
- **Synchronous Layout Engine**: The pagination algorithm fires directly on ProseMirror state updates using a highly optimized, gapless sequential read of the DOM.
- **Debounced Storage**: IndexedDB is used heavily over `localStorage` to ensure megabyte-sized documents don't block the main thread.
- **Memoized Architecture**: Toolbars, sidebars, and panels are aggressively memoized to prevent unnecessary re-renders during active typing.

## 📄 License

MIT
