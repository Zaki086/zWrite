import { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  FileText, Menu, Settings, Moon, Sun, Monitor, Printer,
  Download, Focus, ChevronLeft,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { motion } from 'framer-motion';

interface NavbarProps {
  onToggleSidebarLeft: () => void;
  onToggleSidebarRight: () => void;
  onPrint: () => void;
  onExport: () => void;
  onToggleFocus: () => void;
  onBack?: () => void;
}

export const Navbar = memo(function Navbar({
  onToggleSidebarLeft, onToggleSidebarRight, onPrint, onExport, onToggleFocus, onBack,
}: NavbarProps) {
  const title = useDocumentStore((s) => s.documentTitle);
  const setDocumentTitle = useDocumentStore((s) => s.setDocumentTitle);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const isFocusMode = useEditorStore((s) => s.isFocusMode);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  const handleTitleSubmit = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      setDocumentTitle(trimmed);
    } else {
      setEditTitle(title);
    }
    setIsEditingTitle(false);
  }, [editTitle, setDocumentTitle, title]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSubmit();
    if (e.key === 'Escape') {
      setEditTitle(title);
      setIsEditingTitle(false);
    }
  }, [handleTitleSubmit, title]);

  const cycleTheme = useCallback(() => {
    const order: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else if (next === 'light') document.documentElement.classList.remove('dark');
    else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme, setTheme]);

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="flex items-center justify-between h-12 px-3 bg-card/90 backdrop-blur-sm border-b border-border z-40">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Back"
            type="button"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onToggleSidebarLeft}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Toggle outline"
          type="button"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0 ml-2">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              className="bg-transparent border-b border-primary text-sm font-medium focus:outline-none min-w-0 max-w-[300px]"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setIsEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 10); }}
              className="text-sm font-medium truncate max-w-[300px] hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline focus-visible:underline-offset-2"
              type="button"
            >
              {title}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleFocus}
          className={`
            flex items-center justify-center w-8 h-8 rounded-md transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
            ${isFocusMode ? 'bg-primary/15 text-primary' : 'hover:bg-accent text-muted-foreground'}
          `}
          aria-label="Focus mode"
          type="button"
        >
          <Focus className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={cycleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`Theme: ${theme}`}
          type="button"
        >
          <ThemeIcon className="w-4 h-4" />
        </motion.button>

        <div className="w-px h-5 bg-border mx-1" />

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onPrint}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Print"
          type="button"
        >
          <Printer className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onExport}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Export DOCX"
          type="button"
        >
          <Download className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleSidebarRight}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Toggle properties"
          type="button"
        >
          <Settings className="w-4 h-4" />
        </motion.button>
      </div>
    </header>
  );
});
