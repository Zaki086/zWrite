import { memo, useCallback } from 'react';
import {
  FileText, Type, Clock, BookOpen, Hash, AlignLeft,
  Ruler, Palette, Layout, PanelRightClose, Square,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { formatNumber, formatReadingTime } from '@/utils/wordStats';

interface PropertiesPanelProps {
  onClose: () => void;
}

export const PropertiesPanel = memo(function PropertiesPanel({ onClose }: PropertiesPanelProps) {
  const wordStats = useEditorStore((s) => s.wordStats);
  const pageSettings = useDocumentStore((s) => s.pageSettings);
  const setPageSettings = useDocumentStore((s) => s.setPageSettings);

  const handleMarginChange = useCallback((side: string, value: number) => {
    setPageSettings({
      margins: { ...pageSettings.margins, [side]: value },
    });
  }, [pageSettings, setPageSettings]);

  const handleBorderChange = useCallback((key: string, value: unknown) => {
    setPageSettings({
      pageBorder: { ...pageSettings.pageBorder, [key]: value },
    });
  }, [pageSettings, setPageSettings]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <PanelRightClose className="w-4 h-4" />
          Properties
        </h2>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground transition-colors"
          aria-label="Close"
          type="button"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto zw-scrollbar p-4 space-y-6">
        {/* Document Stats */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Document Stats
          </h3>
          <div className="space-y-2.5">
            <StatRow icon={<Type className="w-3.5 h-3.5" />} label="Words" value={formatNumber(wordStats.words)} />
            <StatRow icon={<Hash className="w-3.5 h-3.5" />} label="Characters" value={formatNumber(wordStats.characters)} />
            <StatRow icon={<Hash className="w-3.5 h-3.5" />} label="No Spaces" value={formatNumber(wordStats.charactersNoSpaces)} />
            <StatRow icon={<AlignLeft className="w-3.5 h-3.5" />} label="Paragraphs" value={formatNumber(wordStats.paragraphs)} />
            <StatRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Sentences" value={formatNumber(wordStats.sentences)} />
            <StatRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Pages" value={formatNumber(wordStats.pages)} />
            <StatRow icon={<Clock className="w-3.5 h-3.5" />} label="Reading Time" value={formatReadingTime(wordStats.readingTime)} />
          </div>
        </section>

        <Separator />

        {/* Page Setup */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layout className="w-3.5 h-3.5" />
            Page Setup
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Orientation</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPageSettings({ orientation: 'portrait' })}
                  className={`
                    flex-1 py-1.5 px-2 rounded-md text-xs border transition-colors
                    ${pageSettings.orientation === 'portrait'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent'
                    }
                  `}
                  type="button"
                >
                  Portrait
                </button>
                <button
                  onClick={() => setPageSettings({ orientation: 'landscape' })}
                  className={`
                    flex-1 py-1.5 px-2 rounded-md text-xs border transition-colors
                    ${pageSettings.orientation === 'landscape'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent'
                    }
                  `}
                  type="button"
                >
                  Landscape
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                <Ruler className="w-3 h-3" />
                Margins (mm)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                  <div key={side} className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground capitalize w-10">{side}</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={pageSettings.margins[side]}
                      onChange={(e) => handleMarginChange(side, Number(e.target.value))}
                      className="w-full h-7 px-2 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Page Border */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Square className="w-3.5 h-3.5" />
            Page Border
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Show border</label>
              <Switch
                checked={pageSettings.pageBorder.enabled}
                onCheckedChange={(checked) => handleBorderChange('enabled', checked)}
              />
            </div>

            {pageSettings.pageBorder.enabled && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground w-12">Width</label>
                  <input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={pageSettings.pageBorder.width}
                    onChange={(e) => handleBorderChange('width', Number(e.target.value))}
                    className="w-full h-7 px-2 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <span className="text-xs text-muted-foreground">pt</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground w-12">Style</label>
                  <select
                    value={pageSettings.pageBorder.style}
                    onChange={(e) => handleBorderChange('style', e.target.value)}
                    className="w-full h-7 px-2 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground w-12">Color</label>
                  <input
                    type="color"
                    value={pageSettings.pageBorder.color}
                    onChange={(e) => handleBorderChange('color', e.target.value)}
                    className="w-8 h-7 border border-border rounded cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{pageSettings.pageBorder.color}</span>
                </div>
              </>
            )}
          </div>
        </section>

        <Separator />

        {/* Appearance */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Palette className="w-3.5 h-3.5" />
            Appearance
          </h3>
          <ThemeSelector />
        </section>
      </div>
    </div>
  );
});

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function ThemeSelector() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const applyTheme = (t: 'dark' | 'light' | 'system') => {
    setTheme(t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    else if (t === 'light') document.documentElement.classList.remove('dark');
    else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  return (
    <div className="flex gap-2">
      {(['dark', 'light', 'system'] as const).map((t) => (
        <button
          key={t}
          onClick={() => applyTheme(t)}
          className={`
            flex-1 py-1.5 px-2 rounded-md text-xs capitalize border transition-colors
            ${theme === t
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border hover:bg-accent'
            }
          `}
          type="button"
        >
          {t}
        </button>
      ))}
    </div>
  );
}
