import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { type Editor } from '@tiptap/react';
import { Search, X, Replace, ReplaceAll, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MatchPos {
  from: number;
  to: number;
}

interface SearchReplaceProps {
  editor: Editor | null;
  onClose: () => void;
}

export const SearchReplace = memo(function SearchReplace({ editor, onClose }: SearchReplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplacePanel, setShowReplacePanel] = useState(false);
  const [matches, setMatches] = useState<MatchPos[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Walk the ProseMirror document to find real text-node positions    */
  /* ------------------------------------------------------------------ */
  const findAllMatches = useCallback((query: string): MatchPos[] => {
    if (!editor || !query) return [];
    const state = editor.state;
    const result: MatchPos[] = [];
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');

    state.doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text || '';
        let match;
        // eslint-disable-next-line no-cond-assign
        while ((match = regex.exec(text)) !== null) {
          result.push({
            from: pos + match.index,
            to: pos + match.index + match[0].length,
          });
        }
      }
    });

    return result;
  }, [editor]);

  // Re-scan when query changes
  useEffect(() => {
    const newMatches = findAllMatches(searchQuery);
    setMatches(newMatches);
    setCurrentIndex(newMatches.length > 0 ? 1 : 0);
  }, [searchQuery, findAllMatches]);

  /* ---- Select and scroll to a specific match ---- */
  const selectMatch = useCallback((index: number) => {
    if (!editor || matches.length === 0) return;
    const idx = ((index - 1) % matches.length + matches.length) % matches.length;
    const m = matches[idx];
    editor.chain().focus().setTextSelection({ from: m.from, to: m.to }).scrollIntoView().run();
  }, [editor, matches]);

  const findNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = currentIndex >= matches.length ? 1 : currentIndex + 1;
    setCurrentIndex(next);
    selectMatch(next);
  }, [matches, currentIndex, selectMatch]);

  const findPrevious = useCallback(() => {
    if (matches.length === 0) return;
    const prev = currentIndex <= 1 ? matches.length : currentIndex - 1;
    setCurrentIndex(prev);
    selectMatch(prev);
  }, [matches, currentIndex, selectMatch]);

  /* ---- Replace: replace the currently selected match ---- */
  const handleReplace = useCallback(() => {
    if (!editor || matches.length === 0 || !searchQuery) return;
    const idx = currentIndex > 0 ? currentIndex - 1 : 0;
    const m = matches[idx];
    editor.chain().focus().setTextSelection({ from: m.from, to: m.to }).insertContent(replaceQuery).run();
    // Re-scan after replacement
    const newMatches = findAllMatches(searchQuery);
    setMatches(newMatches);
    setCurrentIndex(newMatches.length > 0 ? Math.min(currentIndex, newMatches.length) : 0);
  }, [editor, matches, currentIndex, searchQuery, replaceQuery, findAllMatches]);

  /* ---- Replace All: replace every match in reverse order ---- */
  const handleReplaceAll = useCallback(() => {
    if (!editor || matches.length === 0 || !searchQuery) return;
    let tr = editor.state.tr;
    // Work backwards so positions remain valid
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      tr = tr.replaceWith(m.from, m.to, editor.schema.text(replaceQuery));
    }
    editor.view.dispatch(tr);
    editor.commands.focus();
    setMatches([]);
    setCurrentIndex(0);
  }, [editor, matches, searchQuery, replaceQuery]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="flex flex-col gap-2 p-3 bg-card border-b border-border shadow-sm animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find..."
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={findPrevious} disabled={!matches.length}>
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={findNext} disabled={!matches.length}>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
        {matches.length > 0 && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {currentIndex} of {matches.length}
          </span>
        )}
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowReplacePanel(!showReplacePanel)}>
          {showReplacePanel ? 'Hide' : 'Replace'}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {showReplacePanel && (
        <div className="flex items-center gap-2 overflow-hidden animate-fade-in">
          <Input
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder="Replace with..."
            className="flex-1 h-8 text-sm"
          />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleReplace} disabled={!matches.length}>
            <Replace className="w-3 h-3 mr-1" />
            Replace
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleReplaceAll} disabled={!matches.length}>
            <ReplaceAll className="w-3 h-3 mr-1" />
            All
          </Button>
        </div>
      )}
    </div>
  );
});
