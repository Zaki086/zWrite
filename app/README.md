# zWrite

A production-quality, offline-capable rich text editor built for document creation, editing, and export. Built with React 19, Tiptap/ProseMirror, and Tailwind CSS.

## Features

### Rich Text Editing
- Paragraph, Heading 1–6, Bold, Italic, Underline, Strikethrough, Inline Code
- Text color and highlight color pickers
- Left, Center, Right, Justify alignment
- Bullet and numbered lists with nesting support
- Blockquotes and horizontal rules
- Tables with resize support, headers, and cell formatting
- Images (drag-drop, paste, URL insertion)
- Links with autolinking

### Document Management
- Create, open, rename, duplicate, and delete documents
- Recent documents list with search
- Autosave to IndexedDB (debounced 1.2s after last edit)
- Document persistence across browser sessions

### Templates
- **Resume** — Professional resume with sections for experience, education, and skills
- **Invoice** — Business invoice with itemized billing and payment details
- **Report** — Formal business report with executive summary and analysis

### Export & Print
- DOCX export preserving headings, tables, images, inline formatting, and page breaks
- Print preview and direct printing

### UI/UX
- Dark mode (default) and light mode with system preference support
- Focus mode — hides all UI for distraction-free writing
- Zoom control (50%, 75%, 100%, 125%, 150%)
- Collapsible left sidebar (Outline) and right sidebar (Properties)
- Keyboard shortcuts for all major actions
- Slash commands (/) for quick insertion
- Search & Replace with match navigation
- Live word statistics (words, characters, paragraphs, sentences, pages, reading time)

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |
| Ctrl+S | Export DOCX |
| Ctrl+P | Print |
| Ctrl+F | Search |
| Ctrl+H | Search & Replace |
| Ctrl+K | Insert Link |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |

## Browser Support

- Chrome 120+
- Firefox 121+
- Edge 120+
- Safari 17+

Internet Explorer and legacy browsers are not supported.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 + Vite | UI framework and build tool |
| TypeScript (strict) | Type safety |
| Tailwind CSS | Styling |
| Tiptap (ProseMirror) | Editor core |
| Zustand | State management |
| Framer Motion | Animations |
| React Router | Client-side routing |
| shadcn/ui | UI component primitives |
| docx | DOCX export |
| IndexedDB (idb) | Document persistence |
| DOMPurify | HTML sanitization |

## Getting Started

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

## Project Structure

```
src/
  app/                    # App shell and providers
  components/ui/          # shadcn/ui components
  features/
    editor/               # Editor feature modules
      toolbar/            # Formatting toolbar
      toc/                # Table of contents / outline
      search/             # Search & replace
      slash-commands/     # Slash command menu
  hooks/                  # Custom React hooks
  stores/                 # Zustand stores
  types/                  # TypeScript type definitions
  utils/                  # Utility functions
  pages/                  # Route-level pages
  routes/                 # Router configuration
```

## Performance

- Typing latency target: <16ms per keystroke
- Debounced autosave and word-count recalculation
- Memoized toolbar and sidebar components
- Lazy-loaded panels and dialogs
- IndexedDB for large document storage (not localStorage)

## License

MIT
