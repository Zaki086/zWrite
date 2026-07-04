import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';

const A4_HEIGHT_MM = 297;
const MM_TO_PX = 3.779527559; // 96 DPI

/**
 * Measure the editor content height and calculate the real page count.
 * Uses a ResizeObserver for accurate measurements with debouncing
 * and change-thresholding to prevent infinite loops.
 */
export function usePagination(
  editor: Editor | null,
  topMarginMm: number,
  bottomMm: number
) {
  const [pageCount, setPageCount] = useState(1);
  const rafRef = useRef<number>(0);
  const lastHeightRef = useRef<number>(0);

  const measure = useCallback(() => {
    if (!editor?.view) return;
    const dom = editor.view.dom as HTMLElement;
    if (!dom) return;

    const height = dom.scrollHeight || dom.offsetHeight;
    // Only proceed if height changed by > 2px (avoid micro-flutter)
    if (Math.abs(height - lastHeightRef.current) < 2) return;
    lastHeightRef.current = height;

    const pageContentHeightPx = (A4_HEIGHT_MM - topMarginMm - bottomMm) * MM_TO_PX;
    if (pageContentHeightPx <= 0) return;

    const count = Math.max(1, Math.ceil(height / pageContentHeightPx));
    setPageCount(count);
  }, [editor, topMarginMm, bottomMm]);

  useEffect(() => {
    if (!editor?.view) return;

    // Initial measurement after content stabilizes
    const initTimer = setTimeout(measure, 150);

    // Set up ResizeObserver with debounced measurement
    let ro: ResizeObserver | null = null;
    const dom = editor.view.dom as HTMLElement;
    if (dom && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        // Cancel pending RAF to debounce
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(measure);
      });
      ro.observe(dom);
    }

    return () => {
      clearTimeout(initTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (ro) ro.disconnect();
    };
  }, [editor, measure]);

  return { pageCount };
}
