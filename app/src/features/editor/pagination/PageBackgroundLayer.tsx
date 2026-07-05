/**
 * Page Background Layer
 *
 * Renders white page-sized rectangles with drop shadows as a purely
 * decorative background behind the single continuous editor content.
 *
 * Each rectangle is positioned at fixed vertical intervals:
 *   y = 0, pageHeight + gap, 2*(pageHeight + gap), ...
 *
 * This creates the visual illusion of separate A4 sheets while the
 * actual content flows continuously in a single ProseMirror instance.
 */

import { memo, useState, useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';

interface Props {
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  pageGap: number;
  pageBorder?: { enabled: boolean; width: number; style: string; color: string } | null;
}

const HeaderFooterInput = ({ type }: { type: 'header' | 'footer' }) => {
  const pageSettings = useDocumentStore((s) => s.pageSettings);
  const setPageSettings = useDocumentStore((s) => s.setPageSettings);
  const [localText, setLocalText] = useState('');

  const isEnabled = type === 'header' ? pageSettings.headerEnabled : pageSettings.footerEnabled;
  const storeText = type === 'header' ? pageSettings.headerText : pageSettings.footerText;

  useEffect(() => {
    setLocalText(storeText || '');
  }, [storeText]);

  if (!isEnabled) return null;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalText(e.target.value);
    if (type === 'header') {
      setPageSettings({ headerText: e.target.value });
    } else {
      setPageSettings({ footerText: e.target.value });
    }
  };

  return (
    <textarea
      value={localText}
      onChange={handleChange}
      placeholder={`Type ${type}...`}
      className={`absolute left-[1in] right-[1in] ${type === 'header' ? 'top-4' : 'bottom-4'} h-16 resize-none bg-transparent outline-none text-sm text-muted-foreground placeholder:text-muted-foreground/30 z-10 text-center flex flex-col justify-center print:text-black`}
      style={{ overflow: 'hidden' }}
    />
  );
};

export const PageBackgroundLayer = memo(function PageBackgroundLayer({
  pageCount,
  pageWidth,
  pageHeight,
  pageGap,
  pageBorder,
}: Props) {
  const borderStyle = pageBorder?.enabled
    ? `${pageBorder.width}pt ${pageBorder.style} ${pageBorder.color}`
    : undefined;

  return (
    <div
      className="page-background-layer"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${pageWidth}px`,
        height: `${pageCount * pageHeight + (pageCount - 1) * pageGap}px`,
        zIndex: 0,
      }}
    >
      {Array.from({ length: pageCount }, (_, i) => (
        <div
          key={i}
          className="page-bg-sheet relative"
          style={{
            position: 'absolute',
            top: `${i * (pageHeight + pageGap)}px`,
            left: 0,
            width: `${pageWidth}px`,
            height: `${pageHeight}px`,
            background: '#ffffff',
            boxShadow: '0 2px 12px rgb(0 0 0 / 0.10), 0 0 1px rgb(0 0 0 / 0.15)',
            borderRadius: '2px',
            border: borderStyle,
            boxSizing: 'border-box',
          }}
        >
          <HeaderFooterInput type="header" />
          <HeaderFooterInput type="footer" />
        </div>
      ))}
    </div>
  );
});
