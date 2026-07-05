import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
// import Image from '@tiptap/extension-image';
import { ResizableImage } from '@/features/editor/image/ResizableImage';
import Placeholder from '@tiptap/extension-placeholder';
import Gapcursor from '@tiptap/extension-gapcursor';
import Dropcursor from '@tiptap/extension-dropcursor';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { loadDocument, saveDocument } from '@/utils/indexedDB';
import { exportToDOCX } from '@/utils/docxExport';
import { calculateWordStats } from '@/utils/wordStats';
import { getTemplateHTML } from '@/utils/templates';
import { generateUUID } from '@/utils/uuid';
import type { DocumentData } from '@/types';

import { Navbar } from '@/features/editor/Navbar';
import { Toolbar } from '@/features/editor/toolbar/Toolbar';
import { OutlinePanel } from '@/features/editor/toc/OutlinePanel';
import { PropertiesPanel } from '@/features/editor/PropertiesPanel';
import { StatusBar } from '@/features/editor/StatusBar';
import { SearchReplace } from '@/features/editor/search/SearchReplace';
import { SlashCommands, getSlashCommands } from '@/features/editor/slash-commands/SlashCommands';
import { PagedEditor } from '@/features/editor/pagination/PagedEditor';
import { PageBreakExtension } from '@/features/editor/pagination/PageBreakExtension';
import { ManualPageBreak } from '@/features/editor/pagination/ManualPageBreak';

const AUTOSAVE_DELAY = 1200;

/* ------------------------------------------------------------------ */
/*  FontSize extension — extends TextStyle with a font-size attr      */
/* ------------------------------------------------------------------ */
import { Extension } from '@tiptap/core';
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

/* ------------------------------------------------------------------ */
/*  Shared extensions config — single source of truth                  */
/* ------------------------------------------------------------------ */
function getEditorExtensions() {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'], defaultAlignment: 'left' }),
    TextStyle,
    FontSize.configure({ types: ['textStyle'] }),
    Color.configure({ types: ['textStyle'] }),
    Highlight.configure({ multicolor: true }),
    Underline,
    Table.configure({ resizable: true, allowTableNodeSelection: true }),
    TableRow,
    TableCell,
    TableHeader,
    ResizableImage.configure({ allowBase64: true }),
    PageBreakExtension,
    ManualPageBreak,
    Link.configure({ openOnClick: false, autolink: true }),
    Placeholder.configure({ placeholder: 'Start writing or type "/" for commands...' }),
    Gapcursor,
    Dropcursor.configure({ color: '#4F46E5', width: 2 }),
  ];
}

/* ------------------------------------------------------------------ */
/*  Editor Page                                                        */
/* ------------------------------------------------------------------ */

export default function EditorPage() {
  const { docId, templateId } = useParams<{ docId?: string; templateId?: string }>();
  const navigate = useNavigate();

  const setCurrentDocument = useDocumentStore((s) => s.setCurrentDocument);
  const pageSettings = useDocumentStore((s) => s.pageSettings);
  const setIsSaving = useDocumentStore((s) => s.setIsSaving);
  const setLastSaved = useDocumentStore((s) => s.setLastSaved);
  const addRecentDocument = useDocumentStore((s) => s.addRecentDocument);

  const zoom = useEditorStore((s) => s.zoom);
  const isFocusMode = useEditorStore((s) => s.isFocusMode);
  const isSidebarLeftOpen = useEditorStore((s) => s.isSidebarLeftOpen);
  const isSidebarRightOpen = useEditorStore((s) => s.isSidebarRightOpen);
  const showSearch = useEditorStore((s) => s.showSearch);
  const toggleSidebarLeft = useEditorStore((s) => s.toggleSidebarLeft);
  const toggleSidebarRight = useEditorStore((s) => s.toggleSidebarRight);
  const toggleFocusMode = useEditorStore((s) => s.toggleFocusMode);
  const setShowSearch = useEditorStore((s) => s.setShowSearch);

  const addToast = useUIStore((s) => s.addToast);

  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashCommandIndex, setSlashCommandIndex] = useState(0);
  const [editorContent, setEditorContent] = useState('<p></p>');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBackspaceRef = useRef<number>(0);
  const [pageCount, setPageCount] = useState(1);
  const onPageCountChange = useCallback((count: number) => {
    setPageCount(count);
  }, []);

  /* ---- Load document ---- */
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        if (templateId) {
          const newDoc: DocumentData = {
            id: generateUUID(),
            title: templateId.charAt(0).toUpperCase() + templateId.slice(1),
            content: getTemplateHTML(templateId),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          if (!cancelled) {
            setCurrentDocument(newDoc);
            setEditorContent(newDoc.content);
            await saveDocument(newDoc);
            navigate(`/doc/${newDoc.id}`, { replace: true });
          }
        } else if (docId && docId !== 'new') {
          const loaded = await loadDocument(docId);
          if (!cancelled) {
            if (loaded) {
              setCurrentDocument(loaded);
              setEditorContent(loaded.content || '<p></p>');
            } else {
              const newDoc = useDocumentStore.getState().createNewDocument();
              setEditorContent('<p></p>');
              navigate(`/doc/${newDoc.id}`, { replace: true });
            }
          }
        } else {
          const newDoc = useDocumentStore.getState().createNewDocument();
          if (!cancelled) {
            setCurrentDocument(newDoc);
            setEditorContent('<p></p>');
            navigate(`/doc/${newDoc.id}`, { replace: true });
          }
        }
      } catch (err) {
        console.error('Failed to init document:', err);
        setHasError(true);
      }
      if (!cancelled) setIsLoaded(true);
    }
    init();
    return () => { cancelled = true; };
  }, [docId, templateId]);

  /* ---- Single editor instance with paste/drop, table keyboard ---- */
  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: editorContent,
    onUpdate: ({ editor: ed }) => {
      if (!ed.view || ed.isDestroyed) return;
      try {
        const html = ed.getHTML();
        useDocumentStore.getState().updateContent(html);
        const stats = calculateWordStats(html, pageCount);
        useEditorStore.getState().setWordStats(stats);

        // Slash command detection
        const { state } = ed;
        const { from } = state.selection;
        const text = state.doc.textBetween(Math.max(0, from - 30), from);
        const match = text.match(/\/([a-zA-Z]*)$/);
        if (match) {
          setShowSlashCommands(true);
          setSlashQuery(match[1]);
        } else {
          setShowSlashCommands(false);
          setSlashQuery('');
        }
      } catch {
        // Ignore
      }
    },
    autofocus: 'end',
    editorProps: {
      attributes: { class: 'prose-editor' },
      handleKeyDown: (_view, event) => {
        // ===== SLASH COMMAND KEYBOARD (Section 2 Fix) =====
        if (showSlashCommands) {
          const commands = getSlashCommands();
          const filtered = commands.filter((cmd) =>
            cmd.label.toLowerCase().includes(slashQuery.toLowerCase()) ||
            cmd.description.toLowerCase().includes(slashQuery.toLowerCase())
          );
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSlashCommandIndex((i) => (i + 1) % filtered.length);
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSlashCommandIndex((i) => (i - 1 + filtered.length) % filtered.length);
            return true;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (filtered[slashCommandIndex]) {
              filtered[slashCommandIndex].action(editor);
              closeSlashCommands();
            }
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            closeSlashCommands();
            return true;
          }
        }

        // Focus mode exit on Escape
        if (event.key === 'Escape' && isFocusMode) {
          toggleFocusMode();
          return true;
        }

        // ===== TABLE KEYBOARD (Section 3 Fix) =====
        if (editor?.isActive('table')) {
          const { state } = editor;
          const { $from } = state.selection;

          // Find table, row, and cell depths by walking up the tree
          let cellDepth = -1;
          let rowDepth = -1;
          for (let d = $from.depth; d >= 0; d--) {
            const name = $from.node(d).type.name;
            if (name === 'table_cell' || name === 'table_header') cellDepth = d;
            if (name === 'table_row') rowDepth = d;
          }

          // --- Enter at end of last cell in last row → add new row ---
          if (event.key === 'Enter' && cellDepth >= 0 && rowDepth >= 0) {
            const cellEnd = $from.end(cellDepth);
            const isAtEnd = $from.pos >= cellEnd - 1;
            const rowIndex = $from.index(rowDepth);
            const tableNode = $from.node(rowDepth - 1);
            const isLastRow = tableNode ? rowIndex === tableNode.childCount - 1 : false;
            if (isAtEnd && isLastRow) {
              editor.chain().focus().addRowAfter().run();
              return true;
            }
          }

          // --- Double-backspace in table → delete current row ---
          if (event.key === 'Backspace' && cellDepth >= 0 && rowDepth >= 0) {
            const now = Date.now();
            const timeSinceLast = now - lastBackspaceRef.current;
            lastBackspaceRef.current = now;
            if (timeSinceLast < 400) {
              // Second backspace within 400ms: delete the row
              editor.chain().focus().deleteRow().run();
              return true;
            }
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                  view.dispatch(view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: result })
                  ));
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files) return false;
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) {
                view.dispatch(view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src: result })
                ));
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Recalculate stats when page count changes
  useEffect(() => {
    if (!editor?.view || editor.isDestroyed) return;
    try {
      const html = editor.getHTML();
      const stats = calculateWordStats(html, pageCount);
      useEditorStore.getState().setWordStats(stats);
    } catch { /* ignore */ }
  }, [pageCount, editor]);

  // Reset slash command selection when query changes
  useEffect(() => {
    setSlashCommandIndex(0);
  }, [slashQuery]);

  // Sync external content
  useEffect(() => {
    if (!editor?.view || editor.isDestroyed) return;
    try {
      if (editorContent && editorContent !== editor.getHTML()) {
        editor.commands.setContent(editorContent);
      }
    } catch { /* ignore */ }
  }, [editor, editorContent]);

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key === 'f') { e.preventDefault(); setShowSearch(true); }
      if (isCtrl && e.key === 'h') { e.preventDefault(); setShowSearch(true); }
      if (isCtrl && e.key === 'p') { e.preventDefault(); handlePrint(); }
      if (isCtrl && e.key === 's') { e.preventDefault(); handleExport(); }
      // Focus mode exit (Escape handled in editor's handleKeyDown when slash commands are open)
      if (e.key === 'Escape' && isFocusMode) {
        toggleFocusMode();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, toggleFocusMode]);

  /* ---- Autosave ---- */
  useEffect(() => {
    if (!editor || !useDocumentStore.getState().currentDocument) return;
    const handleAutosave = () => {
      if (!editor.view || editor.isDestroyed) return;
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      setIsSaving(true);
      autosaveTimerRef.current = setTimeout(async () => {
        try {
          const html = editor.getHTML();
          const stats = calculateWordStats(html, pageCount);
          const currentDoc = useDocumentStore.getState().currentDocument;
          if (!currentDoc) return;
          const docToSave: DocumentData = {
            ...currentDoc,
            title: useDocumentStore.getState().documentTitle,
            content: html,
            updatedAt: Date.now(),
          };
          await saveDocument(docToSave);
          setIsSaving(false);
          setLastSaved(Date.now());
          addRecentDocument({
            id: docToSave.id,
            title: docToSave.title,
            createdAt: docToSave.createdAt,
            updatedAt: docToSave.updatedAt,
            wordCount: stats.words,
            charCount: stats.characters,
            pageCount: stats.pages,
          });
        } catch {
          setIsSaving(false);
        }
      }, AUTOSAVE_DELAY);
    };
    editor.on('update', handleAutosave);
    return () => {
      editor.off('update', handleAutosave);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [editor]);

  /* ---- Before unload ---- */
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (useDocumentStore.getState().isDirty) { e.preventDefault(); e.returnValue = ''; }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handlePrint = useCallback(() => window.print(), []);

  const handleExport = useCallback(async () => {
    if (!editor) return;
    try {
      useUIStore.getState().setIsExporting(true);
      const title = useDocumentStore.getState().documentTitle;
      await exportToDOCX(editor, pageSettings, title);
      addToast({ message: 'Document exported', type: 'success' });
    } catch (err) {
      console.error('DOCX export failed:', err);
      addToast({ message: 'Export failed', type: 'error' });
    } finally {
      useUIStore.getState().setIsExporting(false);
    }
  }, [editor, pageSettings, addToast]);

  const closeSlashCommands = useCallback(() => {
    setShowSlashCommands(false);
    setSlashQuery('');
    setSlashCommandIndex(0);
  }, []);

  const executeSlashCommand = useCallback((index: number) => {
    if (!editor) return;
    const commands = getSlashCommands();
    const filtered = commands.filter((cmd) =>
      cmd.label.toLowerCase().includes(slashQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(slashQuery.toLowerCase())
    );
    if (filtered[index]) {
      filtered[index].action(editor);
      closeSlashCommands();
    }
  }, [editor, slashQuery, closeSlashCommands]);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-destructive font-medium mb-2">Something went wrong</p>
          <button onClick={() => navigate('/')} className="text-sm text-primary hover:underline" type="button">Back to home</button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <div className={`no-print ${isFocusMode ? 'hidden' : ''}`}>
        <Navbar onToggleSidebarLeft={toggleSidebarLeft} onToggleSidebarRight={toggleSidebarRight} onPrint={handlePrint} onExport={handleExport} onToggleFocus={toggleFocusMode} onBack={() => navigate('/')} editor={editor} />
      </div>

      {/* Toolbar */}
      <div className={`no-print ${isFocusMode ? 'hidden' : ''}`}>
        <Toolbar editor={editor} onSearch={() => setShowSearch(true)} onPrint={handlePrint} onExport={handleExport} />
      </div>

      {/* Search */}
      {showSearch && <div className="no-print"><SearchReplace editor={editor} onClose={() => setShowSearch(false)} /></div>}

      {/* Focus mode exit floating button */}
      {isFocusMode && (
        <button
          onClick={toggleFocusMode}
          className="no-print fixed top-4 right-4 z-[100] px-3 py-1.5 rounded-full bg-primary/80 text-primary-foreground text-xs font-medium backdrop-blur-sm hover:bg-primary transition-colors shadow-lg"
          type="button"
        >
          Exit Focus Mode (Esc)
        </button>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {isSidebarLeftOpen && !isFocusMode && (
          <aside className="no-print w-[260px] flex-shrink-0 border-r border-border bg-card/50 overflow-y-auto zw-scrollbar">
            <OutlinePanel editor={editor} />
          </aside>
        )}

        {/* Editor Canvas with real multi-page rendering */}
        <main className="flex-1 overflow-y-auto zw-scrollbar bg-muted/30 relative cursor-text" onClick={(e) => { if (e.target === e.currentTarget && editor) editor.commands.focus('end'); }}>
          <div className="min-h-full py-8 px-4 print-wrapper" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
            <PagedEditor
              editor={editor}
              topMarginMm={pageSettings.margins.top}
              bottomMarginMm={pageSettings.margins.bottom}
              leftMarginMm={pageSettings.margins.left}
              rightMarginMm={pageSettings.margins.right}
              pageBorder={pageSettings.pageBorder}
              onPageCountChange={onPageCountChange}
            />
            {showSlashCommands && (
              <div className="absolute left-1/2 top-1/3 -translate-x-1/2 z-50">
                <SlashCommands
                  query={slashQuery}
                  selectedIndex={slashCommandIndex}
                  onSelect={(idx) => executeSlashCommand(idx)}
                />
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar */}
        {isSidebarRightOpen && !isFocusMode && (
          <aside className="no-print w-[280px] flex-shrink-0 border-l border-border bg-card/50 overflow-hidden">
            <PropertiesPanel onClose={toggleSidebarRight} />
          </aside>
        )}
      </div>

      {/* Status Bar */}
      <div className={`no-print ${isFocusMode ? 'hidden' : ''}`}>
        <StatusBar />
      </div>
    </div>
  );
}
