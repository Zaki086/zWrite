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

import { memo } from 'react';

interface Props {
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  pageGap: number;
  pageBorder?: { enabled: boolean; width: number; style: string; color: string } | null;
}

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
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {Array.from({ length: pageCount }, (_, i) => (
        <div
          key={i}
          className="page-bg-sheet"
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
        />
      ))}
    </div>
  );
});
