import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, Code, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Heading1, Heading2, Heading3,
  Heading4, Heading5, Heading6, Type, Highlighter, Palette, Table,
  Image as ImageIcon, Link, Undo, Redo, Printer, Download, Search,
  Minus, Quote, ChevronDown, Merge, Split,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface ToolbarProps {
  editor: Editor | null;
  onSearch?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
}

/* ===== preventDefault wrapper: stops the browser from stealing
     focus/selection from the editor when toolbar buttons are clicked ===== */
function pd(onClick: () => void) {
  return {
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
    onClick,
  };
}

/* ===== Constants ===== */
const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4F46E5', '#9900FF',
  '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3',
];

const HIGHLIGHT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
];

/* ===== ToolbarButton with selection-preserving mousedown ===== */
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip: string;
  shortcut?: string;
}

const ToolbarButton = memo(function ToolbarButton({
  onClick, isActive, disabled, icon, tooltip, shortcut,
}: ToolbarButtonProps) {
  const handlers = pd(onClick);
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            {...handlers}
            disabled={disabled}
            className={`
              relative flex items-center justify-center w-8 h-8 rounded-md
              transition-all duration-150 ease-out
              ${isActive
                ? 'bg-primary/15 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
            `}
            aria-label={tooltip}
            type="button"
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-2">
          <span>{tooltip}</span>
          {shortcut && <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{shortcut}</kbd>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

/* ===== Portal-based dropdown system ===== */
function usePortalDropdown() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = triggerRef.current;
      const p = panelRef.current;
      if (t && p && !t.contains(e.target as Node) && !p.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return { open, setOpen, triggerRef, panelRef };
}

function DropdownPortal({
  children, open, triggerRef, panelRef,
}: {
  children: React.ReactNode;
  open: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [open, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-xl py-1.5 min-w-[180px]"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body
  );
}

/* ===== Heading Dropdown ===== */
function HeadingDropdown({ editor }: { editor: Editor | null }) {
  const dd = usePortalDropdown();
  const headings = [
    { level: 1, icon: <Heading1 className="w-4 h-4" />, label: 'Heading 1' },
    { level: 2, icon: <Heading2 className="w-4 h-4" />, label: 'Heading 2' },
    { level: 3, icon: <Heading3 className="w-4 h-4" />, label: 'Heading 3' },
    { level: 4, icon: <Heading4 className="w-4 h-4" />, label: 'Heading 4' },
    { level: 5, icon: <Heading5 className="w-4 h-4" />, label: 'Heading 5' },
    { level: 6, icon: <Heading6 className="w-4 h-4" />, label: 'Heading 6' },
  ];

  const currentLevel = headings.find((h) => editor?.isActive('heading', { level: h.level }));

  return (
    <>
      <button
        ref={dd.triggerRef}
        {...pd(() => dd.setOpen(!dd.open))}
        className={`
          flex items-center gap-0.5 w-auto h-8 px-1.5 rounded-md
          transition-all duration-150 text-sm font-medium
          ${currentLevel
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        `}
        aria-label="Heading"
        type="button"
      >
        <Type className="w-4 h-4" />
        <ChevronDown className="w-3 h-3" />
      </button>

      <DropdownPortal open={dd.open} triggerRef={dd.triggerRef} panelRef={dd.panelRef}>
        {headings.map(({ level, icon, label }) => (
          <button
            key={level}
            {...pd(() => {
              editor?.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
              dd.setOpen(false);
            })}
            className={`
              w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors
              ${editor?.isActive('heading', { level })
                ? 'bg-primary/10 text-primary'
                : 'text-foreground hover:bg-accent'
              }
            `}
            type="button"
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </DropdownPortal>
    </>
  );
}

/* ===== Color Picker with native input ===== */
function ColorPicker({
  colors, onSelect, icon, tooltip, activeColor, label,
}: {
  colors: string[];
  onSelect: (color: string) => void;
  icon: React.ReactNode;
  tooltip: string;
  activeColor?: string;
  label: string;
}) {
  const dd = usePortalDropdown();
  const nativeInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        ref={dd.triggerRef}
        {...pd(() => dd.setOpen(!dd.open))}
        className={`
          relative flex items-center justify-center w-8 h-8 rounded-md
          transition-all duration-150
          ${activeColor
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        `}
        aria-label={tooltip}
        type="button"
      >
        {icon}
        {activeColor && (
          <span
            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-0.5 rounded-full"
            style={{ backgroundColor: activeColor }}
          />
        )}
      </button>

      <DropdownPortal open={dd.open} triggerRef={dd.triggerRef} panelRef={dd.panelRef}>
        <div className="px-3 pb-2 pt-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">{label}</div>
          {/* Native color input */}
          <div className="flex items-center gap-2 mb-2">
            <input
              ref={nativeInputRef}
              type="color"
              defaultValue={activeColor || '#000000'}
              className="w-7 h-7 border border-border rounded cursor-pointer p-0"
              onChange={(e) => {
                onSelect(e.target.value);
                dd.setOpen(false);
              }}
              onMouseDown={(e) => e.stopPropagation()}
            />
            <span className="text-xs text-muted-foreground">Custom</span>
          </div>
          {/* Swatch grid */}
          <div className="grid grid-cols-8 gap-1">
            {colors.map((color) => (
              <button
                key={color}
                {...pd(() => { onSelect(color); dd.setOpen(false); })}
                className="w-5 h-5 rounded-sm border border-border/50 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
                type="button"
              />
            ))}
          </div>
        </div>
      </DropdownPortal>
    </>
  );
}

/* ===== Font Size Dropdown ===== */
function FontSizeDropdown({ editor }: { editor: Editor | null }) {
  const dd = usePortalDropdown();
  const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];
  const currentSize = editor?.getAttributes('textStyle').fontSize;

  const applySize = (pt: number) => {
    editor?.chain().focus().setFontSize(`${pt}pt`).run();
    dd.setOpen(false);
  };

  return (
    <>
      <button
        ref={dd.triggerRef}
        {...pd(() => dd.setOpen(!dd.open))}
        className={`
          flex items-center gap-0.5 h-8 px-1.5 rounded-md
          transition-all duration-150 text-xs font-medium
          ${currentSize
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        `}
        aria-label="Font Size"
        type="button"
      >
        {currentSize ? currentSize.replace('pt', '') : '11'}
        <ChevronDown className="w-3 h-3" />
      </button>

      <DropdownPortal open={dd.open} triggerRef={dd.triggerRef} panelRef={dd.panelRef}>
        {FONT_SIZES.map((pt) => (
          <button
            key={pt}
            {...pd(() => applySize(pt))}
            className={`
              w-full flex items-center px-3 py-1 text-sm transition-colors
              ${currentSize === `${pt}pt`
                ? 'bg-primary/10 text-primary'
                : 'text-foreground hover:bg-accent'
              }
            `}
            type="button"
          >
            <span className="w-8 text-right mr-2">{pt}</span>
            <span className="text-muted-foreground text-xs">pt</span>
          </button>
        ))}
      </DropdownPortal>
    </>
  );
}

/* ===== Table Insert Grid ===== */
function TableInsertGrid({ editor }: { editor: Editor | null }) {
  const dd = usePortalDropdown();
  const [hovered, setHovered] = useState({ rows: 0, cols: 0 });
  const GRID_SIZE = 8;

  const insertTable = (rows: number, cols: number) => {
    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    dd.setOpen(false);
    setHovered({ rows: 0, cols: 0 });
  };

  return (
    <>
      <button
        ref={dd.triggerRef}
        {...pd(() => dd.setOpen(!dd.open))}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Insert Table"
        type="button"
      >
        <Table className="w-4 h-4" />
      </button>

      <DropdownPortal open={dd.open} triggerRef={dd.triggerRef} panelRef={dd.panelRef}>
        <div className="px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {hovered.rows > 0 ? `${hovered.cols} x ${hovered.rows} table` : 'Insert table'}
          </div>
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
              const row = Math.floor(i / GRID_SIZE) + 1;
              const col = (i % GRID_SIZE) + 1;
              const isHighlighted = row <= hovered.rows && col <= hovered.cols;
              return (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-sm border transition-colors cursor-pointer ${
                    isHighlighted ? 'bg-primary border-primary' : 'bg-muted border-border hover:bg-accent'
                  }`}
                  onMouseEnter={() => setHovered({ rows: row, cols: col })}
                  onClick={() => insertTable(row, col)}
                />
              );
            })}
          </div>
          <button
            {...pd(() => {
              const rows = parseInt(window.prompt('Number of rows:', '3') || '3');
              const cols = parseInt(window.prompt('Number of columns:', '3') || '3');
              if (rows > 0 && cols > 0) insertTable(rows, cols);
            })}
            className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground text-left py-1"
            type="button"
          >
            Custom size...
          </button>
        </div>
      </DropdownPortal>
    </>
  );
}

/* ===== Image Insert (file picker) ===== */
function ImageInsertButton({ editor }: { editor: Editor | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) editor?.chain().focus().setImage({ src: result }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be selected again
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        icon={<ImageIcon className="w-4 h-4" />}
        tooltip="Insert Image"
      />
    </>
  );
}

/* ===== Table merge/split buttons ===== */
function TableMergeButton({ editor }: { editor: Editor | null }) {
  const canMerge = editor?.can().mergeCells() ?? false;
  const canSplit = editor?.can().splitCell() ?? false;

  return (
    <>
      <ToolbarButton
        onClick={() => editor?.chain().focus().mergeCells().run()}
        disabled={!canMerge}
        icon={<Merge className="w-4 h-4" />}
        tooltip="Merge Cells"
      />
      <ToolbarButton
        onClick={() => editor?.chain().focus().splitCell().run()}
        disabled={!canSplit}
        icon={<Split className="w-4 h-4" />}
        tooltip="Split Cell"
      />
    </>
  );
}

/* ===== Main Toolbar ===== */
export const Toolbar = memo(function Toolbar({ editor, onSearch, onPrint, onExport }: ToolbarProps) {
  const insertLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const insertHorizontalRule = useCallback(() => {
    editor?.chain().focus().setHorizontalRule().run();
  }, [editor]);

  const insertBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  if (!editor) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 px-3 py-1.5 bg-card/80 backdrop-blur-sm border-b border-border overflow-x-auto zw-scrollbar">
        {/* History */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={<Undo className="w-4 h-4" />} tooltip="Undo" shortcut="Ctrl+Z" />
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={<Redo className="w-4 h-4" />} tooltip="Redo" shortcut="Ctrl+Y" />
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Formatting */}
        <div className="flex items-center gap-0.5">
          <HeadingDropdown editor={editor} />
          <FontSizeDropdown editor={editor} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={<Bold className="w-4 h-4" />} tooltip="Bold" shortcut="Ctrl+B" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={<Italic className="w-4 h-4" />} tooltip="Italic" shortcut="Ctrl+I" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={<Underline className="w-4 h-4" />} tooltip="Underline" shortcut="Ctrl+U" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={<Strikethrough className="w-4 h-4" />} tooltip="Strikethrough" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} icon={<Code className="w-4 h-4" />} tooltip="Inline Code" />
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Colors */}
        <div className="flex items-center gap-0.5">
          <ColorPicker
            colors={COLORS}
            onSelect={(color) => editor.chain().focus().setColor(color).run()}
            icon={<Palette className="w-4 h-4" />}
            tooltip="Text Color"
            label="Text Color"
            activeColor={editor.getAttributes('textStyle').color}
          />
          <ColorPicker
            colors={HIGHLIGHT_COLORS}
            onSelect={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
            icon={<Highlighter className="w-4 h-4" />}
            tooltip="Highlight"
            label="Highlight Color"
            activeColor={editor.getAttributes('highlight').color}
          />
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={<AlignLeft className="w-4 h-4" />} tooltip="Align Left" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={<AlignCenter className="w-4 h-4" />} tooltip="Align Center" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={<AlignRight className="w-4 h-4" />} tooltip="Align Right" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} icon={<AlignJustify className="w-4 h-4" />} tooltip="Justify" />
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={<List className="w-4 h-4" />} tooltip="Bullet List" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={<ListOrdered className="w-4 h-4" />} tooltip="Numbered List" />
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Insert */}
        <div className="flex items-center gap-0.5">
          <TableInsertGrid editor={editor} />
          <ImageInsertButton editor={editor} />
          <ToolbarButton onClick={insertLink} isActive={editor.isActive('link')} icon={<Link className="w-4 h-4" />} tooltip="Insert Link" shortcut="Ctrl+K" />
          <ToolbarButton onClick={insertHorizontalRule} icon={<Minus className="w-4 h-4" />} tooltip="Divider" />
          <ToolbarButton onClick={insertBlockquote} isActive={editor.isActive('blockquote')} icon={<Quote className="w-4 h-4" />} tooltip="Quote" />
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Table ops */}
        {editor.isActive('table') && (
          <>
            <TableMergeButton editor={editor} />
            <Separator orientation="vertical" className="h-5 mx-1" />
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={onSearch || (() => {})} icon={<Search className="w-4 h-4" />} tooltip="Search & Replace" shortcut="Ctrl+F" />
          <ToolbarButton onClick={onPrint || (() => {})} icon={<Printer className="w-4 h-4" />} tooltip="Print" shortcut="Ctrl+P" />
          <ToolbarButton onClick={onExport || (() => {})} icon={<Download className="w-4 h-4" />} tooltip="Export DOCX" shortcut="Ctrl+S" />
        </div>
      </div>
    </TooltipProvider>
  );
});
