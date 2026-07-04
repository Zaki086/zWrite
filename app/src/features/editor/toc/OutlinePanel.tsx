import { useMemo, useCallback } from 'react';
import { type Editor } from '@tiptap/react';
import { ListTree, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface OutlineItem {
  level: number;
  text: string;
  pos: number;
}

interface OutlinePanelProps {
  editor: Editor | null;
}

export function OutlinePanel({ editor }: OutlinePanelProps) {
  const headings = useMemo<OutlineItem[]>(() => {
    if (!editor) return [];
    const items: OutlineItem[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        items.push({
          level: node.attrs.level,
          text: node.textContent,
          pos,
        });
      }
    });
    return items;
  }, [editor?.state.doc.content]);

  const scrollToHeading = useCallback((pos: number) => {
    if (!editor) return;
    editor.commands.focus();
    editor.commands.setTextSelection(pos + 1);
    const dom = editor.view.domAtPos(pos + 1);
    if (dom.node instanceof HTMLElement) {
      dom.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [editor]);

  if (!headings.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <ListTree className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No headings yet</p>
        <p className="text-xs mt-1">Add headings to see the outline</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Outline</h3>
      <div className="space-y-0.5">
        {headings.map((heading, index) => (
          <motion.button
            key={`${heading.pos}-${index}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02, duration: 0.1 }}
            onClick={() => scrollToHeading(heading.pos)}
            className={`
              w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left
              text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:bg-accent
              ${heading.level <= 2 ? 'font-medium text-foreground' : 'text-muted-foreground'}
            `}
            style={{ paddingLeft: `${8 + (heading.level - 1) * 12}px` }}
            type="button"
          >
            <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />
            <span className="truncate">{heading.text || `Heading ${heading.level}`}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
