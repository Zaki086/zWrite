import { memo } from 'react';
import { type Editor } from '@tiptap/react';
import {
  Heading1, Heading2, Heading3, Table,
  Image, Minus, FileUser, Receipt, FileBarChart, List, ListOrdered,
  Quote, Code, Scissors, PanelTop, PanelBottom,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getResumeHTML, getInvoiceHTML, getReportHTML } from '@/utils/templates';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: Editor) => void;
}

export function getSlashCommands(): SlashCommand[] {
  return [
    {
      id: 'heading1',
      label: 'Heading 1',
      description: 'Large section heading',
      icon: <Heading1 className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'heading2',
      label: 'Heading 2',
      description: 'Medium section heading',
      icon: <Heading2 className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'heading3',
      label: 'Heading 3',
      description: 'Small section heading',
      icon: <Heading3 className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'bullet-list',
      label: 'Bullet List',
      description: 'Create a bulleted list',
      icon: <List className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'numbered-list',
      label: 'Numbered List',
      description: 'Create a numbered list',
      icon: <ListOrdered className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'table',
      label: 'Table',
      description: 'Insert a 3x3 table',
      icon: <Table className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      id: 'image',
      label: 'Image',
      description: 'Insert an image from URL',
      icon: <Image className="w-4 h-4" />,
      action: (editor) => {
        const url = window.prompt('Enter image URL:');
        if (url) editor.chain().focus().setImage({ src: url }).run();
      },
    },
    {
      id: 'divider',
      label: 'Divider',
      description: 'Insert a horizontal line',
      icon: <Minus className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      id: 'quote',
      label: 'Quote',
      description: 'Insert a blockquote',
      icon: <Quote className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'page-break',
      label: 'Page Break',
      description: 'Force a new page',
      icon: <Scissors className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().insertContent({ type: 'pageBreak' }).run(),
    },
    {
      id: 'document-header',
      label: 'Document Header',
      description: 'Insert a page header',
      icon: <PanelTop className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().insertContent({ type: 'documentHeader' }).run(),
    },
    {
      id: 'document-footer',
      label: 'Document Footer',
      description: 'Insert a page footer',
      icon: <PanelBottom className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().insertContent({ type: 'documentFooter' }).run(),
    },
    {
      id: 'code-block',
      label: 'Code Block',
      description: 'Insert a code block',
      icon: <Code className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'resume',
      label: 'Resume Template',
      description: 'Insert a professional resume',
      icon: <FileUser className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().setContent(getResumeHTML()).run(),
    },
    {
      id: 'invoice',
      label: 'Invoice Template',
      description: 'Insert a business invoice',
      icon: <Receipt className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().setContent(getInvoiceHTML()).run(),
    },
    {
      id: 'report',
      label: 'Report Template',
      description: 'Insert a business report',
      icon: <FileBarChart className="w-4 h-4" />,
      action: (editor) => editor.chain().focus().setContent(getReportHTML()).run(),
    },
  ];
}

interface SlashCommandsProps {
  query: string;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export const SlashCommands = memo(function SlashCommands({
  query,
  selectedIndex,
  onSelect,
}: SlashCommandsProps) {
  const commands = getSlashCommands();
  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  if (!filtered.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.12 }}
        className="absolute z-50 w-72 bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
      >
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
          Commands
        </div>
        <div className="max-h-80 overflow-y-auto zw-scrollbar py-1">
          {filtered.map((cmd, index) => (
            <button
              key={cmd.id}
              onClick={() => onSelect(index)}
              onMouseEnter={() => {
                // Visual-only hover; parent controls selectedIndex via keyboard
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                ${index === selectedIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'}
                focus-visible:outline-none focus-visible:bg-primary/10
              `}
              type="button"
            >
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-muted">
                {cmd.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{cmd.label}</div>
                <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="px-3 py-1.5 text-xs text-muted-foreground border-t border-border flex items-center gap-2">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
          <span>navigate</span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
          <span>select</span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
          <span>close</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
