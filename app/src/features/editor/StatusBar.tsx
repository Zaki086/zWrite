import { memo } from 'react';
import {
  ZoomIn, ZoomOut, Type, Clock, BookOpen, Check, CircleDot,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';
import { formatReadingTime } from '@/utils/wordStats';

const ZOOM_LEVELS = [50, 75, 100, 125, 150];

export const StatusBar = memo(function StatusBar() {
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const wordStats = useEditorStore((s) => s.wordStats);
  const isSaving = useDocumentStore((s) => s.isSaving);
  const lastSaved = useDocumentStore((s) => s.lastSaved);

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    const newIndex = Math.max(0, currentIndex - 1);
    setZoom(ZOOM_LEVELS[newIndex]);
  };

  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    const newIndex = Math.min(ZOOM_LEVELS.length - 1, currentIndex + 1);
    setZoom(ZOOM_LEVELS[newIndex]);
  };

  const savedText = lastSaved
    ? `Saved ${formatTimeAgo(lastSaved)}`
    : 'Unsaved';

  return (
    <div className="flex items-center justify-between px-4 h-8 bg-card/80 backdrop-blur-sm border-t border-border text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5" />
          <span>{wordStats.words.toLocaleString()} words</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{wordStats.pages} page{wordStats.pages !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatReadingTime(wordStats.readingTime)} read</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {isSaving ? (
          <div className="flex items-center gap-1 text-primary">
            <CircleDot className="w-3 h-3 animate-spin" />
            <span>Saving...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>{savedText}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="p-0.5 rounded hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
          aria-label="Zoom out"
          type="button"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <select
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="bg-transparent border-none text-xs text-muted-foreground focus:outline-none cursor-pointer"
          aria-label="Zoom level"
        >
          {ZOOM_LEVELS.map((z) => (
            <option key={z} value={z}>{z}%</option>
          ))}
        </select>
        <button
          onClick={handleZoomIn}
          className="p-0.5 rounded hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
          aria-label="Zoom in"
          type="button"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
